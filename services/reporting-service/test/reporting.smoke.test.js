const request = require("supertest");
const { createApp } = require("../src/index");

describe("reporting-service smoke", () => {
  test("GET /health returns ok", async () => {
    const app = createApp();
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe("reporting-service");
  });
});
