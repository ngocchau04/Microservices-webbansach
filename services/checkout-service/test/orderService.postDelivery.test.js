const orderStore = new Map();

const clone = (value) => JSON.parse(JSON.stringify(value));

const attachOrderDoc = (order) => ({
  ...order,
  async save() {
    orderStore.set(String(this._id), this);
    return this;
  },
});

const mockOrderModel = {
  findById: jest.fn(async (id) => {
    const found = orderStore.get(String(id));
    return found ? attachOrderDoc(found) : null;
  }),
  find: jest.fn((query = {}) => ({
    sort: async () => {
      const items = Array.from(orderStore.values()).filter((item) => {
        if (query.userId && String(item.userId) !== String(query.userId)) return false;
        if (query["items.productId"]) {
          return (item.items || []).some(
            (line) => String(line.productId) === String(query["items.productId"])
          );
        }
        return true;
      });
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return items.map((item) => attachOrderDoc(item));
    },
  })),
};

jest.mock("../src/models/Order", () => mockOrderModel);
jest.mock("../src/models/Cart", () => ({
  findOne: jest.fn(),
}));
jest.mock("../src/services/voucherService", () => ({}));
jest.mock("../src/services/catalogClient", () => ({}));
jest.mock("../src/services/notificationClient", () => ({
  sendOrderEmail: jest.fn(async () => {}),
  sendOrderStatusEmail: jest.fn(async () => {}),
}));

const orderService = require("../src/services/orderService");

const baseUser = { userId: "user_1", role: "user" };

describe("checkout post-delivery eligibility rules", () => {
  beforeEach(() => {
    orderStore.clear();
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
    orderStore.set(
      "o1",
      attachOrderDoc({
        _id: "o1",
        userId: "user_1",
        orderStatus: "delivered",
        items: [{ productId: "book-1", quantity: 1 }],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      })
    );

    const result = await orderService.checkReviewEligibility({
      requester: baseUser,
      productId: "book-1",
    });

    expect(result.data.eligible).toBe(false);
    expect(result.data.reasonCode).toBe("RECEIPT_NOT_CONFIRMED");
  });

  test("buyers can review after receipt confirmation within 14 days", async () => {
    const receivedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    orderStore.set(
      "o2",
      attachOrderDoc({
        _id: "o2",
        userId: "user_1",
        orderStatus: "received",
        receivedAt,
        items: [{ productId: "book-1", quantity: 1 }],
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      })
    );

    const result = await orderService.checkReviewEligibility({
      requester: baseUser,
      productId: "book-1",
    });

    expect(result.data.eligible).toBe(true);
    expect(String(result.data.orderId)).toBe("o2");
  });

  test("review window expires after 14 days", async () => {
    const receivedAt = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
    orderStore.set(
      "o3",
      attachOrderDoc({
        _id: "o3",
        userId: "user_1",
        orderStatus: "received",
        receivedAt,
        items: [{ productId: "book-1", quantity: 1 }],
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-02T00:00:00.000Z"),
      })
    );

    const result = await orderService.checkReviewEligibility({
      requester: baseUser,
      productId: "book-1",
    });

    expect(result.data.eligible).toBe(false);
    expect(result.data.reasonCode).toBe("REVIEW_WINDOW_EXPIRED");
  });

  test("return request expires after 7 days from receipt", async () => {
    const receivedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    orderStore.set(
      "o4",
      attachOrderDoc({
        _id: "o4",
        userId: "user_1",
        orderStatus: "received",
        receivedAt,
        items: [{ productId: "book-1", quantity: 1 }],
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-02T00:00:00.000Z"),
      })
    );

    const result = await orderService.requestOrderReturn({
      requester: baseUser,
      orderId: "o4",
      reason: "Sách bị rách",
      config: {},
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("CHECKOUT_RETURN_WINDOW_EXPIRED");
  });

  test("completed orders are read-only for admin status changes", async () => {
    orderStore.set(
      "o5",
      attachOrderDoc({
        _id: "o5",
        userId: "user_1",
        orderStatus: "completed",
        items: [{ productId: "book-1", quantity: 1 }],
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-02T00:00:00.000Z"),
      })
    );

    const result = await orderService.updateAdminOrderStatus({
      orderId: "o5",
      nextStatus: "return_requested",
      config: {},
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("CHECKOUT_INVALID_ORDER_TRANSITION");
  });
});
