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

const parseNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
};

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
  const normalizedPayload = payload || {};
  const code = String(normalizedPayload.code || normalizedPayload.voucherCode || "")
    .trim()
    .toUpperCase();
  const type = normalizeVoucherType(normalizedPayload.type || normalizedPayload.voucherType);
  const value = Number(normalizedPayload.value ?? normalizedPayload.voucherValue);
  const minOrderValue = Number(normalizedPayload.minOrderValue ?? 0);
  const maxDiscount = parseNullableNumber(
    normalizedPayload.maxDiscount ?? normalizedPayload.maxDiscountValue
  );
  const usageLimit = parseNullableNumber(normalizedPayload.usageLimit);
  const expiresAtRaw = normalizedPayload.expiresAt || normalizedPayload.voucherExpiration;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  if (
    !code ||
    !type ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isFinite(minOrderValue) ||
    minOrderValue < 0 ||
    !expiresAt ||
    Number.isNaN(expiresAt.getTime())
  ) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid voucher payload",
      code: "CHECKOUT_VOUCHER_VALIDATION_ERROR",
    };
  }

  if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) {
    return {
      ok: false,
      statusCode: 400,
      message: "maxDiscount must be a non-negative number",
      code: "CHECKOUT_VOUCHER_VALIDATION_ERROR",
    };
  }

  if (usageLimit !== null && (!Number.isFinite(usageLimit) || usageLimit < 1)) {
    return {
      ok: false,
      statusCode: 400,
      message: "usageLimit must be greater than or equal to 1",
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

  let created;
  try {
    created = await Voucher.create({
      code,
      type,
      value,
      minOrderValue,
      maxDiscount,
      usageLimit,
      expiresAt,
      status: normalizedPayload.status || "active",
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return {
        ok: false,
        statusCode: 409,
        message: "Voucher code already exists",
        code: "CHECKOUT_VOUCHER_CONFLICT",
      };
    }

    if (error && error.name === "ValidationError") {
      return {
        ok: false,
        statusCode: 400,
        message: "Invalid voucher payload",
        code: "CHECKOUT_VOUCHER_VALIDATION_ERROR",
      };
    }

    throw error;
  }

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

