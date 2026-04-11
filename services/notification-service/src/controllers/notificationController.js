const notificationService = require("../services/notificationService");
const { successResponse, errorResponse } = require("../utils/response");

const parseIdempotencyKey = (req) => req.headers["x-idempotency-key"] || req.body.idempotencyKey;

const sendResult = (res, result) => {
  if (!result.ok) {
    return res
      .status(result.statusCode || 500)
      .json(errorResponse(result.message || "Request failed", result.code || "NOTIFY_UNKNOWN_ERROR"));
  }

  return res.status(result.statusCode || 200).json(successResponse(result.data || null));
};

const sendVerificationEmail = async (req, res) => {
  const result = await notificationService.sendVerificationEmail({
    payload: req.body,
    config: req.app.locals.config,
    idempotencyKey: parseIdempotencyKey(req),
  });

  return sendResult(res, result);
};

const sendOrderEmail = async (req, res) => {
  const result = await notificationService.sendOrderEmail({
    payload: req.body,
    config: req.app.locals.config,
    idempotencyKey: parseIdempotencyKey(req),
  });

  return sendResult(res, result);
};

const sendOrderStatusEmail = async (req, res) => {
  const result = await notificationService.sendOrderStatusEmail({
    payload: req.body,
    config: req.app.locals.config,
    idempotencyKey: parseIdempotencyKey(req),
  });

  return sendResult(res, result);
};

const sendSupportEmail = async (req, res) => {
  const result = await notificationService.sendSupportEmail({
    payload: req.body,
    config: req.app.locals.config,
    idempotencyKey: parseIdempotencyKey(req),
  });

  return sendResult(res, result);
};

module.exports = {
  sendVerificationEmail,
  sendOrderEmail,
  sendOrderStatusEmail,
  sendSupportEmail,
};
