const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["fixed", "percent"], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, required: true, min: 0, default: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const Voucher = mongoose.model("checkout_vouchers", voucherSchema);

module.exports = Voucher;

