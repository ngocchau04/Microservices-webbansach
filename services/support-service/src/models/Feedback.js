const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "admin", "system"],
      default: "user",
    },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    category: {
      type: String,
      enum: ["general", "order", "payment", "account", "technical", "other"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    handoffState: {
      type: String,
      enum: ["bot_only", "waiting_human", "human_active", "closed"],
      default: "bot_only",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    orderId: { type: String, default: "" },
    sessionId: { type: String, default: "", index: true },
    channel: {
      type: String,
      enum: ["feedback", "assistant_handoff"],
      default: "feedback",
      index: true,
    },
    metadata: {
      source: { type: String, default: "web" },
      userAgent: { type: String, default: "" },
      ipAddress: { type: String, default: "" },
      issueSummary: { type: String, default: "" },
      detectedIntent: { type: String, default: "" },
    },
    messages: { type: [messageSchema], default: [] },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const Feedback = mongoose.model("support_feedback", feedbackSchema);

module.exports = Feedback;
