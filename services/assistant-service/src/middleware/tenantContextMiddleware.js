const jwt = require("jsonwebtoken");
const { normalizeTenantId } = require("../services/tenantContextService");

const readBearerToken = (req) => {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    return "";
  }
  return header.slice("Bearer ".length).trim();
};

const verifyActor = (req, config) => {
  const token = readBearerToken(req);
  if (!token) {
    return null;
  }
  if (!config.jwtSecret) {
    const err = new Error("Assistant JWT secret is not configured");
    err.statusCode = 503;
    err.code = "ASSISTANT_JWT_NOT_CONFIGURED";
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

const tenantContextMiddleware = (config) => (req, _res, next) => {
  const rawTenant = String(req.headers["x-tenant-id"] || "").trim();
  const tenantId = normalizeTenantId(rawTenant, "");
  const publicTenantId = normalizeTenantId(config.publicTenantId, "public");
  const actor = verifyActor(req, config);
  const isProtectedFlow = req.path === "/chat" || req.path === "/reindex";

  req.user = actor;

  if (isProtectedFlow && !tenantId) {
    if (rawTenant) {
      const err = new Error("Invalid tenant header");
      err.statusCode = 400;
      err.code = "TENANT_INVALID";
      return next(err);
    }
    const err = new Error("Tenant header is required");
    err.statusCode = 400;
    err.code = "TENANT_REQUIRED";
    return next(err);
  }

  if (isProtectedFlow && actor) {
    const actorTenantId = normalizeTenantId(actor.tenantId, "");
    if (!actorTenantId) {
      const err = new Error("Missing tenant claim in token");
      err.statusCode = 401;
      err.code = "AUTH_TENANT_CLAIM_REQUIRED";
      return next(err);
    }
    if (tenantId !== actorTenantId) {
      const err = new Error("Tenant mismatch");
      err.statusCode = 403;
      err.code = "AUTH_TENANT_MISMATCH";
      return next(err);
    }
  }

  if (req.path === "/chat" && !actor && tenantId && tenantId !== publicTenantId) {
    const err = new Error("Anonymous chat is only allowed in public tenant");
    err.statusCode = 403;
    err.code = "TENANT_FORBIDDEN";
    return next(err);
  }

  if (!isProtectedFlow && !tenantId) {
    req.tenantId = publicTenantId;
    req.headers["x-tenant-id"] = publicTenantId;
    return next();
  }

  req.tenantId = tenantId;
  req.headers["x-tenant-id"] = tenantId;
  next();
};

module.exports = {
  tenantContextMiddleware,
};
