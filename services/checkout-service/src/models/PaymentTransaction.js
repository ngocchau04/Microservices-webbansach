const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    method: { type: String, enum: ["cod", "online"], required: true },
    provider: { type: String, default: "mockpay" },
    status: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "cancelled"],
      default: "pending",
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "VND" },
    metadata: { type: Object, default: {} },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const PaymentTransaction = mongoose.model(
  "checkout_payment_transactions",
  paymentTransactionSchema
);

module.exports = PaymentTransaction;

