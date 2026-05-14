process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "checkout_admin_integration_secret";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.CHECKOUT_DB_NAME = "book_checkout_jest";

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

const { connectDatabase } = require("../src/config/database");
const { createCheckoutRoutes } = require("../src/routes/checkoutRoutes");
const Order = require("../src/models/Order");

describe("functional checkout admin order integration", () => {
  const config = {
    jwtSecret: process.env.JWT_SECRET,
    notificationServiceUrl: "http://127.0.0.1:45999",
    notificationRequestTimeoutMs: 100,
    notificationRequired: false,
  };

  const adminToken = jwt.sign(
    { userId: "admin_1", role: "admin", email: "admin@example.com" },
    config.jwtSecret,
    { expiresIn: "1h" }
  );

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.locals.config = config;
    app.use(createCheckoutRoutes(config));
    return app;
  };

  const buildOrderPayload = (overrides = {}) => ({
    userId: "user_1",
    items: [
      {
        productId: "book_1",
        title: "Book One",
        price: 100000,
        image: "",
        quantity: 1,
        stockSnapshot: 10,
      },
    ],
    shippingInfo: {
      name: "Van A",
      phone: "0900000000",
      email: "vana@example.com",
      address: "Ho Chi Minh City",
    },
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "pending",
    totals: {
      subtotal: 100000,
      discount: 0,
      total: 100000,
    },
    ...overrides,
  });

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase({
        mongoUri: process.env.MONGO_URI,
        dbName: process.env.CHECKOUT_DB_NAME,
      });
    }
  });

  beforeEach(async () => {
    await Order.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("admin can list orders and update order status through the real API", async () => {
    const order = await Order.create(buildOrderPayload());

    const listRes = await request(buildApp())
      .get("/admin/orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.items).toHaveLength(1);

    const updateRes = await request(buildApp())
      .patch(`/admin/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.order.orderStatus).toBe("confirmed");
  });
});
