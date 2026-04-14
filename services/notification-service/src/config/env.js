const DEFAULT_PORT = 4005;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 600;
const DEFAULT_IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return fallback;
};

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
};

const getEnvConfig = () => ({
  port: toNumber(process.env.PORT, DEFAULT_PORT),
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || "",
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@bookstore.local",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpSecure: toBoolean(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER || "",
  smtpPassword: process.env.SMTP_PASSWORD || "",
  smtpService: process.env.SMTP_SERVICE || "",
  emailRetryAttempts: toNumber(process.env.EMAIL_RETRY_ATTEMPTS, DEFAULT_RETRY_ATTEMPTS),
  emailRetryDelayMs: toNumber(process.env.EMAIL_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS),
  idempotencyTtlMs: toNumber(process.env.IDEMPOTENCY_TTL_MS, DEFAULT_IDEMPOTENCY_TTL_MS),
  allowMockEmail: toBoolean(process.env.ALLOW_MOCK_EMAIL, true),
});

module.exports = {
  getEnvConfig,
};
