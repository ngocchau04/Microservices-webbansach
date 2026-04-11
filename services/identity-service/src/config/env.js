const DEFAULT_PORT = 4001;
const DEFAULT_DB_NAME = "book_identity";
const DEFAULT_JWT_EXPIRES_IN = "1h";
const DEFAULT_NOTIFICATION_SERVICE_URL = "http://localhost:4005";
const DEFAULT_NOTIFICATION_REQUEST_TIMEOUT_MS = 8000;

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const getEnvConfig = () => ({
  port: toNumber(process.env.PORT, DEFAULT_PORT),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.IDENTITY_DB_NAME || DEFAULT_DB_NAME,
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || "your_secret_key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN,
  googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || "",
  emailUser: process.env.EMAIL_USER || "",
  emailPassword: process.env.EMAIL_PASSWORD || "",
  emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER || "",
  notificationServiceUrl: (process.env.NOTIFICATION_SERVICE_URL || DEFAULT_NOTIFICATION_SERVICE_URL).replace(
    /\/+$/,
    ""
  ),
  notificationRequestTimeoutMs: toNumber(
    process.env.NOTIFICATION_REQUEST_TIMEOUT_MS,
    DEFAULT_NOTIFICATION_REQUEST_TIMEOUT_MS
  ),
  notificationRequired: String(process.env.NOTIFICATION_REQUIRED || "false").toLowerCase() === "true",
});

module.exports = {
  getEnvConfig,
};
