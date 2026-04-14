const jwt = require("jsonwebtoken");

const createInternalToken = (config) =>
  !config.jwtSecret
    ? ""
    :
  jwt.sign(
    {
      internal: true,
      service: "identity-service",
    },
    config.jwtSecret,
    { expiresIn: "2m" }
  );

const postWithTimeout = async ({ url, payload, timeoutMs, notificationRequired, config }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    try {
      const internalToken = createInternalToken(config);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(internalToken ? { Authorization: `Bearer ${internalToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const message = body?.message || `Notification request failed: ${response.status}`;
        const error = new Error(message);
        error.statusCode = response.status;
        error.code = body?.code || "AUTH_NOTIFICATION_FAILED";
        throw error;
      }

      return body;
    } catch (error) {
      if (notificationRequired) {
        throw error;
      }

      console.warn(
        `[identity-service] notification-service unavailable, fallback enabled: ${error.message}`
      );

      return {
        success: true,
        data: {
          skipped: true,
          fallback: true,
        },
      };
    }
  } finally {
    clearTimeout(timeout);
  }
};

const sendVerificationEmail = async ({ config, email, name, verificationCode, idempotencyKey }) => {
  const url = `${config.notificationServiceUrl}/send-verification-email`;

  return postWithTimeout({
    url,
    timeoutMs: config.notificationRequestTimeoutMs,
    payload: {
      email,
      name,
      verificationCode,
      idempotencyKey,
    },
    notificationRequired: config.notificationRequired,
    config,
  });
};

module.exports = {
  sendVerificationEmail,
};
