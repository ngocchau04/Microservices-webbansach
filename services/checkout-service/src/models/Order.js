const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    stockSnapshot: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    shippingInfo: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true },
    },
    paymentMethod: { type: String, enum: ["cod", "online"], default: "cod" },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded", "cancelled"],
      default: "unpaid",
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "shipping",
        "completed",
        "return_requested",
        "return_processing",
        "return_accepted",
        "return_rejected",
        "returned",
        "cancelled",
      ],
      default: "pending",
    },
    returnRequestReason: { type: String, default: "" },
    returnRequestedAt: { type: Date, default: null },
    voucherInfo: {
      code: { type: String, default: null },
      type: { type: String, enum: ["fixed", "percent", null], default: null },
      value: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
    },
    totals: {
      subtotal: { type: Number, required: true, min: 0 },
      discount: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const Order = mongoose.model("checkout_orders", orderSchema);

module.exports = Order;

