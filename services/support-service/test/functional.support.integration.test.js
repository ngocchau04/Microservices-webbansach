process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.SUPPORT_DB_NAME = "book_support_jest";

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

const { connectDatabase } = require("../src/config/database");
const Feedback = require("../src/models/Feedback");
const { createSupportRoutes } = require("../src/routes/supportRoutes");

describe("functional support integration", () => {
  const config = {
    jwtSecret: "support_integration_secret",
    notificationServiceUrl: "http://127.0.0.1:45999",
    notificationRequestTimeoutMs: 100,
    notificationRequired: false,
    internalApiKey: "support_internal_key",
    defaultTenantId: "public",
  };

  const userToken = jwt.sign(
    { userId: "user_1", role: "user", email: "user@example.com" },
    config.jwtSecret,
    { expiresIn: "1h" }
  );
  const adminToken = jwt.sign(
    { userId: "admin_1", role: "admin", email: "admin@example.com" },
    config.jwtSecret,
    { expiresIn: "1h" }
  );

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.locals.config = config;
    app.use(createSupportRoutes(config));
    return app;
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

  test("feedback flow works through the real API", async () => {
    const submit = await request(buildApp())
      .post("/feedback")
      .set("Authorization", `Bearer ${userToken}`)
      .set("x-tenant-id", "tenant_a")
      .send({ subject: "Need support", message: "Please help", category: "order" })
      .expect(201);

    expect(submit.body.success).toBe(true);

    const list = await request(buildApp())
      .get("/feedback/me")
      .set("Authorization", `Bearer ${userToken}`)
      .set("x-tenant-id", "tenant_a")
      .expect(200);

    expect(list.body.success).toBe(true);
    expect(list.body.data.items).toHaveLength(1);
  });

  test("internal handoff and admin status update work through the real API", async () => {
    const handoff = await request(buildApp())
      .post("/internal/handoffs")
      .set("x-internal-api-key", config.internalApiKey)
      .set("x-tenant-id", "tenant_a")
      .send({
        userId: "user_2",
        userEmail: "user2@example.com",
        latestUserMessage: "toi can gap nhan vien",
      })
      .expect(201);

    expect(handoff.body.success).toBe(true);
    const feedbackId = handoff.body.data.conversation._id;

    const update = await request(buildApp())
      .patch(`/admin/feedback/${feedbackId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-tenant-id", "tenant_a")
      .send({ status: "in_progress", message: "Nhan vien dang kiem tra" })
      .expect(200);

    expect(update.body.success).toBe(true);
    expect(update.body.data.feedback.status).toBe("in_progress");
  });
});
