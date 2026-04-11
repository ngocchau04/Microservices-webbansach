const {
  buildVerificationTemplate,
  buildOrderConfirmationTemplate,
  buildOrderStatusTemplate,
  buildSupportAcknowledgementTemplate,
} = require("../utils/emailTemplates");
const {
  validateVerificationPayload,
  validateOrderEmailPayload,
  validateOrderStatusPayload,
  validateSupportPayload,
} = require("../utils/validators");
const { sendMailWithRetry } = require("./mailerService");

const idempotencyStore = new Map();

const cleanupExpiredIdempotency = () => {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore.entries()) {
    if (!entry.expiresAt || entry.expiresAt <= now) {
      idempotencyStore.delete(key);
    }
  }
};

const executeWithIdempotency = async ({ idempotencyKey, ttlMs, operation }) => {
  cleanupExpiredIdempotency();

  if (!idempotencyKey) {
    return operation();
  }

  const key = String(idempotencyKey).trim();
  const existing = idempotencyStore.get(key);
  if (existing) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        ...existing.data,
        deduplicated: true,
      },
    };
  }

  const result = await operation();
  if (result.ok) {
    idempotencyStore.set(key, {
      expiresAt: Date.now() + ttlMs,
      data: result.data,
    });
  }

  return result;
};

const sendTemplateEmail = async ({ payload, config, validator, builder, idempotencyKey }) => {
  const validationError = validator(payload);
  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      message: validationError.message,
      code: validationError.code,
    };
  }

  const sendResult = await executeWithIdempotency({
    idempotencyKey,
    ttlMs: config.idempotencyTtlMs,
    operation: async () => {
      try {
        const template = builder(payload, config);
        const delivery = await sendMailWithRetry({
          config,
          mailOptions: {
            to: template.to,
            subject: template.subject,
            text: template.text,
            html: template.html,
          },
        });

        return {
          ok: true,
          statusCode: 202,
          data: {
            messageId: delivery.messageId,
            accepted: delivery.accepted,
            mocked: delivery.mocked,
            attempts: delivery.attempts,
          },
        };
      } catch (error) {
        return {
          ok: false,
          statusCode: 502,
          message: error.message || "Unable to deliver email",
          code: error.code || "NOTIFY_DELIVERY_FAILED",
        };
      }
    },
  });

  return sendResult;
};

const sendVerificationEmail = ({ payload, config, idempotencyKey }) =>
  sendTemplateEmail({
    payload,
    config,
    idempotencyKey,
    validator: validateVerificationPayload,
    builder: buildVerificationTemplate,
  });

const sendOrderEmail = ({ payload, config, idempotencyKey }) =>
  sendTemplateEmail({
    payload,
    config,
    idempotencyKey,
    validator: validateOrderEmailPayload,
    builder: buildOrderConfirmationTemplate,
  });

const sendOrderStatusEmail = ({ payload, config, idempotencyKey }) =>
  sendTemplateEmail({
    payload,
    config,
    idempotencyKey,
    validator: validateOrderStatusPayload,
    builder: buildOrderStatusTemplate,
  });

const sendSupportEmail = ({ payload, config, idempotencyKey }) =>
  sendTemplateEmail({
    payload,
    config,
    idempotencyKey,
    validator: validateSupportPayload,
    builder: buildSupportAcknowledgementTemplate,
  });

module.exports = {
  sendVerificationEmail,
  sendOrderEmail,
  sendOrderStatusEmail,
  sendSupportEmail,
};
