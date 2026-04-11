const Feedback = require("../models/Feedback");
const { validateCreateFeedbackInput, validateStatus } = require("../utils/validators");
const { sendSupportAckEmail } = require("./notificationClient");

const mapLegacyFeedback = (feedback) => ({
  _id: feedback._id,
  userId: feedback.userId,
  userEmail: feedback.userEmail,
  subject: feedback.subject,
  message: feedback.message,
  category: feedback.category,
  status: feedback.status,
  priority: feedback.priority,
  orderId: feedback.orderId,
  createdAt: feedback.createdAt,
  updatedAt: feedback.updatedAt,
});

const createFeedback = async ({ user, payload, requestMeta, config }) => {
  const validationError = validateCreateFeedbackInput(payload);
  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      message: validationError,
      code: "SUPPORT_VALIDATION_ERROR",
    };
  }

  const feedback = await Feedback.create({
    userId: String(user.userId),
    userEmail: String(user.email || payload.email || "").trim(),
    subject: String(payload.subject || "").trim(),
    message: String(payload.message || "").trim(),
    category: String(payload.category || "general").trim().toLowerCase(),
    priority: String(payload.priority || "normal").trim().toLowerCase(),
    orderId: String(payload.orderId || "").trim(),
    metadata: {
      source: String(payload.source || "web"),
      userAgent: requestMeta.userAgent || "",
      ipAddress: requestMeta.ipAddress || "",
    },
    messages: [
      {
        sender: "user",
        content: String(payload.message || "").trim(),
        createdAt: new Date(),
      },
    ],
  });

  await sendSupportAckEmail({
    config,
    email: feedback.userEmail,
    customerName: payload.customerName || "",
    subject: feedback.subject,
    message: "We received your feedback request. Our support team will respond soon.",
    ticketId: String(feedback._id),
  });

  return {
    ok: true,
    statusCode: 201,
    data: {
      item: feedback,
      feedback,
    },
    legacy: {
      feedback: mapLegacyFeedback(feedback),
    },
  };
};

const listMyFeedback = async ({ userId }) => {
  const items = await Feedback.find({ userId: String(userId) }).sort({ createdAt: -1 });

  return {
    ok: true,
    statusCode: 200,
    data: {
      items,
    },
    legacy: {
      data: items.map(mapLegacyFeedback),
    },
  };
};

const listAdminFeedback = async () => {
  const items = await Feedback.find().sort({ createdAt: -1 });

  return {
    ok: true,
    statusCode: 200,
    data: {
      items,
      total: items.length,
    },
    legacy: {
      data: items.map(mapLegacyFeedback),
    },
  };
};

const updateFeedbackStatus = async ({ feedbackId, status, adminMessage }) => {
  const nextStatus = String(status || "").trim();
  if (!validateStatus(nextStatus)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid feedback status",
      code: "SUPPORT_INVALID_STATUS",
    };
  }

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) {
    return {
      ok: false,
      statusCode: 404,
      message: "Feedback not found",
      code: "SUPPORT_FEEDBACK_NOT_FOUND",
    };
  }

  feedback.status = nextStatus;
  if (typeof adminMessage === "string" && adminMessage.trim()) {
    feedback.messages.push({
      sender: "admin",
      content: adminMessage.trim(),
      createdAt: new Date(),
    });
  }
  await feedback.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: feedback,
      feedback,
    },
    legacy: {
      feedback: mapLegacyFeedback(feedback),
    },
  };
};

module.exports = {
  createFeedback,
  listMyFeedback,
  listAdminFeedback,
  updateFeedbackStatus,
};
