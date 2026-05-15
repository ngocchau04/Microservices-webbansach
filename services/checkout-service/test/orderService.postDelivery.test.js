const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

jest.mock("../src/services/voucherService", () => ({}));
jest.mock("../src/services/catalogClient", () => ({}));
jest.mock("../src/services/notificationClient", () => ({
  sendOrderEmail: jest.fn(async () => {}),
  sendOrderStatusEmail: jest.fn(async () => {}),
}));

const Order = require("../src/models/Order");
const orderService = require("../src/services/orderService");

const baseUser = { userId: "user_1", role: "user" };

const baseOrderFields = {
  userId: "user_1",
  items: [{ productId: "book-1", title: "Book 1", price: 50000, quantity: 1, stockSnapshot: 10 }],
  shippingInfo: { name: "Test User", phone: "0901234567", email: "test@example.com", address: "123 Test St" },
  totals: { subtotal: 50000, discount: 0, total: 50000 },
};

describe("checkout post-delivery eligibility rules", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await Order.deleteMany({});
    jest.clearAllMocks();
  });

  test("non-buyers cannot review", async () => {
    const result = await orderService.checkReviewEligibility({
      requester: baseUser,
      productId: "book-1",
    });

    expect(result.ok).toBe(true);
    expect(result.data.eligible).toBe(false);
    expect(result.data.reasonCode).toBe("NOT_PURCHASED");
  });

  test("buyers cannot review before receipt confirmation", async () => {
    await Order.create({
      ...baseOrderFields,
      orderStatus: "delivered",
    });

    const result = await orderService.checkReviewEligibility({
      requester: baseUser,
      productId: "book-1",
    });

    expect(result.data.eligible).toBe(false);
    expect(result.data.reasonCode).toBe("RECEIPT_NOT_CONFIRMED");
  });

  test("buyers can review after receipt confirmation within 14 days", async () => {
    const receivedAt = new Date(Date.now() - 2 * MS_PER_DAY);
    const order = await Order.create({
      ...baseOrderFields,
      orderStatus: "received",
      receivedAt,
    });

    const result = await orderService.checkReviewEligibility({
      requester: baseUser,
      productId: "book-1",
    });

    expect(result.data.eligible).toBe(true);
    expect(String(result.data.orderId)).toBe(String(order._id));
  });

  test("review window expires after 14 days", async () => {
    const receivedAt = new Date(Date.now() - 16 * MS_PER_DAY);
    await Order.create({
      ...baseOrderFields,
      orderStatus: "received",
      receivedAt,
    });

    const result = await orderService.checkReviewEligibility({
      requester: baseUser,
      productId: "book-1",
    });

    expect(result.data.eligible).toBe(false);
    expect(result.data.reasonCode).toBe("REVIEW_WINDOW_EXPIRED");
  });

  test("return request expires after 7 days from receipt", async () => {
    const receivedAt = new Date(Date.now() - 8 * MS_PER_DAY);
    const order = await Order.create({
      ...baseOrderFields,
      orderStatus: "received",
      receivedAt,
    });

    const result = await orderService.requestOrderReturn({
      requester: baseUser,
      orderId: String(order._id),
      reason: "Sách bị rách",
      config: {},
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("CHECKOUT_RETURN_WINDOW_EXPIRED");
  });

  test("completed orders are read-only for admin status changes", async () => {
    const order = await Order.create({
      ...baseOrderFields,
      orderStatus: "completed",
    });

    const result = await orderService.updateAdminOrderStatus({
      orderId: String(order._id),
      nextStatus: "return_requested",
      config: {},
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("CHECKOUT_INVALID_ORDER_TRANSITION");
  });
});
