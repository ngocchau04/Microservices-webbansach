const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({
  voucherCode: { type: String, required: true, unique: true },
  voucherValue: { type: Number, required: true },
  maxDiscountValue: { type: Number},
  minOrderValue: { type: Number, required: true },
  voucherType: { type: Number, required: true }, // 1: Giam truc tiep, 2: Giam %
  voucherDescription: { type: String },
  voucherExpiration: { type: Date },
  usedCount: { type: Number, default: 0 },
});

const Voucher = mongoose.model("Voucher", voucherSchema);

module.exports = Voucher;
