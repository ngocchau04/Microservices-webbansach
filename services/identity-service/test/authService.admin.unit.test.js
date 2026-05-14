process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "identity_admin_unit_secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.IDENTITY_DB_NAME = "book_identity_jest";

const mongoose = require("mongoose");

const { connectDatabase } = require("../src/config/database");
const User = require("../src/models/User");
const authService = require("../src/services/authService");

describe("identity admin unit", () => {
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

  test("listUsers and countUsers exclude admin accounts from customer management", async () => {
    await User.create([
      {
        tenantId: "public",
        email: "admin@bookstore.local",
        name: "Bookstore Admin",
        password: "Admin@123",
        role: "admin",
        status: "active",
        isActive: true,
        authProvider: "local",
      },
      {
        tenantId: "public",
        email: "user1@example.com",
        name: "User One",
        password: "123456",
        role: "user",
        status: "active",
        isActive: true,
        authProvider: "local",
      },
      {
        tenantId: "public",
        email: "user2@example.com",
        name: "User Two",
        password: "123456",
        role: "user",
        status: "active",
        isActive: true,
        authProvider: "local",
      },
    ]);

    const listResult = await authService.listUsers();
    const countResult = await authService.countUsers();

    expect(listResult.ok).toBe(true);
    expect(listResult.data.users).toHaveLength(2);
    expect(listResult.data.users.some((item) => item.email === "admin@bookstore.local")).toBe(false);

    expect(countResult.ok).toBe(true);
    expect(countResult.data.total).toBe(2);
  });

  test("updateUserByAdmin updates a customer account but refuses to edit admin account", async () => {
    const [admin, user] = await User.create([
      {
        tenantId: "public",
        email: "admin@bookstore.local",
        name: "Bookstore Admin",
        password: "Admin@123",
        role: "admin",
        status: "active",
        isActive: true,
        authProvider: "local",
      },
      {
        tenantId: "public",
        email: "user@example.com",
        name: "Customer User",
        password: "123456",
        role: "user",
        status: "active",
        isActive: true,
        authProvider: "local",
      },
    ]);

    const updateUserResult = await authService.updateUserByAdmin({
      userId: String(user._id),
      payload: {
        name: "Updated Customer",
        email: "updated@example.com",
      },
    });

    expect(updateUserResult.ok).toBe(true);
    expect(updateUserResult.data.user.name).toBe("Updated Customer");
    expect(updateUserResult.data.user.email).toBe("updated@example.com");

    const updateAdminResult = await authService.updateUserByAdmin({
      userId: String(admin._id),
      payload: {
        name: "Should Not Update",
      },
    });

    expect(updateAdminResult.ok).toBe(false);
    expect(updateAdminResult.statusCode).toBe(403);
    expect(updateAdminResult.code).toBe("AUTH_FORBIDDEN");
  });

  test("deleteUserByAdmin deletes a customer account but refuses to delete admin account", async () => {
    const [admin, user] = await User.create([
      {
        tenantId: "public",
        email: "admin@bookstore.local",
        name: "Bookstore Admin",
        password: "Admin@123",
        role: "admin",
        status: "active",
        isActive: true,
        authProvider: "local",
      },
      {
        tenantId: "public",
        email: "user@example.com",
        name: "Customer User",
        password: "123456",
        role: "user",
        status: "active",
        isActive: true,
        authProvider: "local",
      },
    ]);

    const deleteUserResult = await authService.deleteUserByAdmin({
      userId: String(user._id),
    });

    expect(deleteUserResult.ok).toBe(true);
    expect(await User.findById(user._id)).toBeNull();

    const deleteAdminResult = await authService.deleteUserByAdmin({
      userId: String(admin._id),
    });

    expect(deleteAdminResult.ok).toBe(false);
    expect(deleteAdminResult.statusCode).toBe(403);
    expect(deleteAdminResult.code).toBe("AUTH_FORBIDDEN");
  });
});
