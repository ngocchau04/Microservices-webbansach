process.env.NODE_ENV = "test";

const notificationService = require("../src/services/notificationService");

describe("notification service unit", () => {
  const config = {
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

  test("sendVerificationEmail returns mocked delivery when SMTP is not configured", async () => {
    const result = await notificationService.sendVerificationEmail({
      payload: {
        email: "demo@example.com",
        name: "Demo User",
        verificationCode: "123456",
      },
      config,
      idempotencyKey: "",
    });

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(202);
    expect(result.data.mocked).toBe(true);
    expect(result.data.messageId).toMatch(/^mock-/);
  });

  test("sendVerificationEmail deduplicates repeated idempotency key", async () => {
    const payload = {
      email: "demo@example.com",
      name: "Demo User",
      verificationCode: "123456",
    };

    const first = await notificationService.sendVerificationEmail({
      payload,
      config,
      idempotencyKey: "verify-demo-1",
    });
    const second = await notificationService.sendVerificationEmail({
      payload,
      config,
      idempotencyKey: "verify-demo-1",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.statusCode).toBe(200);
    expect(second.data.deduplicated).toBe(true);
    expect(second.data.messageId).toBe(first.data.messageId);
  });
});
