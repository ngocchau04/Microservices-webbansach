const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    stockSnapshot: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const cartVoucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    type: { type: String, enum: ["fixed", "percent"], required: true },
    value: { type: Number, required: true },
    maxDiscount: { type: Number, default: null },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    appliedVoucher: { type: cartVoucherSchema, default: null },
    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const Cart = mongoose.model("checkout_carts", cartSchema);

module.exports = Cart;

