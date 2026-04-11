const nodemailer = require("nodemailer");

const wait = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const createTransporter = (config) => {
  if (!config.smtpUser || !config.smtpPassword) {
    return null;
  }

  const transportOptions = config.smtpService
    ? {
        service: config.smtpService,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword,
        },
      }
    : {
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword,
        },
      };

  return nodemailer.createTransport(transportOptions);
};

const sendMailWithRetry = async ({ config, mailOptions }) => {
  const transporter = createTransporter(config);

  if (!transporter) {
    if (!config.allowMockEmail) {
      const error = new Error("SMTP credentials are missing");
      error.code = "NOTIFY_SMTP_CONFIG_MISSING";
      throw error;
    }

    const mockMessageId = `mock-${Date.now()}`;
    console.warn("[notification-service] SMTP config missing. Returning mock email delivery.");
    return {
      messageId: mockMessageId,
      accepted: [mailOptions.to],
      mocked: true,
      attempts: 1,
    };
  }

  const maxAttempts = Math.max(1, Number(config.emailRetryAttempts) + 1);
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await transporter.sendMail({
        from: config.emailFrom,
        ...mailOptions,
      });

      return {
        messageId: result.messageId,
        accepted: result.accepted || [],
        mocked: false,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }

      const delay = Math.max(0, Number(config.emailRetryDelayMs) * attempt);
      await wait(delay);
    }
  }

  const error = new Error(lastError?.message || "Unable to send email");
  error.code = "NOTIFY_DELIVERY_FAILED";
  error.cause = lastError;
  throw error;
};

module.exports = {
  sendMailWithRetry,
};
