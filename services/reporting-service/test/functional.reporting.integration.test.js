process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.REPORTING_DB_NAME = "book_reporting_jest";

const express = require("express");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

const { connectDatabase } = require("../src/config/database");
const ReportCache = require("../src/models/ReportCache");
const { createReportingRoutes } = require("../src/routes/reportingRoutes");

const sampleOrders = [
  {
    _id: "o1",
    createdAt: "2026-01-10T09:00:00.000Z",
    orderStatus: "pending",
    totals: { total: 100000 },
    items: [{ productId: "p1", title: "Book A", quantity: 2, price: 30000, image: "a.jpg" }],
  },
  {
    _id: "o2",
    createdAt: "2026-02-12T09:00:00.000Z",
    orderStatus: "completed",
    totals: { total: 200000 },
    items: [{ productId: "p2", title: "Book B", quantity: 1, price: 200000, image: "b.jpg" }],
  },
];

const createJsonServer = (handler) =>
  new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

describe("functional reporting integration", () => {
  let checkoutServer;
  let identityServer;
  let config;
  let adminToken;
  let userToken;

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.locals.config = config;
    app.use(createReportingRoutes(config));
    return app;
  };

  beforeAll(async () => {
    await connectDatabase({
      mongoUri: process.env.MONGO_URI,
      dbName: process.env.REPORTING_DB_NAME,
    });

    checkoutServer = await createJsonServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: { items: sampleOrders } }));
    });

    identityServer = await createJsonServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: { total: 12 } }));
    });

    config = {
      jwtSecret: "reporting_integration_secret",
      internalServiceUserId: "reporting-service",
      checkoutServiceUrl: `http://127.0.0.1:${checkoutServer.address().port}`,
      identityServiceUrl: `http://127.0.0.1:${identityServer.address().port}`,
      checkoutRequestTimeoutMs: 1000,
      identityRequestTimeoutMs: 1000,
      dashboardCacheTtlSeconds: 60,
    };

    adminToken = jwt.sign(
      { userId: "admin_1", email: "admin@example.com", role: "admin" },
      config.jwtSecret,
      { expiresIn: "1h" }
    );
    userToken = jwt.sign(
      { userId: "user_1", email: "user@example.com", role: "user" },
      config.jwtSecret,
      { expiresIn: "1h" }
    );
  });

  beforeEach(async () => {
    await ReportCache.deleteMany({});
  });

  afterAll(async () => {
    await new Promise((resolve) => checkoutServer.close(resolve));
    await new Promise((resolve) => identityServer.close(resolve));
    await mongoose.disconnect();
  });

  test("dashboard summary and revenue endpoints work through the real API for admin", async () => {
    const summary = await request(buildApp())
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(summary.body.success).toBe(true);
    expect(summary.body.data.totalRevenue).toBe(300000);

    const revenue = await request(buildApp())
      .get("/dashboard/revenue")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ period: "month" })
      .expect(200);

    expect(revenue.body.success).toBe(true);
    expect(Array.isArray(revenue.body.data.points)).toBe(true);
  });

  test("dashboard endpoints reject non-admin access", async () => {
    await request(buildApp())
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });
});
