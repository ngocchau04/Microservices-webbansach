const DEFAULT_PORT = 4008;
const DEFAULT_CATALOG_SERVICE_URL = "http://localhost:4002";
const DEFAULT_SUPPORT_SERVICE_URL = "http://localhost:4007";
const DEFAULT_IMAGE_SEARCH_SERVICE_URL = "http://localhost:4010";
const DEFAULT_DB_NAME = "book_assistant";
const DEFAULT_TENANT_ID = "public";

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const trimSlash = (url) => url.replace(/\/+$/, "");
const normalizeTenantId = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return normalized || DEFAULT_TENANT_ID;
};

const getEnvConfig = () => ({
  port: toPositiveNumber(process.env.PORT, DEFAULT_PORT),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.ASSISTANT_DB_NAME || DEFAULT_DB_NAME,
  catalogServiceUrl: trimSlash(process.env.CATALOG_SERVICE_URL || DEFAULT_CATALOG_SERVICE_URL),
  supportServiceUrl: trimSlash(process.env.SUPPORT_SERVICE_URL || DEFAULT_SUPPORT_SERVICE_URL),
  imageSearchServiceUrl: trimSlash(
    process.env.IMAGE_SEARCH_SERVICE_URL || DEFAULT_IMAGE_SEARCH_SERVICE_URL
  ),
  supportInternalApiKey: process.env.SUPPORT_INTERNAL_API_KEY || "",
  imageSearchInternalApiKey: process.env.IMAGE_SEARCH_INTERNAL_API_KEY || "",
  catalogInternalApiKey: process.env.CATALOG_INTERNAL_API_KEY || "",
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || "",
  reindexApiKey: process.env.ASSISTANT_REINDEX_API_KEY || "",
  defaultTenantId: normalizeTenantId(process.env.DEFAULT_TENANT_ID || DEFAULT_TENANT_ID),
  publicTenantId: normalizeTenantId(process.env.PUBLIC_TENANT_ID || DEFAULT_TENANT_ID),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
});

module.exports = {
  getEnvConfig,
};
