process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.ASSISTANT_DB_NAME = "book_assistant_jest";
process.env.JWT_SECRET = "assistant_test_secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { app } = require("../src/index");
const { connectDatabase } = require("../src/config/database");
const { CorpusDocument } = require("../src/models/CorpusDocument");
const { normalize } = require("../src/services/retrievalService");

describe("assistant-service smoke", () => {
  const tenantId = "tenant_smoke";
  const tenantToken = jwt.sign(
    {
      userId: "u_tenant",
      email: "tenant@example.com",
      role: "user",
      tenantId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  beforeAll(async () => {
    await connectDatabase({
      mongoUri: process.env.MONGO_URI,
      dbName: process.env.ASSISTANT_DB_NAME,
    });
  });

  beforeEach(async () => {
    await CorpusDocument.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("GET /health returns ok", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe("assistant-service");
  });

  test("GET /suggestions returns list", async () => {
    const response = await request(app).get("/suggestions").expect(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    expect(response.body.data.suggestions.length).toBeGreaterThan(0);
  });

  test("POST /chat returns grounded FAQ answer", async () => {
    await CorpusDocument.create({
      tenantId,
      sourceType: "faq",
      refId: "jest-faq",
      title: "Jest FAQ",
      body: "This is the fixed answer for jest testing.",
      keywords: ["jest", "test"],
    });

    const response = await request(app)
      .post("/chat")
      .set("Authorization", `Bearer ${tenantToken}`)
      .set("x-tenant-id", tenantId)
      .send({ message: "jest test pipeline" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.fallback).toBe(false);
    expect(response.body.data.message).toContain("fixed answer");
    expect(response.body.data.sources.length).toBeGreaterThan(0);
  });

  test("POST /chat rejects when tenant header is missing", async () => {
    const response = await request(app)
      .post("/chat")
      .send({ message: "hello" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("TENANT_REQUIRED");
  });

  test("POST /chat rejects anonymous non-public tenant", async () => {
    const response = await request(app)
      .post("/chat")
      .set("x-tenant-id", "tenant_a")
      .send({ message: "hello" })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("TENANT_FORBIDDEN");
  });

  test("POST /chat rejects invalid tenant header format", async () => {
    const response = await request(app)
      .post("/chat")
      .set("x-tenant-id", "tenant invalid !")
      .send({ message: "hello" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("TENANT_INVALID");
  });

  test("POST /chat rejects tenant mismatch against token claim", async () => {
    const response = await request(app)
      .post("/chat")
      .set("Authorization", `Bearer ${tenantToken}`)
      .set("x-tenant-id", "tenant_other")
      .send({ message: "hello" })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("AUTH_TENANT_MISMATCH");
  });

  test("POST /reindex rejects when tenant header is missing", async () => {
    const response = await request(app).post("/reindex").expect(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("TENANT_REQUIRED");
  });

  test("POST /reindex rejects invalid tenant header format", async () => {
    const response = await request(app)
      .post("/reindex")
      .set("x-tenant-id", "invalid tenant !")
      .expect(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("TENANT_INVALID");
  });

  test("POST /chat matches query without diacritics against Vietnamese corpus", async () => {
    const title = "Câu hỏi thử";
    const body = "Trả lời mẫu cho kiểm thử nghiệm.";
    await CorpusDocument.create({
      tenantId,
      sourceType: "faq",
      refId: "vi-faq",
      title,
      body,
      keywords: ["thử"],
      normalizedText: normalize(`${title} ${body} thử`),
    });

    const response = await request(app)
      .post("/chat")
      .set("Authorization", `Bearer ${tenantToken}`)
      .set("x-tenant-id", tenantId)
      .send({ message: "cau hoi thu" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.fallback).toBe(false);
    expect(response.body.data.message).toContain("Trả lời mẫu");
  });
});
