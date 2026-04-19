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

const vnpayReturn = async (req, res) => {
  const result = await paymentService.handleVnpayReturn({
    query: req.query,
    config: req.app.locals.config,
  });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.redirect(result.data.redirectUrl);
};

const vnpayDemoReturn = async (req, res) => {
  const result = await paymentService.handleVnpayDemoReturn({
    paymentId: req.query.paymentId,
    config: req.app.locals.config,
  });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.redirect(result.data.redirectUrl);
};

const momoReturn = async (req, res) => {
  const result = await paymentService.handleMomoReturn({
    query: req.query,
    config: req.app.locals.config,
  });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.redirect(result.data.redirectUrl);
};

const momoDemoReturn = async (req, res) => {
  const result = await paymentService.handleMomoDemoReturn({
    paymentId: req.query.paymentId,
    config: req.app.locals.config,
  });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.redirect(result.data.redirectUrl);
};

const momoIpn = async (req, res) => {
  const result = await paymentService.handleMomoIpn({
    payload: req.body,
    config: req.app.locals.config,
  });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.status(204).send();
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
  vnpayReturn,
  vnpayDemoReturn,
  momoReturn,
  momoDemoReturn,
  momoIpn,
  getPaymentById,
};

