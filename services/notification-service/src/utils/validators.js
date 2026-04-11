const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const hasMinLength = (value, minLength) =>
  String(value || "").trim().length >= minLength;

const isNonNegativeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
};

const validateVerificationPayload = (payload = {}) => {
  if (!isEmail(payload.email)) {
    return {
      message: "email is required and must be valid",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  if (!hasMinLength(payload.verificationCode, 4)) {
    return {
      message: "verificationCode is required",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  return null;
};

const validateOrderEmailPayload = (payload = {}) => {
  if (!isEmail(payload.email)) {
    return {
      message: "email is required and must be valid",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  if (!hasMinLength(payload.orderId, 1)) {
    return {
      message: "orderId is required",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  if (!isNonNegativeNumber(payload.total)) {
    return {
      message: "total must be a non-negative number",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  if (payload.items && !Array.isArray(payload.items)) {
    return {
      message: "items must be an array",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  return null;
};

const validateOrderStatusPayload = (payload = {}) => {
  if (!isEmail(payload.email)) {
    return {
      message: "email is required and must be valid",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  if (!hasMinLength(payload.orderId, 1)) {
    return {
      message: "orderId is required",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  if (!hasMinLength(payload.status, 1)) {
    return {
      message: "status is required",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  return null;
};

const validateSupportPayload = (payload = {}) => {
  if (!isEmail(payload.email)) {
    return {
      message: "email is required and must be valid",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  if (!hasMinLength(payload.subject, 1) && !hasMinLength(payload.ticketId, 1)) {
    return {
      message: "subject or ticketId is required",
      code: "NOTIFY_VALIDATION_ERROR",
    };
  }

  return null;
};

module.exports = {
  validateVerificationPayload,
  validateOrderEmailPayload,
  validateOrderStatusPayload,
  validateSupportPayload,
};
