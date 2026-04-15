const jwt = require("jsonwebtoken");

const TENANT_ID_REGEX = /^[a-z0-9_-]{1,64}$/;

const normalizeTenantId = (value, fallback = "public") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (!TENANT_ID_REGEX.test(normalized)) {
    return fallback;
  }
  return normalized;
};

const readBearerToken = (headers = {}) => {
  const header = String(headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    return "";
  }
  const token = header.slice("Bearer ".length).trim();
  return token || "";
};

const verifyTokenPayload = (req, config = {}) => {
  const token = readBearerToken(req.headers);
  if (!token) {
    return null;
  }
  if (!config.jwtSecret) {
    const err = new Error("Gateway JWT secret is not configured");
    err.statusCode = 503;
    err.code = "GATEWAY_JWT_NOT_CONFIGURED";
    throw err;
  }
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    const err = new Error("Invalid token");
    err.statusCode = 401;
    err.code = "AUTH_INVALID_TOKEN";
    throw err;
  }
};

const resolveGatewayTenantId = (req, config = {}, options = {}) => {
  const candidateTenant = normalizeTenantId(req.headers["x-tenant-id"], "");
  const tokenPayload = verifyTokenPayload(req, config);
  const tokenTenant = tokenPayload
    ? normalizeTenantId(tokenPayload.tenantId, "")
    : "";

  if (tokenPayload) {
    if (!tokenTenant) {
      const err = new Error("Missing tenant claim in token");
      err.statusCode = 401;
      err.code = "AUTH_TENANT_CLAIM_REQUIRED";
      throw err;
    }
    if (candidateTenant && candidateTenant !== tokenTenant) {
      const err = new Error("Tenant mismatch");
      err.statusCode = 403;
      err.code = "AUTH_TENANT_MISMATCH";
      throw err;
    }
    return tokenTenant;
  }

  const isReindexPath = String(options.upstreamPath || "").startsWith("/reindex");
  if (isReindexPath) {
    const strictTenant = normalizeTenantId(req.headers["x-tenant-id"], "");
    if (!strictTenant) {
      const err = new Error("Tenant header is required");
      err.statusCode = 400;
      err.code = "TENANT_REQUIRED";
      throw err;
    }
    return strictTenant;
  }

  const publicTenant = normalizeTenantId(config.publicTenantId, "public");
  if (candidateTenant && candidateTenant !== publicTenant) {
    const err = new Error("Anonymous tenant access is restricted to public");
    err.statusCode = 403;
    err.code = "TENANT_FORBIDDEN";
    throw err;
  }
  return publicTenant;
};

module.exports = {
  normalizeTenantId,
  readBearerToken,
  verifyTokenPayload,
  resolveGatewayTenantId,
};
