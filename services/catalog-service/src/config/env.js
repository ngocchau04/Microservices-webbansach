const DEFAULT_PORT = 4002;
const DEFAULT_DB_NAME = "book_catalog";
const DEFAULT_CHECKOUT_SERVICE_URL = "http://localhost:4003";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_TENANT_ID = "public";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const normalizeTenantId = (value, fallback = DEFAULT_TENANT_ID) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (!/^[a-z0-9_-]{1,64}$/.test(normalized)) {
    return fallback;
  }
  return normalized;
};

const getEnvConfig = () => ({
  port: toNumber(process.env.PORT, DEFAULT_PORT),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.CATALOG_DB_NAME || DEFAULT_DB_NAME,
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || "",
  defaultTenantId: normalizeTenantId(process.env.DEFAULT_TENANT_ID || DEFAULT_TENANT_ID),
  publicTenantId: normalizeTenantId(process.env.PUBLIC_TENANT_ID || DEFAULT_TENANT_ID),
  internalApiKey: process.env.CATALOG_INTERNAL_API_KEY || "",
  checkoutServiceUrl: (process.env.CHECKOUT_SERVICE_URL || DEFAULT_CHECKOUT_SERVICE_URL).replace(
    /\/+$/,
    ""
  ),
  checkoutRequestTimeoutMs: toNumber(process.env.CHECKOUT_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
});

module.exports = {
  getEnvConfig,
};
