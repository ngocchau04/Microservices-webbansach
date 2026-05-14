process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "media_integration_secret";

const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const { createMediaRoutes } = require("../src/routes/mediaRoutes");

describe("functional media integration", () => {
  const config = {
    jwtSecret: process.env.JWT_SECRET,
    maxFileSizeMb: 5,
    allowedImageMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    cloudinaryFolder: "bookstore/uploads",
  };

  const userToken = jwt.sign(
    { userId: "user_1", role: "user", email: "user@example.com" },
    config.jwtSecret,
    { expiresIn: "1h" }
  );
  const adminToken = jwt.sign(
    { userId: "admin_1", role: "admin", email: "admin@example.com" },
    config.jwtSecret,
    { expiresIn: "1h" }
  );

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.locals.config = config;
    app.use(createMediaRoutes(config));
    return app;
  };

  test("GET /health returns ok", async () => {
    const response = await request(buildApp()).get("/health").expect(200);
    expect(response.body.success).toBe(true);
  });

  test("POST /images requires authentication and admin role", async () => {
    await request(buildApp()).post("/images").expect(401);

    await request(buildApp())
      .post("/images")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });

  test("POST /images returns validation error for admin when no file is uploaded", async () => {
    const response = await request(buildApp())
      .post("/images")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("MEDIA_FILE_REQUIRED");
  });
});
