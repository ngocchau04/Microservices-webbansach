process.env.NODE_ENV = "test";

const express = require("express");
const request = require("supertest");

const { createNotificationRoutes } = require("../src/routes/notificationRoutes");

describe("functional notification integration", () => {
  const config = {
    jwtSecret: "notification_secret",
    emailFrom: "no-reply@bookstore.local",
    smtpUser: "",
    smtpPassword: "",
    smtpService: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpSecure: false,
    emailRetryAttempts: 0,
    emailRetryDelayMs: 0,
    idempotencyTtlMs: 60000,
    allowMockEmail: true,
  };

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.locals.config = config;
    app.use(createNotificationRoutes(config));
    return app;
  };

  test("POST /send-verification-email works through the real route and supports idempotency", async () => {
    const payload = {
      email: "demo@example.com",
      name: "Demo User",
      verificationCode: "123456",
      idempotencyKey: "verify-route-1",
    };

    const first = await request(buildApp()).post("/send-verification-email").send(payload).expect(202);
    const second = await request(buildApp()).post("/send-verification-email").send(payload).expect(200);

    expect(first.body.success).toBe(true);
    expect(second.body.success).toBe(true);
    expect(second.body.data.deduplicated).toBe(true);
    expect(second.body.data.messageId).toBe(first.body.data.messageId);
  });

  test("POST /send-support-email validates required payload", async () => {
    const response = await request(buildApp())
      .post("/send-support-email")
      .send({ email: "demo@example.com" })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
