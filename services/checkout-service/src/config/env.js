const DEFAULT_PORT = 4003;
const DEFAULT_DB_NAME = "book_checkout";
const DEFAULT_CATALOG_SERVICE_URL = "http://localhost:4002";
const DEFAULT_NOTIFICATION_SERVICE_URL = "http://localhost:4005";
const DEFAULT_TIMEOUT_MS = 8000;

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const trimSlash = (url) => url.replace(/\/+$/, "");

const getEnvConfig = () => ({
  port: toNumber(process.env.PORT, DEFAULT_PORT),
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017",
  dbName: process.env.CHECKOUT_DB_NAME || DEFAULT_DB_NAME,
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || "your_secret_key",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  catalogServiceUrl: trimSlash(process.env.CATALOG_SERVICE_URL || DEFAULT_CATALOG_SERVICE_URL),
  catalogRequestTimeoutMs: toNumber(process.env.CATALOG_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  notificationServiceUrl: trimSlash(
    process.env.NOTIFICATION_SERVICE_URL || DEFAULT_NOTIFICATION_SERVICE_URL
  ),
  notificationRequestTimeoutMs: toNumber(
    process.env.NOTIFICATION_REQUEST_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS
  ),
  mockPaymentProvider: process.env.MOCK_PAYMENT_PROVIDER || "mockpay",
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "replace_with_mock_webhook_secret",
});

module.exports = {
  getEnvConfig,
};

