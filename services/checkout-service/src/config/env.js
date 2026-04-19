const DEFAULT_PORT = 4003;
const DEFAULT_DB_NAME = "book_checkout";
const DEFAULT_CATALOG_SERVICE_URL = "http://localhost:4002";
const DEFAULT_NOTIFICATION_SERVICE_URL = "http://localhost:4005";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_VNPAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const DEFAULT_MOMO_URL = "https://test-payment.momo.vn/v2/gateway/api/create";
const DEFAULT_APP_BASE_URL = "http://localhost:5173";
const DEFAULT_API_BASE_URL = "http://localhost:8080";

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
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || "",
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
  paymentProvider: String(process.env.PAYMENT_PROVIDER || "mockpay").trim().toLowerCase(),
  vnpayTmnCode: process.env.VNPAY_TMN_CODE || "",
  vnpaySecretKey: process.env.VNPAY_SECRET_KEY || "",
  vnpayUrl: trimSlash(process.env.VNPAY_URL || DEFAULT_VNPAY_URL),
  momoPartnerCode: process.env.MOMO_PARTNER_CODE || "",
  momoAccessKey: process.env.MOMO_ACCESS_KEY || "",
  momoSecretKey: process.env.MOMO_SECRET_KEY || "",
  momoApiUrl: trimSlash(process.env.MOMO_API_URL || DEFAULT_MOMO_URL),
  momoPartnerName: process.env.MOMO_PARTNER_NAME || "Bookstore",
  momoStoreId: process.env.MOMO_STORE_ID || "Bookstore",
  momoRequestType: process.env.MOMO_REQUEST_TYPE || "captureWallet",
  appBaseUrl: trimSlash(process.env.APP_BASE_URL || DEFAULT_APP_BASE_URL),
  apiBaseUrl: trimSlash(process.env.API_BASE_URL || DEFAULT_API_BASE_URL),
  vnpayReturnPath: process.env.VNPAY_RETURN_PATH || "/api/checkout/payments/vnpay/return",
  momoReturnPath: process.env.MOMO_RETURN_PATH || "/api/checkout/payments/momo/return",
  momoIpnPath: process.env.MOMO_IPN_PATH || "/api/checkout/payments/momo/ipn",
});

module.exports = {
  getEnvConfig,
};

