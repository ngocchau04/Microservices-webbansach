const DEFAULT_PORT = 4008;
const DEFAULT_CATALOG_SERVICE_URL = "http://localhost:4002";
const DEFAULT_SUPPORT_SERVICE_URL = "http://localhost:4007";
const DEFAULT_DB_NAME = "book_assistant";

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const trimSlash = (url) => url.replace(/\/+$/, "");

const getEnvConfig = () => ({
  port: toPositiveNumber(process.env.PORT, DEFAULT_PORT),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.ASSISTANT_DB_NAME || DEFAULT_DB_NAME,
  catalogServiceUrl: trimSlash(process.env.CATALOG_SERVICE_URL || DEFAULT_CATALOG_SERVICE_URL),
  supportServiceUrl: trimSlash(process.env.SUPPORT_SERVICE_URL || DEFAULT_SUPPORT_SERVICE_URL),
  supportInternalApiKey: process.env.SUPPORT_INTERNAL_API_KEY || "",
  reindexApiKey: process.env.ASSISTANT_REINDEX_API_KEY || "",
});

module.exports = {
  getEnvConfig,
};
