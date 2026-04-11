const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    sdt: { type: String, default: "" },
    role: { type: String, default: "user" },
    verificationCode: { type: String, required: true },
  },
  { versionKey: false, timestamps: true }
);

const PendingUser = mongoose.model("identity_pending_users", pendingUserSchema);

module.exports = PendingUser;
