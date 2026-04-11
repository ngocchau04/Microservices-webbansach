const express = require("express");
const request = require("supertest");
const { createGatewayApp } = require("../../gateway/app");

describe("Gateway smoke test (phase 1)", () => {
  let gatewayApp;
  let legacyServer;

  beforeAll((done) => {
    const legacyApp = express();
    legacyApp.use(express.json());

    legacyApp.get("/search/top24", (req, res) => {
      res.status(200).json([{ _id: "book-smoke", title: "Smoke Book" }]);
    });

    legacyApp.post("/echo", (req, res) => {
      res.status(200).json({
        ok: true,
        payload: req.body,
        headers: {
          authorization: req.headers.authorization || null,
        },
      });
    });

    legacyServer = legacyApp.listen(0, () => {
      const { port } = legacyServer.address();
      const { app } = createGatewayApp({
        legacyServiceUrl: `http://127.0.0.1:${port}`,
      });

      gatewayApp = app;
      done();
    });
  });

  afterAll((done) => {
    legacyServer.close(done);
  });

  test("GET /health should return standardized success payload", async () => {
    const response = await request(gatewayApp).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
      })
    );
    expect(response.body.data).toEqual(
      expect.objectContaining({
        service: "api-gateway",
        status: "ok",
      })
    );
  });

  test("GET /search/top24 should be proxied to legacy service", async () => {
    const response = await request(gatewayApp).get("/search/top24");

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        _id: "book-smoke",
        title: "Smoke Book",
      })
    );
  });

  test("POST /echo should forward JSON body and authorization header", async () => {
    const response = await request(gatewayApp)
      .post("/echo")
      .set("Authorization", "Bearer smoke-token")
      .send({ sample: true });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        payload: { sample: true },
      })
    );
    expect(response.body.headers.authorization).toBe("Bearer smoke-token");
  });
});
