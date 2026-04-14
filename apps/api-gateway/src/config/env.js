const DEFAULT_PORT = 8080;
const DEFAULT_IDENTITY_SERVICE_URL = "http://localhost:4001";
const DEFAULT_CATALOG_SERVICE_URL = "http://localhost:4002";
const DEFAULT_CHECKOUT_SERVICE_URL = "http://localhost:4003";
const DEFAULT_MEDIA_SERVICE_URL = "http://localhost:4004";
const DEFAULT_NOTIFICATION_SERVICE_URL = "http://localhost:4005";
const DEFAULT_REPORTING_SERVICE_URL = "http://localhost:4006";
const DEFAULT_SUPPORT_SERVICE_URL = "http://localhost:4007";
const DEFAULT_ASSISTANT_SERVICE_URL = "http://localhost:4008";
const DEFAULT_TIMEOUT_MS = 15000;

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
  identityServiceUrl: trimSlash(
    process.env.IDENTITY_SERVICE_URL || DEFAULT_IDENTITY_SERVICE_URL
  ),
  catalogServiceUrl: trimSlash(
    process.env.CATALOG_SERVICE_URL || DEFAULT_CATALOG_SERVICE_URL
  ),
  checkoutServiceUrl: trimSlash(
    process.env.CHECKOUT_SERVICE_URL || DEFAULT_CHECKOUT_SERVICE_URL
  ),
  mediaServiceUrl: trimSlash(
    process.env.MEDIA_SERVICE_URL || DEFAULT_MEDIA_SERVICE_URL
  ),
  notificationServiceUrl: trimSlash(
    process.env.NOTIFICATION_SERVICE_URL || DEFAULT_NOTIFICATION_SERVICE_URL
  ),
  reportingServiceUrl: trimSlash(
    process.env.REPORTING_SERVICE_URL || DEFAULT_REPORTING_SERVICE_URL
  ),
  supportServiceUrl: trimSlash(
    process.env.SUPPORT_SERVICE_URL || DEFAULT_SUPPORT_SERVICE_URL
  ),
  assistantServiceUrl: trimSlash(
    process.env.ASSISTANT_SERVICE_URL || DEFAULT_ASSISTANT_SERVICE_URL
  ),
  timeoutMs: toPositiveNumber(process.env.REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
});

module.exports = {
  getEnvConfig,
};
