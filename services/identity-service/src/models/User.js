const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    tenantId: { type: String, default: "public", index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    sdt: { type: String, default: "" },
    role: { type: String, default: "user" },
    status: { type: String, default: "active" },
    isActive: { type: Boolean, default: true },
    authProvider: { type: String, default: "local" },
    favorite: { type: Array, default: [] },
    cart: { type: Array, default: [] },
  },
  { versionKey: false, timestamps: true }
);

const User = mongoose.model("identity_users", userSchema);

module.exports = User;
