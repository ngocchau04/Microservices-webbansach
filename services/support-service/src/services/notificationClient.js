const jwt = require("jsonwebtoken");

const createInternalToken = (config) =>
  !config.jwtSecret
    ? ""
    :
  jwt.sign(
    {
      internal: true,
      service: "support-service",
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
        throw new Error(message);
      }

      return body;
    } catch (error) {
      if (notificationRequired) {
        throw error;
      }

      console.warn(
        `[support-service] notification-service unavailable, fallback enabled: ${error.message}`
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

const sendSupportAckEmail = async ({
  config,
  email,
  customerName,
  subject,
  message,
  ticketId,
}) => {
  const url = `${config.notificationServiceUrl}/send-support-email`;

  return postWithTimeout({
    url,
    timeoutMs: config.notificationRequestTimeoutMs,
    notificationRequired: config.notificationRequired,
    config,
    payload: {
      email,
      customerName,
      subject,
      message,
      ticketId,
      idempotencyKey: `support-feedback-${ticketId}`,
    },
  });
};

module.exports = {
  sendSupportAckEmail,
};
