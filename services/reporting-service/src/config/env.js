const DEFAULT_PORT = 4006;
const DEFAULT_DB_NAME = "book_reporting";
const DEFAULT_CHECKOUT_SERVICE_URL = "http://localhost:4003";
const DEFAULT_IDENTITY_SERVICE_URL = "http://localhost:4001";
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_CACHE_TTL_SECONDS = 120;

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const trimSlash = (value) => String(value || "").replace(/\/+$/, "");

const getEnvConfig = () => ({
  port: toNumber(process.env.PORT, DEFAULT_PORT),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.REPORTING_DB_NAME || DEFAULT_DB_NAME,
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || "",
  checkoutServiceUrl: trimSlash(process.env.CHECKOUT_SERVICE_URL || DEFAULT_CHECKOUT_SERVICE_URL),
  checkoutRequestTimeoutMs: toNumber(process.env.CHECKOUT_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  identityServiceUrl: trimSlash(process.env.IDENTITY_SERVICE_URL || DEFAULT_IDENTITY_SERVICE_URL),
  identityRequestTimeoutMs: toNumber(process.env.IDENTITY_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  internalServiceUserId: process.env.INTERNAL_SERVICE_USER_ID || "reporting-service",
  dashboardCacheTtlSeconds: toNumber(process.env.DASHBOARD_CACHE_TTL_SECONDS, DEFAULT_CACHE_TTL_SECONDS),
});

module.exports = {
  getEnvConfig,
};
