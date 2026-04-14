const savedItems = [];

const clone = (value) => JSON.parse(JSON.stringify(value));

const attachDocMethods = (doc) => {
  doc.save = async () => doc;
  return doc;
};

jest.mock("../src/models/Feedback", () => ({
  create: jest.fn(async (payload) => {
    const item = attachDocMethods({
      _id: `fb_${savedItems.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...clone(payload),
    });
    savedItems.push(item);
    return item;
  }),
  find: jest.fn((query = {}) => ({
    sort: jest.fn(async () =>
      savedItems.filter((item) =>
        Object.entries(query).every(([key, value]) => String(item[key]) === String(value))
      )
    ),
  })),
  findById: jest.fn(async (id) => savedItems.find((item) => String(item._id) === String(id)) || null),
  findOne: jest.fn((query = {}) => ({
    sort: jest.fn(async () =>
      savedItems.find((item) =>
        Object.entries(query).every(([key, value]) => {
          if (value && typeof value === "object" && Array.isArray(value.$in)) {
            return value.$in.map(String).includes(String(item[key]));
          }
          return String(item[key]) === String(value);
        })
      ) || null
    ),
  })),
}));

jest.mock("../src/services/notificationClient", () => ({
  sendSupportAckEmail: jest.fn(async () => ({ success: true })),
}));

const feedbackService = require("../src/services/feedbackService");

describe("feedbackService", () => {
  const config = {
    notificationServiceUrl: "http://localhost:4005",
    notificationRequestTimeoutMs: 1000,
    notificationRequired: false,
  };

  beforeEach(() => {
    savedItems.length = 0;
  });

  test("createFeedback creates feedback item", async () => {
    const result = await feedbackService.createFeedback({
      user: { userId: "u1", email: "user@example.com" },
      payload: { subject: "Need support", message: "Please help me with order", category: "order" },
      requestMeta: { userAgent: "jest", ipAddress: "127.0.0.1" },
      config,
    });

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(201);
    expect(result.data.feedback.subject).toBe("Need support");
  });

  test("list and update status work", async () => {
    await feedbackService.createFeedback({
      user: { userId: "u1", email: "user@example.com" },
      payload: { subject: "Need support", message: "Please help me with order", category: "order" },
      requestMeta: { userAgent: "jest", ipAddress: "127.0.0.1" },
      config,
    });

    const listResult = await feedbackService.listMyFeedback({ userId: "u1" });
    expect(listResult.ok).toBe(true);
    expect(listResult.data.items.length).toBe(1);

    const updateResult = await feedbackService.updateFeedbackStatus({
      feedbackId: "fb_1",
      status: "in_progress",
      adminMessage: "We are checking this issue",
    });

    expect(updateResult.ok).toBe(true);
    expect(updateResult.data.feedback.status).toBe("in_progress");
  });

  test("createOrOpenAssistantHandoff creates conversation and appends message", async () => {
    const created = await feedbackService.createOrOpenAssistantHandoff({
      payload: {
        userId: "u2",
        userEmail: "u2@example.com",
        sessionId: "sess_1",
        latestUserMessage: "toi can nhan vien ho tro",
        issueSummary: "handoff",
        detectedIntent: "human_support",
        recentMessages: [{ role: "user", text: "help me" }],
      },
    });
    expect(created.ok).toBe(true);
    expect(created.data.handoff.mode).toBe("human");
    expect(created.data.conversation.channel).toBe("assistant_handoff");

    const reopened = await feedbackService.createOrOpenAssistantHandoff({
      payload: {
        userId: "u2",
        latestUserMessage: "cho minh gap nhan vien",
      },
    });
    expect(reopened.ok).toBe(true);
    expect(reopened.data.handoff.created).toBe(false);
  });

  test("addConversationMessage from admin flips state to human_active", async () => {
    await feedbackService.createOrOpenAssistantHandoff({
      payload: {
        userId: "u3",
        latestUserMessage: "need human",
      },
    });
    const result = await feedbackService.addConversationMessage({
      feedbackId: "fb_1",
      sender: "admin",
      content: "Nhan vien dang ho tro ban",
      actorUserId: "admin_1",
    });
    expect(result.ok).toBe(true);
    expect(result.data.conversation.handoffState).toBe("human_active");
  });
});
