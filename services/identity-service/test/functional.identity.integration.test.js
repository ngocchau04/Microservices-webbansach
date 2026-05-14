process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "identity_integration_test_secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.IDENTITY_DB_NAME = "book_identity_jest";

const mongoose = require("mongoose");
const request = require("supertest");

const { createApp } = require("../src/index");
const { connectDatabase } = require("../src/config/database");
const User = require("../src/models/User");

describe("functional identity integration", () => {
  const app = createApp();

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase({
        mongoUri: process.env.MONGO_URI,
        dbName: process.env.IDENTITY_DB_NAME,
      });
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("register -> login -> refresh-token -> me works through the real HTTP flow", async () => {
    const registerPayload = {
      name: "Functional User",
      sdt: "0900000000",
      email: "functional@example.com",
      password: "123456",
    };

    const registerRes = await request(app).post("/register").send(registerPayload).expect(200);
    expect(registerRes.body.success).toBe(true);

    const loginRes = await request(app)
      .post("/login")
      .send({ username: registerPayload.email, password: registerPayload.password })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    const loginToken = loginRes.body.token || loginRes.body.data.token;
    expect(loginToken).toBeTruthy();

    const refreshRes = await request(app)
      .post("/refresh-token")
      .send({ token: loginToken })
      .expect(200);

    expect(refreshRes.body.success).toBe(true);
    const refreshedToken = refreshRes.body.token || refreshRes.body.data.token;
    expect(refreshedToken).toBeTruthy();

    const meRes = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${refreshedToken}`)
      .expect(200);

    expect(meRes.body.success).toBe(true);
    expect(meRes.body.user?.email || meRes.body.data.user.email).toBe(registerPayload.email);
  });

  test("favorite endpoints add and remove favorites through the real API", async () => {
    const user = await User.create({
      tenantId: "public",
      email: "favorite-flow@example.com",
      name: "Favorite Flow User",
      password: "123456",
      sdt: "",
      role: "user",
      status: "active",
      isActive: true,
      authProvider: "local",
      favorite: [],
    });

    const loginRes = await request(app)
      .post("/login")
      .send({ username: user.email, password: user.password })
      .expect(200);

    const token = loginRes.body.token || loginRes.body.data.token;

    const addRes = await request(app)
      .post("/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: "book_favorite_1" })
      .expect(200);

    expect(addRes.body.success).toBe(true);
    expect(addRes.body.data.items).toEqual([{ product: "book_favorite_1" }]);

    const listRes = await request(app)
      .get("/favorites")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.items).toEqual([{ product: "book_favorite_1" }]);

    const removeRes = await request(app)
      .delete("/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: "book_favorite_1" })
      .expect(200);

    expect(removeRes.body.success).toBe(true);
    expect(removeRes.body.data.items).toEqual([]);
  });
});
