process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "identity_admin_integration_secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.IDENTITY_DB_NAME = "book_identity_jest";

const mongoose = require("mongoose");
const request = require("supertest");

const { createApp } = require("../src/index");
const { connectDatabase } = require("../src/config/database");
const User = require("../src/models/User");

describe("functional identity admin integration", () => {
  const app = createApp();
  let adminToken;
  let user;

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

    await User.create({
      tenantId: "public",
      email: "admin@bookstore.local",
      name: "Bookstore Admin",
      password: "Admin@123",
      sdt: "0900000001",
      role: "admin",
      status: "active",
      isActive: true,
      authProvider: "local",
    });

    user = await User.create({
      tenantId: "public",
      email: "customer@example.com",
      name: "Customer User",
      password: "123456",
      sdt: "0900000002",
      role: "user",
      status: "active",
      isActive: true,
      authProvider: "local",
    });

    const adminLogin = await request(app)
      .post("/login")
      .send({ username: "admin@bookstore.local", password: "Admin@123" })
      .expect(200);

    adminToken = adminLogin.body.token || adminLogin.body.data.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("admin can list and count customers", async () => {
    const listRes = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.users).toHaveLength(1);
    expect(listRes.body.data.users[0].email).toBe("customer@example.com");

    const countRes = await request(app)
      .get("/users/count")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(countRes.body.success).toBe(true);
    expect(countRes.body.data.total).toBe(1);
  });

  test("admin can update user status and profile", async () => {
    const statusRes = await request(app)
      .patch(`/users/${user._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "inactive" })
      .expect(200);

    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.data.user.status).toBe("inactive");

    const profileRes = await request(app)
      .patch(`/users/${user._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated Customer", email: "updated-customer@example.com" })
      .expect(200);

    expect(profileRes.body.success).toBe(true);
    expect(profileRes.body.data.user.name).toBe("Updated Customer");
  });

  test("admin can delete a user and verify the record is removed", async () => {
    const deleteRes = await request(app)
      .delete(`/users/${user._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(deleteRes.body.success).toBe(true);
    expect(await User.findById(user._id)).toBeNull();
  });
});
