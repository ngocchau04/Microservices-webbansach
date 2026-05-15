const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

jest.mock("../src/services/notificationClient", () => ({
  sendSupportAckEmail: jest.fn(async () => ({ success: true })),
}));

const Feedback = require("../src/models/Feedback");
const feedbackService = require("../src/services/feedbackService");

describe("feedbackService", () => {
  let mongoServer;

  const config = {
    notificationServiceUrl: "http://localhost:4005",
    notificationRequestTimeoutMs: 1000,
    notificationRequired: false,
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await Feedback.deleteMany({});
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
    const createRes = await feedbackService.createFeedback({
      user: { userId: "u1", email: "user@example.com" },
      payload: { subject: "Need support", message: "Please help me with order", category: "order" },
      requestMeta: { userAgent: "jest", ipAddress: "127.0.0.1" },
      config,
    });
    const feedbackId = String(createRes.data.feedback._id);

    const listResult = await feedbackService.listMyFeedback({ userId: "u1" });
    expect(listResult.ok).toBe(true);
    expect(listResult.data.items.length).toBe(1);

    const updateResult = await feedbackService.updateFeedbackStatus({
      feedbackId,
      status: "in_progress",
      adminMessage: "We are checking this issue",
    });

    expect(updateResult.ok).toBe(true);
    expect(updateResult.data.feedback.status).toBe("in_progress");
  });

  test("createOrOpenAssistantHandoff creates conversation and appends message", async () => {
    const created = await feedbackService.createOrOpenAssistantHandoff({
      tenantId: "tenant_a",
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
      tenantId: "tenant_a",
      payload: {
        userId: "u2",
        latestUserMessage: "cho minh gap nhan vien",
      },
    });
    expect(reopened.ok).toBe(true);
    expect(reopened.data.handoff.created).toBe(false);
  });

  test("assistant handoff stays tenant scoped", async () => {
    const first = await feedbackService.createOrOpenAssistantHandoff({
      tenantId: "tenant_a",
      payload: {
        userId: "u5",
        latestUserMessage: "need human",
      },
    });
    const second = await feedbackService.createOrOpenAssistantHandoff({
      tenantId: "tenant_b",
      payload: {
        userId: "u5",
        latestUserMessage: "need human for tenant b",
      },
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.data.handoff.created).toBe(true);
    expect(second.data.conversation._id).not.toBe(first.data.conversation._id);
  });

  test("addConversationMessage from admin flips state to human_active", async () => {
    const created = await feedbackService.createOrOpenAssistantHandoff({
      payload: {
        userId: "u3",
        latestUserMessage: "need human",
      },
    });
    const feedbackId = String(created.data.conversation._id);
    const result = await feedbackService.addConversationMessage({
      feedbackId,
      sender: "admin",
      content: "Nhan vien dang ho tro ban",
      actorUserId: "admin_1",
    });
    expect(result.ok).toBe(true);
    expect(result.data.conversation.handoffState).toBe("human_active");
  });
});
