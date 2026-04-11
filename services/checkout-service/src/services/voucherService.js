const Voucher = require("../models/Voucher");
const { roundMoney } = require("../utils/money");

const normalizeVoucherType = (type) => {
  if (type === "fixed" || type === 1 || type === "1") {
    return "fixed";
  }
  if (type === "percent" || type === 2 || type === "2") {
    return "percent";
  }
  return null;
};

const isVoucherActive = (voucher) => {
  if (!voucher) {
    return false;
  }

  if (voucher.status !== "active") {
    return false;
  }

  if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() < Date.now()) {
    return false;
  }

  if (Number.isFinite(voucher.usageLimit) && voucher.usageLimit !== null) {
    if ((voucher.usedCount || 0) >= voucher.usageLimit) {
      return false;
    }
  }

  return true;
};

const computeVoucherDiscount = ({ voucher, subtotal }) => {
  if (!voucher || subtotal <= 0) {
    return 0;
  }

  if (voucher.type === "fixed") {
    return Math.min(roundMoney(voucher.value), subtotal);
  }

  if (voucher.type === "percent") {
    const raw = roundMoney((subtotal * voucher.value) / 100);
    if (Number.isFinite(voucher.maxDiscount) && voucher.maxDiscount !== null) {
      return Math.min(raw, voucher.maxDiscount, subtotal);
    }
    return Math.min(raw, subtotal);
  }

  return 0;
};

const toVoucherProjection = (voucher) => ({
  code: voucher.code,
  type: voucher.type,
  value: voucher.value,
  maxDiscount: voucher.maxDiscount,
});

const toLegacyVoucher = (voucher) => ({
  _id: voucher._id,
  voucherCode: voucher.code,
  voucherType: voucher.type === "fixed" ? 1 : 2,
  voucherValue: voucher.value,
  maxDiscountValue: voucher.maxDiscount,
  minOrderValue: voucher.minOrderValue,
  voucherExpiration: voucher.expiresAt,
  usedCount: voucher.usedCount,
  status: voucher.status,
});

const listAvailableVouchers = async () => {
  const vouchers = await Voucher.find({ status: "active" }).sort({ createdAt: -1 });
  const available = vouchers.filter(isVoucherActive);

  return {
    ok: true,
    statusCode: 200,
    data: {
      items: available,
    },
    legacy: {
      status: "success",
      data: available.map(toLegacyVoucher),
    },
  };
};

const resolveApplicableVoucher = async ({ code, subtotal }) => {
  if (!code || typeof code !== "string") {
    return {
      ok: false,
      statusCode: 400,
      message: "Voucher code is required",
      code: "CHECKOUT_VOUCHER_CODE_REQUIRED",
    };
  }

  const voucher = await Voucher.findOne({ code: code.trim().toUpperCase() });

  if (!voucher) {
    return {
      ok: false,
      statusCode: 404,
      message: "Voucher not found",
      code: "CHECKOUT_VOUCHER_NOT_FOUND",
      legacy: { status: "fail", message: "Voucher not found" },
    };
  }

  if (!isVoucherActive(voucher)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Voucher is inactive or expired",
      code: "CHECKOUT_VOUCHER_INACTIVE",
      legacy: { status: "fail", message: "Voucher is expired" },
    };
  }

  if (Number(subtotal) < Number(voucher.minOrderValue || 0)) {
    return {
      ok: false,
      statusCode: 400,
      message: `Order does not meet minimum value ${voucher.minOrderValue}`,
      code: "CHECKOUT_VOUCHER_MIN_ORDER_NOT_REACHED",
      legacy: {
        status: "fail",
        message: `Order does not meet minimum value ${voucher.minOrderValue}`,
      },
    };
  }

  const discount = computeVoucherDiscount({ voucher, subtotal: Number(subtotal) || 0 });

  return {
    ok: true,
    statusCode: 200,
    data: {
      voucher,
      voucherProjection: toVoucherProjection(voucher),
      discount,
    },
    legacy: {
      status: "success",
      data: toLegacyVoucher(voucher),
      discount,
    },
  };
};

const validateVoucher = async ({ code, subtotal }) => {
  return resolveApplicableVoucher({ code, subtotal });
};

const incrementVoucherUsage = async ({ code }) => {
  if (!code) {
    return;
  }

  await Voucher.updateOne(
    { code: String(code).trim().toUpperCase() },
    { $inc: { usedCount: 1 } }
  );
};

const createVoucher = async ({ payload }) => {
  const code = String(payload.code || payload.voucherCode || "").trim().toUpperCase();
  const type = normalizeVoucherType(payload.type || payload.voucherType);
  const value = Number(payload.value ?? payload.voucherValue);
  const minOrderValue = Number(payload.minOrderValue ?? 0);
  const maxDiscount = payload.maxDiscount ?? payload.maxDiscountValue ?? null;
  const usageLimit = payload.usageLimit ?? null;
  const expiresAt = payload.expiresAt || payload.voucherExpiration;

  if (!code || !type || !Number.isFinite(value) || value < 0 || !expiresAt) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid voucher payload",
      code: "CHECKOUT_VOUCHER_VALIDATION_ERROR",
    };
  }

  const existing = await Voucher.findOne({ code });
  if (existing) {
    return {
      ok: false,
      statusCode: 409,
      message: "Voucher code already exists",
      code: "CHECKOUT_VOUCHER_CONFLICT",
    };
  }

  const created = await Voucher.create({
    code,
    type,
    value,
    minOrderValue,
    maxDiscount: Number.isFinite(Number(maxDiscount)) ? Number(maxDiscount) : null,
    usageLimit: Number.isFinite(Number(usageLimit)) ? Number(usageLimit) : null,
    expiresAt,
    status: payload.status || "active",
  });

  return {
    ok: true,
    statusCode: 201,
    data: { item: created },
    legacy: {
      status: "success",
      data: toLegacyVoucher(created),
    },
  };
};

const deleteVoucher = async ({ voucherId }) => {
  const voucher = await Voucher.findById(voucherId);

  if (!voucher) {
    return {
      ok: false,
      statusCode: 404,
      message: "Voucher not found",
      code: "CHECKOUT_VOUCHER_NOT_FOUND",
    };
  }

  await voucher.deleteOne();

  return {
    ok: true,
    statusCode: 200,
    data: { item: voucher },
    legacy: {
      status: "success",
      data: toLegacyVoucher(voucher),
    },
  };
};

const getVoucherByCode = async ({ code }) => {
  const voucher = await Voucher.findOne({ code: String(code).trim().toUpperCase() });

  if (!voucher) {
    return {
      ok: false,
      statusCode: 404,
      message: "Voucher not found",
      code: "CHECKOUT_VOUCHER_NOT_FOUND",
      legacy: { status: "fail", message: "Voucher not found" },
    };
  }

  if (!isVoucherActive(voucher)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Voucher is inactive or expired",
      code: "CHECKOUT_VOUCHER_INACTIVE",
      legacy: { status: "fail", message: "Voucher is expired" },
    };
  }

  return {
    ok: true,
    statusCode: 200,
    data: { item: voucher },
    legacy: {
      status: "success",
      data: toLegacyVoucher(voucher),
    },
  };
};

module.exports = {
  listAvailableVouchers,
  validateVoucher,
  resolveApplicableVoucher,
  incrementVoucherUsage,
  createVoucher,
  deleteVoucher,
  getVoucherByCode,
  toLegacyVoucher,
};

