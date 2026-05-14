process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.SUPPORT_DB_NAME = "book_support_jest";

const mongoose = require("mongoose");

const { connectDatabase } = require("../src/config/database");
const Feedback = require("../src/models/Feedback");
const feedbackService = require("../src/services/feedbackService");

describe("support feedback service unit real", () => {
  const config = {
    notificationServiceUrl: "http://127.0.0.1:45999",
    notificationRequestTimeoutMs: 100,
    notificationRequired: false,
    jwtSecret: "support_secret",
  };

  beforeAll(async () => {
    await connectDatabase({
      mongoUri: process.env.MONGO_URI,
      dbName: process.env.SUPPORT_DB_NAME,
    });
  });

  beforeEach(async () => {
    await Feedback.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("createFeedback stores a real feedback document", async () => {
    const result = await feedbackService.createFeedback({
      user: { userId: "u1", email: "user@example.com" },
      payload: { subject: "Need support", message: "Please help", category: "order" },
      requestMeta: { userAgent: "jest", ipAddress: "127.0.0.1" },
      config,
      tenantId: "tenant_a",
    });

    expect(result.ok).toBe(true);
    const stored = await Feedback.findById(result.data.feedback._id).lean();
    expect(stored).toBeTruthy();
    expect(stored.tenantId).toBe("tenant_a");
    expect(stored.subject).toBe("Need support");
  });

  test("assistant handoff creates and reopens a tenant-scoped real conversation", async () => {
    const created = await feedbackService.createOrOpenAssistantHandoff({
      tenantId: "tenant_a",
      payload: {
        userId: "u2",
        userEmail: "u2@example.com",
        latestUserMessage: "toi can nhan vien ho tro",
      },
    });

    expect(created.ok).toBe(true);
    expect(created.data.handoff.created).toBe(true);

    const reopened = await feedbackService.createOrOpenAssistantHandoff({
      tenantId: "tenant_a",
      payload: {
        userId: "u2",
        latestUserMessage: "cho minh gap nhan vien",
      },
    });

    expect(reopened.ok).toBe(true);
    expect(reopened.data.handoff.created).toBe(false);
    expect(String(reopened.data.conversation._id)).toBe(String(created.data.conversation._id));
  });
});
