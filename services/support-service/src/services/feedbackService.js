const Feedback = require("../models/Feedback");
const { validateCreateFeedbackInput, validateStatus } = require("../utils/validators");
const { sendSupportAckEmail } = require("./notificationClient");
const { normalizeTenantId } = require("../utils/tenant");

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

const mapConversation = (feedback) => ({
  _id: feedback._id,
  userId: feedback.userId,
  userEmail: feedback.userEmail,
  subject: feedback.subject,
  status: feedback.status,
  handoffState: feedback.handoffState || "bot_only",
  channel: feedback.channel || "feedback",
  sessionId: feedback.sessionId || "",
  latestMessage:
    feedback.messages && feedback.messages.length ? feedback.messages[feedback.messages.length - 1] : null,
  messages: feedback.messages || [],
  metadata: feedback.metadata || {},
  tenantId: feedback.tenantId || "public",
  createdAt: feedback.createdAt,
  updatedAt: feedback.updatedAt,
});

const normalizeHandoffStateByStatus = (status) => {
  if (status === "closed" || status === "resolved") {
    return "closed";
  }
  if (status === "in_progress") {
    return "human_active";
  }
  return "waiting_human";
};

const createFeedback = async ({ user, payload, requestMeta, config, tenantId = "public" }) => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
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
    tenantId: scopedTenantId,
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

const createOrOpenAssistantHandoff = async ({ payload = {}, tenantId = "public" }) => {
  const scopedTenantId = normalizeTenantId(
    tenantId || payload.tenantId,
    "public"
  );
  const userId = String(payload.userId || "").trim();
  const userEmail = String(payload.userEmail || "").trim();
  const sessionId = String(payload.sessionId || "").trim();
  const latestUserMessage = String(payload.latestUserMessage || "").trim();
  const issueSummary = String(payload.issueSummary || "").trim() || "Yeu cau lien he nhan vien ho tro";
  const detectedIntent = String(payload.detectedIntent || "human_support").trim();
  const recentMessages = Array.isArray(payload.recentMessages) ? payload.recentMessages : [];

  if (!latestUserMessage) {
    return {
      ok: false,
      statusCode: 400,
      message: "latestUserMessage is required",
      code: "SUPPORT_HANDOFF_MESSAGE_REQUIRED",
    };
  }

  if (!userId) {
    return {
      ok: false,
      statusCode: 400,
      message: "userId is required for handoff",
      code: "SUPPORT_HANDOFF_USER_REQUIRED",
    };
  }

  const existing = await Feedback.findOne({
    tenantId: scopedTenantId,
    userId,
    channel: "assistant_handoff",
    status: { $in: ["open", "in_progress"] },
    handoffState: { $in: ["waiting_human", "human_active"] },
  }).sort({ updatedAt: -1 });

  const trimmedRecent = recentMessages
    .slice(-8)
    .map((item) => ({
      sender: item.role === "assistant" ? "system" : "user",
      content: String(item.text || item.mainAnswer || "").trim(),
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    }))
    .filter((item) => item.content);

  if (existing) {
    existing.status = existing.status === "closed" ? "open" : existing.status;
    existing.handoffState = "waiting_human";
    if (sessionId) {
      existing.sessionId = sessionId;
    }
    existing.metadata = {
      ...(existing.metadata || {}),
      source: "assistant_handoff",
      issueSummary,
      detectedIntent,
    };
    existing.messages.push({
      sender: "system",
      content: "Tro ly Bookie da tiep nhan yeu cau va chuyen cho nhan vien ho tro.",
      createdAt: new Date(),
    });
    existing.messages.push({
      sender: "user",
      content: latestUserMessage,
      createdAt: new Date(),
    });
    await existing.save();
    return {
      ok: true,
      statusCode: 200,
      data: {
        item: existing,
        conversation: mapConversation(existing),
        handoff: {
          mode: "human",
          state: existing.handoffState,
          conversationId: String(existing._id),
          created: false,
        },
      },
    };
  }

  const conversation = await Feedback.create({
    tenantId: scopedTenantId,
    userId,
    userEmail: userEmail || "unknown@bookie.local",
    subject: issueSummary,
    message: latestUserMessage,
    category: "general",
    priority: "normal",
    status: "open",
    handoffState: "waiting_human",
    channel: "assistant_handoff",
    sessionId,
    metadata: {
      source: "assistant_handoff",
      issueSummary,
      detectedIntent,
      userAgent: String(payload.userAgent || ""),
      ipAddress: String(payload.ipAddress || ""),
    },
    messages: [
      {
        sender: "system",
        content: "Tro ly Bookie da chuyen cuoc hoi thoai cho nhan vien ho tro.",
        createdAt: new Date(),
      },
      ...trimmedRecent,
      {
        sender: "user",
        content: latestUserMessage,
        createdAt: new Date(),
      },
    ],
  });

  return {
    ok: true,
    statusCode: 201,
    data: {
      item: conversation,
      conversation: mapConversation(conversation),
      handoff: {
        mode: "human",
        state: conversation.handoffState,
        conversationId: String(conversation._id),
        created: true,
      },
    },
  };
};

