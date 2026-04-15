const DEFAULT_PORT = 4007;
const DEFAULT_DB_NAME = "book_support";
const DEFAULT_NOTIFICATION_SERVICE_URL = "http://localhost:4005";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_TENANT_ID = "public";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const trimSlash = (url) => String(url || "").replace(/\/+$/, "");

const getEnvConfig = () => ({
  port: toNumber(process.env.PORT, DEFAULT_PORT),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.SUPPORT_DB_NAME || DEFAULT_DB_NAME,
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  notificationServiceUrl: trimSlash(
    process.env.NOTIFICATION_SERVICE_URL || DEFAULT_NOTIFICATION_SERVICE_URL
  ),
  notificationRequestTimeoutMs: toNumber(
    process.env.NOTIFICATION_REQUEST_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS
  ),
  notificationRequired: toBoolean(process.env.NOTIFICATION_REQUIRED, false),
  internalApiKey: process.env.SUPPORT_INTERNAL_API_KEY || "",
  defaultTenantId: String(process.env.DEFAULT_TENANT_ID || DEFAULT_TENANT_ID)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "") || DEFAULT_TENANT_ID,
});

module.exports = {
  getEnvConfig,
};
