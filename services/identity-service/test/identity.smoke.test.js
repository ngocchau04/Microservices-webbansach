const request = require("supertest");

process.env.JWT_SECRET = "identity_test_secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017";
process.env.IDENTITY_DB_NAME = "book_identity_test";

const users = [];
const pendingUsers = [];
let idCounter = 0;

const clone = (value) => JSON.parse(JSON.stringify(value));

const buildDoc = (value) => ({
  ...value,
  toObject: () => clone(value),
});

const matchesQuery = (item, query = {}) =>
  Object.entries(query).every(([key, val]) => `${item[key]}` === `${val}`);

/** Mirrors identity listUsers filter: role $nin (e.g. exclude admin from customer list). */
const matchesListUsersQuery = (user, query = {}) => {
  if (!query || typeof query !== "object") return true;
  if (query.role && Array.isArray(query.role.$nin)) {
    const r = user.role ?? "user";
    return !query.role.$nin.includes(r);
  }
  return true;
};

const mockUserModel = {
  findOne: jest.fn(async (query, projection) => {
    const found = users.find((user) => matchesQuery(user, query));
    if (!found) {
      return null;
    }

    if (projection && projection.password === 0) {
      const { password, ...safe } = found;
      return buildDoc(safe);
    }

    return buildDoc(found);
  }),

  create: jest.fn(async (payload) => {
    const newUser = {
      _id: `user_${++idCounter}`,
      favorite: [],
      cart: [],
      status: "active",
      isActive: true,
      role: "user",
      ...clone(payload),
    };

    users.push(newUser);
    return buildDoc(newUser);
  }),

  findById: jest.fn(async (id) => {
    const found = users.find((user) => `${user._id}` === `${id}`);
    return found ? buildDoc(found) : null;
  }),

  findByIdAndUpdate: jest.fn(async (id, updates) => {
    const index = users.findIndex((user) => `${user._id}` === `${id}`);
    if (index === -1) {
      return null;
    }

    users[index] = { ...users[index], ...clone(updates) };
    return buildDoc(users[index]);
  }),

  findOneAndUpdate: jest.fn(async (query, updates) => {
    const index = users.findIndex((user) => matchesQuery(user, query));
    if (index === -1) {
      return null;
    }

    users[index] = { ...users[index], ...clone(updates) };
    return buildDoc(users[index]);
  }),

  find: jest.fn((query = {}) => ({
    sort: jest.fn(async () =>
      users.filter((user) => matchesListUsersQuery(user, query)).map((user) => buildDoc(user))
    ),
  })),

  countDocuments: jest.fn(async (query = {}) =>
    users.filter((user) => matchesListUsersQuery(user, query)).length
  ),
};

const mockPendingUserModel = {
  findOne: jest.fn(async (query, projection) => {
    const found = pendingUsers.find((user) => matchesQuery(user, query));
    if (!found) {
      return null;
    }

    if (projection && projection.password === 0) {
      const { password, ...safe } = found;
      return buildDoc(safe);
    }

    return buildDoc(found);
  }),

  create: jest.fn(async (payload) => {
    const newPending = {
      _id: `pending_${++idCounter}`,
      ...clone(payload),
    };

    pendingUsers.push(newPending);
    return buildDoc(newPending);
  }),

  deleteOne: jest.fn(async (query) => {
    const index = pendingUsers.findIndex((item) => matchesQuery(item, query));
    if (index >= 0) {
      pendingUsers.splice(index, 1);
    }

    return { deletedCount: index >= 0 ? 1 : 0 };
  }),
};

jest.mock("../src/models/User", () => mockUserModel);
jest.mock("../src/models/PendingUser", () => mockPendingUserModel);

const { createApp } = require("../src/index");

describe("identity-service smoke flow", () => {
  const app = createApp();

  beforeEach(() => {
    users.length = 0;
    pendingUsers.length = 0;
    idCounter = 0;
    jest.clearAllMocks();
  });

  test("register -> verify -> login -> refresh -> me", async () => {
    const registerPayload = {
      name: "Test User",
      sdt: "0900000000",
      email: "user1@example.com",
      password: "123456",
    };

    const registerRes = await request(app)
      .post("/register")
      .send(registerPayload)
      .expect(200);

    expect(registerRes.body.success).toBe(true);

    const pending = pendingUsers.find((item) => item.email === registerPayload.email);
    expect(pending).toBeTruthy();

    await request(app)
      .post("/verify-account")
      .send({ email: registerPayload.email, number: pending.verificationCode })
      .expect(200);

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

    const refreshedToken = refreshRes.body.token || refreshRes.body.data.token;
    expect(refreshedToken).toBeTruthy();

    const meRes = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${refreshedToken}`)
      .expect(200);

    expect(meRes.body.success).toBe(true);
    expect(meRes.body.user?.email || meRes.body.data.user.email).toBe(registerPayload.email);
  });

  test("admin can list users and update user status", async () => {
    const createdUser = await mockUserModel.create({
      name: "Member User",
      email: "member@example.com",
      password: "123456",
      role: "user",
    });

    const admin = await mockUserModel.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "123456",
      role: "admin",
      status: "active",
      isActive: true,
    });

    const adminLogin = await request(app)
      .post("/login")
      .send({ username: admin.email, password: admin.password })
      .expect(200);

    const adminToken = adminLogin.body.token || adminLogin.body.data.token;
    expect(adminToken).toBeTruthy();

    const usersRes = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(usersRes.body.success).toBe(true);
    const listed = usersRes.body.accs || usersRes.body.data.users;
    expect(Array.isArray(listed)).toBe(true);
    expect(listed.some((u) => u.email === "admin@example.com")).toBe(false);
    expect(listed.some((u) => u.email === "member@example.com")).toBe(true);

    await request(app)
      .patch(`/users/${createdUser._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "inactive" })
      .expect(200);

    await request(app)
      .post("/login")
      .send({ username: "member@example.com", password: "123456" })
      .expect(403);
  });
});