const listMyFeedback = async ({ userId, tenantId = "public" }) => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  const items = await Feedback.find({ tenantId: scopedTenantId, userId: String(userId) }).sort({
    createdAt: -1,
  });

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

const listMyConversations = async ({ userId, tenantId = "public" }) => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  const items = await Feedback.find({
    tenantId: scopedTenantId,
    userId: String(userId),
    channel: "assistant_handoff",
  }).sort({ updatedAt: -1 });

  return {
    ok: true,
    statusCode: 200,
    data: {
      items: items.map(mapConversation),
      total: items.length,
    },
  };
};

const listAdminFeedback = async ({ tenantId = "public" } = {}) => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  const items = await Feedback.find({ tenantId: scopedTenantId }).sort({ createdAt: -1 });

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

const addConversationMessage = async ({ feedbackId, sender, content, actorUserId, tenantId = "public" }) => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
  const msg = String(content || "").trim();
  if (!msg) {
    return {
      ok: false,
      statusCode: 400,
      message: "message must not be empty",
      code: "SUPPORT_MESSAGE_REQUIRED",
    };
  }
  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) {
    return {
      ok: false,
      statusCode: 404,
      message: "Conversation not found",
      code: "SUPPORT_CONVERSATION_NOT_FOUND",
    };
  }
  if (feedback.channel !== "assistant_handoff") {
    return {
      ok: false,
      statusCode: 400,
      message: "Conversation is not assistant handoff",
      code: "SUPPORT_CONVERSATION_INVALID_CHANNEL",
    };
  }
  if (String(feedback.tenantId || "public") !== scopedTenantId) {
    return {
      ok: false,
      statusCode: 403,
      message: "Forbidden",
      code: "SUPPORT_FORBIDDEN",
    };
  }
  if (sender === "user" && String(feedback.userId) !== String(actorUserId || "")) {
    return {
      ok: false,
      statusCode: 403,
      message: "Forbidden",
      code: "SUPPORT_FORBIDDEN",
    };
  }

  feedback.messages.push({
    sender: sender === "admin" ? "admin" : "user",
    content: msg,
    createdAt: new Date(),
  });

  if (sender === "admin") {
    feedback.status = "in_progress";
    feedback.handoffState = "human_active";
  } else if (feedback.status === "closed" || feedback.status === "resolved") {
    feedback.status = "open";
    feedback.handoffState = "waiting_human";
  }
  await feedback.save();
  return {
    ok: true,
    statusCode: 200,
    data: {
      item: feedback,
      conversation: mapConversation(feedback),
    },
  };
};

const updateFeedbackStatus = async ({ feedbackId, status, adminMessage, tenantId = "public" }) => {
  const scopedTenantId = normalizeTenantId(tenantId, "public");
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
  if (String(feedback.tenantId || "public") !== scopedTenantId) {
    return {
      ok: false,
      statusCode: 403,
      message: "Forbidden",
      code: "SUPPORT_FORBIDDEN",
    };
  }

  feedback.status = nextStatus;
  if (feedback.channel === "assistant_handoff") {
    feedback.handoffState = normalizeHandoffStateByStatus(nextStatus);
  }
  if (typeof adminMessage === "string" && adminMessage.trim()) {
    feedback.messages.push({
      sender: "admin",
      content: adminMessage.trim(),
      createdAt: new Date(),
    });
    if (feedback.channel === "assistant_handoff" && feedback.handoffState !== "closed") {
      feedback.handoffState = "human_active";
      if (feedback.status === "open") {
        feedback.status = "in_progress";
      }
    }
  }
  await feedback.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: feedback,
      feedback,
      conversation: feedback.channel === "assistant_handoff" ? mapConversation(feedback) : null,
    },
    legacy: {
      feedback: mapLegacyFeedback(feedback),
    },
  };
};

module.exports = {
  createFeedback,
  createOrOpenAssistantHandoff,
  listMyFeedback,
  listMyConversations,
  listAdminFeedback,
  addConversationMessage,
  updateFeedbackStatus,
};
