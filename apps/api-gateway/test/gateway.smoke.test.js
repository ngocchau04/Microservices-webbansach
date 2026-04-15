const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.PORT = "8080";
process.env.IDENTITY_SERVICE_URL = "http://identity-service:4001";
process.env.CATALOG_SERVICE_URL = "http://catalog-service:4002";
process.env.CHECKOUT_SERVICE_URL = "http://checkout-service:4003";
process.env.MEDIA_SERVICE_URL = "http://media-service:4004";
process.env.NOTIFICATION_SERVICE_URL = "http://notification-service:4005";
process.env.REPORTING_SERVICE_URL = "http://reporting-service:4006";
process.env.SUPPORT_SERVICE_URL = "http://support-service:4007";
process.env.ASSISTANT_SERVICE_URL = "http://assistant-service:4008";
process.env.DEFAULT_TENANT_ID = "public";
process.env.PUBLIC_TENANT_ID = "public";
process.env.JWT_SECRET = "gateway_test_secret";

const mockProxyRequest = jest.fn(async ({ res, upstreamPath, upstreamBaseUrl }) => {
  return res.status(200).json({
    success: true,
    data: {
      upstreamPath,
      upstreamBaseUrl,
    },
  });
});

jest.mock("../src/services/proxyService", () => ({
  proxyRequest: (...args) => mockProxyRequest(...args),
}));

const { app } = require("../src/index");

describe("api-gateway smoke", () => {
  const tenantAToken = jwt.sign(
    { userId: "u1", role: "user", email: "u1@example.com", tenantId: "tenant_a" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  beforeEach(() => {
    mockProxyRequest.mockClear();
  });

  test("GET /health returns ok", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe("api-gateway");
    expect(response.body.data.upstreams.assistant).toBe("http://assistant-service:4008");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  test("GET /ready returns gateway edge-proxy payload", async () => {
    const response = await request(app).get("/ready").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.ready).toBe(true);
    expect(response.body.data.role).toBe("edge-proxy");
    expect(response.body.data.upstreams.assistant).toBe("http://assistant-service:4008");
  });

  test("rewrites /api/auth/login to identity /login", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "demo@example.com", password: "123456" })
      .expect(200);

    expect(mockProxyRequest).toHaveBeenCalledTimes(1);
    expect(response.body.data.upstreamPath).toBe("/login");
    expect(response.body.data.upstreamBaseUrl).toBe("http://identity-service:4001");
  });

  test("rewrites /api/catalog/products to catalog /products", async () => {
    const response = await request(app).get("/api/catalog/products?page=1&limit=12").expect(200);

    expect(mockProxyRequest).toHaveBeenCalledTimes(1);
    expect(response.body.data.upstreamPath).toBe("/products?page=1&limit=12");
    expect(response.body.data.upstreamBaseUrl).toBe("http://catalog-service:4002");
  });

  test("rewrites /api/checkout/orders to checkout /orders", async () => {
    const response = await request(app).get("/api/checkout/orders?status=pending").expect(200);

    expect(mockProxyRequest).toHaveBeenCalledTimes(1);
    expect(response.body.data.upstreamPath).toBe("/orders?status=pending");
    expect(response.body.data.upstreamBaseUrl).toBe("http://checkout-service:4003");
  });

  test("rewrites /api/assistant/chat to assistant /chat", async () => {
    const response = await request(app)
      .post("/api/assistant/chat")
      .send({ message: "hello" })
      .expect(200);

    expect(mockProxyRequest).toHaveBeenCalledTimes(1);
    expect(response.body.data.upstreamPath).toBe("/chat");
    expect(response.body.data.upstreamBaseUrl).toBe("http://assistant-service:4008");
    const [{ req: proxiedReq }] = mockProxyRequest.mock.calls[0];
    expect(proxiedReq.headers["x-tenant-id"]).toBe("public");
  });

  test("binds assistant tenant to JWT claim", async () => {
    await request(app)
      .post("/api/assistant/chat")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({ message: "hello" })
      .expect(200);

    expect(mockProxyRequest).toHaveBeenCalledTimes(1);
    const [{ req: proxiedReq }] = mockProxyRequest.mock.calls[0];
    expect(proxiedReq.headers["x-tenant-id"]).toBe("tenant_a");
  });

  test("rejects spoofed assistant tenant header when JWT tenant mismatches", async () => {
    await request(app)
      .post("/api/assistant/chat")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .set("x-tenant-id", "tenant_b")
      .send({ message: "hello" })
      .expect(403);

    expect(mockProxyRequest).toHaveBeenCalledTimes(0);
  });

  test("rejects non-public anonymous assistant tenant", async () => {
    await request(app)
      .post("/api/assistant/chat")
      .set("x-tenant-id", "tenant_a")
      .send({ message: "hello" })
      .expect(403);

    expect(mockProxyRequest).toHaveBeenCalledTimes(0);
  });

  test("rejects assistant reindex when tenant header is missing", async () => {
    await request(app).post("/api/assistant/reindex").expect(400);
    expect(mockProxyRequest).toHaveBeenCalledTimes(0);
  });

  test("rewrites /api/assistant/suggestions to assistant /suggestions with query", async () => {
    const response = await request(app).get("/api/assistant/suggestions?q=ship").expect(200);

    expect(mockProxyRequest).toHaveBeenCalledTimes(1);
    expect(response.body.data.upstreamPath).toBe("/suggestions?q=ship");
    expect(response.body.data.upstreamBaseUrl).toBe("http://assistant-service:4008");
  });

  test("rewrites /api/assistant/ready to assistant /ready", async () => {
    const response = await request(app).get("/api/assistant/ready").expect(200);

    expect(mockProxyRequest).toHaveBeenCalledTimes(1);
    expect(response.body.data.upstreamPath).toBe("/ready");
    expect(response.body.data.upstreamBaseUrl).toBe("http://assistant-service:4008");
  });

  test("rewrites /api/reporting/dashboard/summary to reporting /dashboard/summary", async () => {
    const response = await request(app).get("/api/reporting/dashboard/summary").expect(200);

    expect(mockProxyRequest).toHaveBeenCalledTimes(1);
    expect(response.body.data.upstreamPath).toBe("/dashboard/summary");
    expect(response.body.data.upstreamBaseUrl).toBe("http://reporting-service:4006");
  });

  test("rewrites /api/catalog/ready to catalog /ready", async () => {
    const response = await request(app).get("/api/catalog/ready").expect(200);

    expect(mockProxyRequest).toHaveBeenCalledTimes(1);
    expect(response.body.data.upstreamPath).toBe("/ready");
    expect(response.body.data.upstreamBaseUrl).toBe("http://catalog-service:4002");
  });

  test("unknown /api route returns GATEWAY_ROUTE_UNMAPPED", async () => {
    const response = await request(app).get("/api/unknown/feature").expect(404);

    expect(mockProxyRequest).not.toHaveBeenCalled();
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("GATEWAY_ROUTE_UNMAPPED");
  });

  test("unmapped /api/auth path returns GATEWAY_ROUTE_UNMAPPED", async () => {
    const response = await request(app).get("/api/auth/not-a-mapped-route").expect(404);

    expect(mockProxyRequest).not.toHaveBeenCalled();
    expect(response.body.code).toBe("GATEWAY_ROUTE_UNMAPPED");
  });

  test("unknown non-api route returns GATEWAY_ROUTE_NOT_FOUND", async () => {
    const response = await request(app).get("/unknown").expect(404);

    expect(mockProxyRequest).not.toHaveBeenCalled();
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("GATEWAY_ROUTE_NOT_FOUND");
  });
});
