process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.CHECKOUT_DB_NAME = "book_checkout_jest";

const mongoose = require("mongoose");

const { connectDatabase } = require("../src/config/database");
const Order = require("../src/models/Order");
const orderService = require("../src/services/orderService");

describe("checkout admin order unit", () => {
  const config = {
    notificationServiceUrl: "http://127.0.0.1:45999",
    notificationRequestTimeoutMs: 100,
    notificationRequired: false,
    jwtSecret: "checkout_admin_secret",
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

  test("listAdminOrders returns all real orders", async () => {
    await Order.create([
      buildOrderPayload({ userId: "user_a" }),
      buildOrderPayload({ userId: "user_b", totals: { subtotal: 200000, discount: 0, total: 200000 } }),
    ]);

    const result = await orderService.listAdminOrders();

    expect(result.ok).toBe(true);
    expect(result.data.items).toHaveLength(2);
  });

  test("updateAdminOrderStatus moves a real order through a valid admin transition", async () => {
    const order = await Order.create(buildOrderPayload({ orderStatus: "pending" }));

    const result = await orderService.updateAdminOrderStatus({
      orderId: String(order._id),
      nextStatus: "confirmed",
      config,
    });

    expect(result.ok).toBe(true);
    expect(result.data.order.orderStatus).toBe("confirmed");

    const reloaded = await Order.findById(order._id).lean();
    expect(reloaded.orderStatus).toBe("confirmed");
  });

  test("updateAdminOrderStatus rejects an invalid transition for a real order", async () => {
    const order = await Order.create(buildOrderPayload({ orderStatus: "pending" }));

    const result = await orderService.updateAdminOrderStatus({
      orderId: String(order._id),
      nextStatus: "delivered",
      config,
    });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("CHECKOUT_INVALID_ORDER_TRANSITION");
  });
});
