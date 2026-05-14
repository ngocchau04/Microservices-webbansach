process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "identity_unit_test_secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.IDENTITY_DB_NAME = "book_identity_jest";

const mongoose = require("mongoose");

const { connectDatabase } = require("../src/config/database");
const User = require("../src/models/User");
const authService = require("../src/services/authService");
const { verifyAccessToken } = require("../src/services/tokenService");

describe("identity authService unit", () => {
  const config = {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  };

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

  test("register creates a real user record and normalizes the email", async () => {
    const result = await authService.register({
      payload: {
        name: "Test User",
        sdt: "0900000000",
        email: "USER1@Example.COM",
        password: "123456",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);

    const createdUser = await User.findOne({ email: "user1@example.com" }).lean();
    expect(createdUser).toBeTruthy();
    expect(createdUser.name).toBe("Test User");
    expect(createdUser.role).toBe("user");
    expect(createdUser.tenantId).toBe("public");
  });

  test("register rejects duplicate email from the real database", async () => {
    await User.create({
      tenantId: "public",
      email: "user2@example.com",
      name: "Existing User",
      password: "123456",
      sdt: "",
      role: "user",
      status: "active",
      isActive: true,
      authProvider: "local",
    });

    const result = await authService.register({
      payload: {
        name: "Another User",
        email: "user2@example.com",
        password: "123456",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(409);
    expect(result.code).toBe("AUTH_EMAIL_EXISTS");
  });

  test("login returns a real JWT that can be verified by tokenService", async () => {
    const user = await User.create({
      tenantId: "public",
      email: "login@example.com",
      name: "Login User",
      password: "123456",
      sdt: "",
      role: "user",
      status: "active",
      isActive: true,
      authProvider: "local",
    });

    const result = await authService.login({
      username: "login@example.com",
      password: "123456",
      config,
    });

    expect(result.ok).toBe(true);
    expect(result.data.token).toBeTruthy();

    const decoded = verifyAccessToken({
      token: result.data.token,
      config,
    });

    expect(String(decoded.userId)).toBe(String(user._id));
    expect(decoded.email).toBe("login@example.com");
    expect(decoded.role).toBe("user");
    expect(decoded.tenantId).toBe("public");
  });

  test("login returns AUTH_INVALID_CREDENTIALS when password is wrong", async () => {
    await User.create({
      tenantId: "public",
      email: "wrongpw@example.com",
      name: "Wrong PW User",
      password: "correct_password",
      sdt: "",
      role: "user",
      status: "active",
      isActive: true,
      authProvider: "local",
    });

    const result = await authService.login({
      username: "wrongpw@example.com",
      password: "wrong_password",
      config,
    });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  test("refreshToken returns a new valid token for an existing real user", async () => {
    const user = await User.create({
      tenantId: "public",
      email: "refresh@example.com",
      name: "Refresh User",
      password: "123456",
      sdt: "",
      role: "user",
      status: "active",
      isActive: true,
      authProvider: "local",
    });

    const loginResult = await authService.login({
      username: "refresh@example.com",
      password: "123456",
      config,
    });

    const refreshResult = await authService.refreshToken({
      token: loginResult.data.token,
      config,
    });

    expect(refreshResult.ok).toBe(true);
    expect(refreshResult.data.token).toBeTruthy();

    const decoded = verifyAccessToken({
      token: refreshResult.data.token,
      config,
    });

    expect(String(decoded.userId)).toBe(String(user._id));
    expect(decoded.email).toBe("refresh@example.com");
  });

  test("favorite flow adds, normalizes and removes product favorites on the real user document", async () => {
    const user = await User.create({
      tenantId: "public",
      email: "favorite@example.com",
      name: "Favorite User",
      password: "123456",
      sdt: "",
      role: "user",
      status: "active",
      isActive: true,
      authProvider: "local",
      favorite: [{ favProId: "book_legacy_1" }],
    });

    const beforeResult = await authService.getFavorites({ userId: String(user._id) });
    expect(beforeResult.ok).toBe(true);
    expect(beforeResult.data.items).toEqual([{ product: "book_legacy_1" }]);

    const addResult = await authService.addFavorite({
      userId: String(user._id),
      productId: "book_new_2",
    });

    expect(addResult.ok).toBe(true);
    expect(addResult.data.items).toEqual(
      expect.arrayContaining([{ product: "book_legacy_1" }, { product: "book_new_2" }])
    );

    const removeResult = await authService.removeFavorite({
      userId: String(user._id),
      productId: "book_legacy_1",
    });

    expect(removeResult.ok).toBe(true);
    expect(removeResult.data.items).toEqual([{ product: "book_new_2" }]);

    const reloadedUser = await User.findById(user._id).lean();
    expect(reloadedUser.favorite).toEqual([{ product: "book_new_2" }]);
  });

  test("updateUserStatus deactivates a real user and prevents subsequent login", async () => {
    const user = await User.create({
      tenantId: "public",
      email: "inactive@example.com",
      name: "Inactive User",
      password: "123456",
      sdt: "",
      role: "user",
      status: "active",
      isActive: true,
      authProvider: "local",
    });

    const updateResult = await authService.updateUserStatus({
      userId: String(user._id),
      status: "inactive",
    });

    expect(updateResult.ok).toBe(true);
    expect(updateResult.data.user.status).toBe("inactive");
    expect(updateResult.data.user.isActive).toBe(false);

    const loginResult = await authService.login({
      username: "inactive@example.com",
      password: "123456",
      config,
    });

    expect(loginResult.ok).toBe(false);
    expect(loginResult.statusCode).toBe(403);
    expect(loginResult.code).toBe("AUTH_USER_INACTIVE");
  });
});
