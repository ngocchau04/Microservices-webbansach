const mongoose = require("mongoose");
const Product = require("./Product");

const UserSchema = new mongoose.Schema(
  {
    email: String,
    name: String,
    password: String,
    sdt: String,
    role: { type: String, default: "user" },
    favorite: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      }
    ],
    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
      },
    ],
  },
  { versionKey: false }
);

const User = mongoose.model("accounts", UserSchema);

module.exports = User;
