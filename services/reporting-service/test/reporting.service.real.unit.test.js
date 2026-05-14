process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.REPORTING_DB_NAME = "book_reporting_jest";

const http = require("http");
const mongoose = require("mongoose");

const { connectDatabase } = require("../src/config/database");
const ReportCache = require("../src/models/ReportCache");
const reportingService = require("../src/services/reportingService");

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
    items: [{ productId: "p1", title: "Book A", quantity: 4, price: 50000, image: "a.jpg" }],
  },
];

const createJsonServer = (handler) =>
  new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

describe("reporting service real unit", () => {
  let checkoutServer;
  let identityServer;
  let config;

  beforeAll(async () => {
    await connectDatabase({
      mongoUri: process.env.MONGO_URI,
      dbName: process.env.REPORTING_DB_NAME,
    });

    checkoutServer = await createJsonServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: { items: sampleOrders } }));
    });

    identityServer = await createJsonServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: { total: 12 } }));
    });

    config = {
      jwtSecret: "reporting_secret",
      internalServiceUserId: "reporting-service",
      checkoutServiceUrl: `http://127.0.0.1:${checkoutServer.address().port}`,
      identityServiceUrl: `http://127.0.0.1:${identityServer.address().port}`,
      checkoutRequestTimeoutMs: 1000,
      identityRequestTimeoutMs: 1000,
      dashboardCacheTtlSeconds: 60,
    };
  });

  beforeEach(async () => {
    await ReportCache.deleteMany({});
  });

  afterAll(async () => {
    await new Promise((resolve) => checkoutServer.close(resolve));
    await new Promise((resolve) => identityServer.close(resolve));
    await mongoose.disconnect();
  });

  test("getDashboardSummary returns real aggregated metrics and writes cache", async () => {
    const result = await reportingService.getDashboardSummary({ config });

    expect(result.ok).toBe(true);
    expect(result.data.totalOrders).toBe(2);
    expect(result.data.totalRevenue).toBe(300000);
    expect(result.data.customerAccountCount).toBe(12);

    const cached = await ReportCache.findOne({ key: "dashboard_summary" }).lean();
    expect(cached).toBeTruthy();
  });

  test("getDashboardRevenue and getDashboardTopProducts return real computed data", async () => {
    const revenue = await reportingService.getDashboardRevenue({
      period: "month",
      config,
    });
    const topProducts = await reportingService.getDashboardTopProducts({
      config,
      limit: 5,
      sortBy: "quantity",
    });

    expect(revenue.ok).toBe(true);
    expect(revenue.data.points.length).toBeGreaterThan(0);
    expect(topProducts.ok).toBe(true);
    expect(topProducts.data.items[0].soldQuantity).toBeGreaterThan(0);
  });
});
