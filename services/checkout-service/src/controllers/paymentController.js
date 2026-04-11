const paymentService = require("../services/paymentService");
const { sendServiceResult } = require("../utils/http");

const createPayment = async (req, res) => {
  const result = await paymentService.createPayment({
    requester: req.user,
    payload: req.body,
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

const paymentWebhook = async (req, res) => {
  const result = await paymentService.handleWebhook({
    payload: req.body,
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

const getPaymentById = async (req, res) => {
  const result = await paymentService.getPaymentById({
    requester: req.user,
    paymentId: req.params.id,
  });

  return sendServiceResult(res, result);
};

module.exports = {
  createPayment,
  paymentWebhook,
  getPaymentById,
};

