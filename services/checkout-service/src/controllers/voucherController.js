const cartService = require("../services/cartService");
const voucherService = require("../services/voucherService");
const { sendServiceResult } = require("../utils/http");

const listAvailable = async (req, res) => {
  const result = await voucherService.listAvailableVouchers();
  return sendServiceResult(res, result);
};

const validateVoucher = async (req, res) => {
  const result = await voucherService.validateVoucher({
    code: req.body.code || req.body.voucherCode,
    subtotal: req.body.subtotal || req.body.orderValue || 0,
  });

  return sendServiceResult(res, result);
};

const applyVoucher = async (req, res) => {
  const result = await cartService.applyVoucherToCart({
    userId: req.user.userId,
    code: req.body.code || req.body.voucherCode,
  });

  return sendServiceResult(res, result);
};

const createVoucher = async (req, res) => {
  const result = await voucherService.createVoucher({ payload: req.body });
  return sendServiceResult(res, result);
};

const deleteVoucher = async (req, res) => {
  const result = await voucherService.deleteVoucher({ voucherId: req.params.id });
  return sendServiceResult(res, result);
};

const getVoucherByCode = async (req, res) => {
  const result = await voucherService.getVoucherByCode({ code: req.params.code || req.params.voucherCode });
  return sendServiceResult(res, result);
};

module.exports = {
  listAvailable,
  validateVoucher,
  applyVoucher,
  createVoucher,
  deleteVoucher,
  getVoucherByCode,
};

