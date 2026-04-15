const jwt = require("jsonwebtoken");

const TENANT_ID_REGEX = /^[a-z0-9_-]{1,64}$/;

const normalizeTenantId = (value, fallback = "") => {
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
  return header.slice("Bearer ".length).trim();
};

const verifyTokenPayload = ({ headers = {}, config = {} }) => {
  const token = readBearerToken(headers);
  if (!token) {
    return null;
  }
  if (!config.jwtSecret) {
    const err = new Error("Catalog JWT secret is not configured");
    err.statusCode = 503;
    err.code = "CATALOG_JWT_NOT_CONFIGURED";
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

const resolveCatalogTenantContext = ({ req, config = {} }) => {
  const candidateTenant = normalizeTenantId(req.headers["x-tenant-id"], "");
  const internalKey = String(req.headers["x-internal-api-key"] || "").trim();

  if (internalKey) {
    if (!config.internalApiKey || internalKey !== config.internalApiKey) {
      const err = new Error("Invalid internal token");
      err.statusCode = 401;
      err.code = "INTERNAL_AUTH_INVALID";
      throw err;
    }
    if (!candidateTenant) {
      const err = new Error("Tenant header is required");
      err.statusCode = 400;
      err.code = "TENANT_REQUIRED";
      throw err;
    }
    return {
      tenantId: candidateTenant,
      trustSource: "internal",
    };
  }

  const tokenPayload = verifyTokenPayload({ headers: req.headers, config });
  if (tokenPayload) {
    const tokenTenant = normalizeTenantId(tokenPayload.tenantId, "");
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
    return {
      tenantId: tokenTenant,
      trustSource: "jwt",
    };
  }

  const publicTenant = normalizeTenantId(config.publicTenantId, "public");
  if (candidateTenant && candidateTenant !== publicTenant) {
    const err = new Error("Anonymous tenant access is restricted to public");
    err.statusCode = 403;
    err.code = "TENANT_FORBIDDEN";
    throw err;
  }

  return {
    tenantId: publicTenant,
    trustSource: "public",
  };
};

module.exports = {
  normalizeTenantId,
  resolveCatalogTenantContext,
};
