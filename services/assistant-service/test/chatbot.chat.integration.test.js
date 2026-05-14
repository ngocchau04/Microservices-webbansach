process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.ASSISTANT_DB_NAME = "book_assistant_jest";
process.env.JWT_SECRET = "assistant_test_secret";
process.env.GEMINI_API_KEY = "";

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

const { connectDatabase } = require("../src/config/database");
const { createAssistantRoutes } = require("../src/routes/assistantRoutes");
const { tenantContextMiddleware } = require("../src/middleware/tenantContextMiddleware");
const { CorpusDocument } = require("../src/models/CorpusDocument");
const { normalize } = require("../src/services/retrievalService");

describe("chatbot chat integration", () => {
  const tenantId = "tenant_chatbot_real";
  const config = {
    jwtSecret: process.env.JWT_SECRET,
    geminiApiKey: "",
    publicTenantId: "public",
    defaultTenantId: "public",
  };

  const userToken = jwt.sign(
    {
      userId: "user_1",
      email: "user@example.com",
      role: "user",
      tenantId,
    },
    config.jwtSecret,
    { expiresIn: "1h" }
  );

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.locals.config = config;
    app.use(tenantContextMiddleware(config));
    app.use(createAssistantRoutes(config));
    return app;
  };

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

  test("POST /chat returns a grounded FAQ answer from the tenant corpus without mocking the chatbot flow", async () => {
    await CorpusDocument.create([
      {
        tenantId,
        sourceType: "faq",
        refId: "shipping",
        title: "Chinh sach van chuyen",
        body: "Don hang tai tenant chatbot duoc giao trong 24 gio o noi thanh.",
        keywords: ["van chuyen", "giao hang", "shipping"],
        normalizedText: normalize(
          "Chinh sach van chuyen Don hang tai tenant chatbot duoc giao trong 24 gio o noi thanh."
        ),
      },
      {
        tenantId: "tenant_other_real",
        sourceType: "faq",
        refId: "shipping",
        title: "Chinh sach van chuyen tenant khac",
        body: "Noi dung nay khong duoc lo ra ngoai tenant khac.",
        keywords: ["van chuyen", "shipping"],
        normalizedText: normalize(
          "Chinh sach van chuyen tenant khac Noi dung nay khong duoc lo ra ngoai tenant khac."
        ),
      },
    ]);

    const response = await request(buildApp())
      .post("/chat")
      .set("Authorization", `Bearer ${userToken}`)
      .set("x-tenant-id", tenantId)
      .send({
        message: "chinh sach van chuyen nhu the nao",
        context: {
          sourcePage: "checkout",
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.fallback).toBe(false);
    expect(response.body.data.message).toContain("24 gio");
    expect(response.body.data.sources.length).toBeGreaterThan(0);
    expect(response.body.data.sources[0].id).toBe("shipping");
    expect(response.body.data.message).not.toContain("tenant khac");
  });

  test("GET /suggestions returns the clean chatbot suggestion list from the real route", async () => {
    const response = await request(buildApp()).get("/suggestions").expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    expect(response.body.data.suggestions.length).toBeGreaterThan(0);
    expect(response.body.data.suggestions.some((item) => String(item).includes("MongoDB"))).toBe(true);
  });
});
