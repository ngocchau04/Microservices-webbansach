process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.ASSISTANT_DB_NAME = "book_assistant_jest";
process.env.JWT_SECRET = "assistant_handoff_test_secret";
process.env.GEMINI_API_KEY = "";

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

const { connectDatabase } = require("../src/config/database");
const { createAssistantRoutes } = require("../src/routes/assistantRoutes");
const { tenantContextMiddleware } = require("../src/middleware/tenantContextMiddleware");

const supportDb = require("../../support-service/src/config/database");
const Feedback = require("../../support-service/src/models/Feedback");
const { createSupportRoutes } = require("../../support-service/src/routes/supportRoutes");

describe("chatbot handoff integration", () => {
  const tenantId = "tenant_chatbot_handoff";
  const supportConfig = {
    jwtSecret: process.env.JWT_SECRET,
    notificationServiceUrl: "http://127.0.0.1:45999",
    notificationRequestTimeoutMs: 100,
    notificationRequired: false,
    internalApiKey: "support_internal_key",
    defaultTenantId: "public",
  };

  let supportServer;
  let assistantConfig;

  const userToken = jwt.sign(
    {
      userId: "user_handoff_1",
      email: "handoff@example.com",
      role: "user",
      tenantId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const buildAssistantApp = () => {
    const app = express();
    app.use(express.json());
    app.locals.config = assistantConfig;
    app.use(tenantContextMiddleware(assistantConfig));
    app.use(createAssistantRoutes(assistantConfig));
    return app;
  };

  beforeAll(async () => {
    await connectDatabase({
      mongoUri: process.env.MONGO_URI,
      dbName: process.env.ASSISTANT_DB_NAME,
    });

    await supportDb.connectDatabase({
      mongoUri: process.env.MONGO_URI,
      dbName: "book_support_jest",
    });

    const supportApp = express();
    supportApp.use(express.json());
    supportApp.locals.config = supportConfig;
    supportApp.use(createSupportRoutes(supportConfig));

    supportServer = await new Promise((resolve, reject) => {
      const server = supportApp.listen(0, "127.0.0.1", () => resolve(server));
      server.on("error", reject);
    });

    assistantConfig = {
      jwtSecret: process.env.JWT_SECRET,
      geminiApiKey: "",
      publicTenantId: "public",
      defaultTenantId: "public",
      supportServiceUrl: `http://127.0.0.1:${supportServer.address().port}`,
      supportInternalApiKey: supportConfig.internalApiKey,
    };
  });

  beforeEach(async () => {
    await Feedback.deleteMany({});
  });

  afterAll(async () => {
    if (supportServer) {
      await new Promise((resolve) => supportServer.close(resolve));
    }
    await mongoose.disconnect();
    const { createRequire } = require("node:module");
    const supportRequire = createRequire(require.resolve("../../support-service/package.json"));
    const supportMongoose = supportRequire("mongoose");
    await supportMongoose.disconnect();
  });

  test("POST /chat creates a real support handoff conversation when user asks for human support", async () => {
    const response = await request(buildAssistantApp())
      .post("/chat")
      .set("Authorization", `Bearer ${userToken}`)
      .set("x-tenant-id", tenantId)
      .send({
        message: "toi can nhan vien ho tro ngay bay gio",
        context: {
          sessionId: "sess_handoff_1",
          recentMessages: [{ role: "user", text: "toi can gap shop" }],
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.handoff.mode).toBe("human");
    expect(response.body.data.handoff.conversationId).toBeTruthy();

    const conversation = await Feedback.findById(response.body.data.handoff.conversationId).lean();
    expect(conversation).toBeTruthy();
    expect(conversation.tenantId).toBe(tenantId);
    expect(conversation.channel).toBe("assistant_handoff");
    expect(conversation.handoffState).toBe("waiting_human");
    expect(conversation.messages.some((item) => String(item.content).includes("nhan vien"))).toBe(true);
  });
});
