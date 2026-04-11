const request = require("supertest");
const { createApp } = require("../src/index");

describe("notification-service smoke", () => {
  const app = createApp();

  test("GET /health returns ok", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe("notification-service");
  });

  test("POST /send-verification-email supports idempotency key", async () => {
    const payload = {
      email: "demo@example.com",
      name: "Demo User",
      verificationCode: "123456",
      idempotencyKey: "verify-demo-1",
    };

    const firstResponse = await request(app).post("/send-verification-email").send(payload).expect(202);
    expect(firstResponse.body.success).toBe(true);
    expect(firstResponse.body.data.messageId).toBeDefined();

    const secondResponse = await request(app).post("/send-verification-email").send(payload).expect(200);
    expect(secondResponse.body.success).toBe(true);
    expect(secondResponse.body.data.deduplicated).toBe(true);
    expect(secondResponse.body.data.messageId).toBe(firstResponse.body.data.messageId);
  });
});
