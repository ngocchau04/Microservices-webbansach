process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.ASSISTANT_DB_NAME = "book_assistant_jest";
process.env.JWT_SECRET = "assistant_admin_chat_test_secret";
process.env.GEMINI_API_KEY = "";

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

const { connectDatabase } = require("../src/config/database");
const { createAssistantRoutes } = require("../src/routes/assistantRoutes");
const { tenantContextMiddleware } = require("../src/middleware/tenantContextMiddleware");

describe("chatbot admin copilot integration", () => {
  const tenantId = "tenant_admin_copilot";
  const config = {
    jwtSecret: process.env.JWT_SECRET,
    geminiApiKey: "",
    publicTenantId: "public",
    defaultTenantId: "public",
  };

  const adminToken = jwt.sign(
    {
      userId: "admin_1",
      email: "admin@example.com",
      role: "admin",
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

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("POST /chat returns admin copilot guidance when admin copilot context is enabled", async () => {
    const response = await request(buildApp())
      .post("/chat")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-tenant-id", tenantId)
      .send({
        message: "Bao cao nhanh ton kho va xu ly cho phieu nay",
        context: {
          supportMode: "admin_copilot",
          adminCopilot: {
            mode: "admin_copilot",
            ticketId: "ticket_1",
            supportStatus: "open",
            conversationCompact: "user: sach nay con hang khong\nuser: don chua giao",
            supportTags: ["San pham", "Giao hang"],
            escalationTitle: "Theo doi tiep",
            escalationLevel: "medium",
            inventorySummary: {
              outOfStock: 2,
              lowStock: 1,
              normalStock: 5,
              alerts: [{ title: "Sach X", status: "out", stock: 0 }],
            },
          },
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.fallback).toBe(false);
    expect(response.body.data.message).toMatch(/Tóm tắt:|Tom tat:/i);
    expect(response.body.data.message).toMatch(/Hướng xử lý:|Huong xu ly:/i);
    expect(response.body.data.graphReasoningInfo.adminCopilot).toBe(true);
  });
});
