const jwt = require("jsonwebtoken");
const request = require("supertest");

process.env.JWT_SECRET = "checkout_test_secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017";
process.env.CHECKOUT_DB_NAME = "book_checkout_test";

const mockCartService = {
  getCart: jest.fn(async () => ({ ok: true, statusCode: 200, data: { items: [], totals: {} } })),
  upsertCartItem: jest.fn(async ({ productId, quantity }) => ({
    ok: true,
    statusCode: 200,
    data: {
      cart: {
        items: [
          {
            itemId: "item_1",
            productId,
            quantity,
          },
        ],
      },
    },
  })),
  updateCartItem: jest.fn(async ({ itemId, quantity }) => ({
    ok: true,
    statusCode: 200,
    data: {
      cart: {
        items: [
          {
            itemId,
            productId: "product_1",
            quantity,
          },
        ],
      },
    },
  })),
  removeCartItem: jest.fn(async () => ({
    ok: true,
    statusCode: 200,
    data: { cart: { items: [] } },
  })),
  clearCart: jest.fn(async () => ({ ok: true, statusCode: 200, data: { cart: null } })),
  removeCartItemsByProductIds: jest.fn(async () => ({
    ok: true,
    statusCode: 200,
    data: { cart: { items: [] } },
  })),
  applyVoucherToCart: jest.fn(async ({ code }) => ({
    ok: true,
    statusCode: 200,
    data: { voucher: { code, discountType: "percent", discountValue: 10 } },
  })),
};

const mockVoucherService = {
  validateVoucher: jest.fn(async ({ code }) => ({
    ok: true,
    statusCode: 200,
    data: { valid: true, voucher: { code, discountType: "percent", discountValue: 10 } },
  })),
  listAvailableVouchers: jest.fn(async () => ({
    ok: true,
    statusCode: 200,
    data: { items: [{ code: "SALE10" }] },
  })),
  createVoucher: jest.fn(async ({ payload }) => ({
    ok: true,
    statusCode: 201,
    data: { item: payload },
  })),
  deleteVoucher: jest.fn(async () => ({ ok: true, statusCode: 200, data: { deleted: true } })),
  getVoucherByCode: jest.fn(async ({ code }) => ({
    ok: true,
    statusCode: 200,
    data: { item: { code, discountType: "percent", discountValue: 10 } },
  })),
};

const mockOrderService = {
  createOrder: jest.fn(async ({ user }) => ({
    ok: true,
    statusCode: 201,
    data: {
      order: {
        _id: "order_1",
        userId: user.userId,
        status: "pending",
        totalAmount: 180000,
      },
    },
  })),
  listMyOrders: jest.fn(async ({ userId }) => ({
    ok: true,
    statusCode: 200,
    data: {
      items: [{ _id: "order_1", userId, status: "pending" }],
    },
  })),
  getOrderById: jest.fn(async ({ orderId }) => ({
    ok: true,
    statusCode: 200,
    data: { item: { _id: orderId, status: "pending" } },
  })),
  cancelOrder: jest.fn(async ({ orderId }) => ({
    ok: true,
    statusCode: 200,
    data: { item: { _id: orderId, status: "cancelled" } },
  })),
  confirmOrderReceived: jest.fn(async ({ orderId }) => ({
    ok: true,
    statusCode: 200,
    data: { item: { _id: orderId, status: "received" } },
  })),
  checkReviewEligibility: jest.fn(async () => ({
    ok: true,
    statusCode: 200,
    data: { eligible: true, orderId: "order_1" },
  })),
  completeOrderAfterReview: jest.fn(async ({ orderId }) => ({
    ok: true,
    statusCode: 200,
    data: { item: { _id: orderId, status: "completed" } },
  })),
  listAdminOrders: jest.fn(async () => ({
    ok: true,
    statusCode: 200,
    data: { items: [{ _id: "order_1", status: "pending" }] },
  })),
  updateAdminOrderStatus: jest.fn(async ({ orderId, nextStatus }) => ({
    ok: true,
    statusCode: 200,
    data: { item: { _id: orderId, status: nextStatus } },
  })),
  listOrdersByUserId: jest.fn(async ({ userId }) => ({
    ok: true,
    statusCode: 200,
    data: { items: [{ _id: "order_1", userId }] },
  })),
  mapOrderLegacy: jest.fn((order) => order),
};

const mockPaymentService = {
  createPayment: jest.fn(async () => ({
    ok: true,
    statusCode: 201,
    data: { payment: { _id: "pay_1", status: "created" } },
  })),
  handleWebhook: jest.fn(async () => ({
    ok: true,
    statusCode: 200,
    data: { accepted: true },
  })),
  getPaymentById: jest.fn(async ({ paymentId }) => ({
    ok: true,
    statusCode: 200,
    data: { payment: { _id: paymentId, status: "created" } },
  })),
};

jest.mock("../src/services/cartService", () => mockCartService);
jest.mock("../src/services/voucherService", () => mockVoucherService);
jest.mock("../src/services/orderService", () => mockOrderService);
jest.mock("../src/services/paymentService", () => mockPaymentService);

const { createApp } = require("../src/index");

describe("checkout-service smoke flow", () => {
  const app = createApp();
  const userToken = jwt.sign(
    { userId: "user_1", role: "user", email: "user1@example.com" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  const adminToken = jwt.sign(
    { userId: "admin_1", role: "admin", email: "admin@example.com" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /health returns ok", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe("checkout-service");
  });

  test("cart flow: add item -> update qty -> remove item", async () => {
    const addRes = await request(app)
      .post("/cart/items")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ productId: "product_1", quantity: 2 })
      .expect(200);

    expect(addRes.body.success).toBe(true);
    expect(mockCartService.upsertCartItem).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_1", productId: "product_1", quantity: 2 })
    );

    const updateRes = await request(app)
      .patch("/cart/items/item_1")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ quantity: 3 })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(mockCartService.updateCartItem).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_1", itemId: "item_1", quantity: 3 })
    );

    const removeRes = await request(app)
      .delete("/cart/items/item_1")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);

    expect(removeRes.body.success).toBe(true);
    expect(mockCartService.removeCartItem).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_1", itemId: "item_1" })
    );
  });

  test("voucher and checkout flow: validate -> apply -> create order -> list my orders", async () => {
    const validateRes = await request(app)
      .post("/vouchers/validate")
      .send({ code: "SALE10", subtotal: 200000 })
      .expect(200);

    expect(validateRes.body.success).toBe(true);
    expect(mockVoucherService.validateVoucher).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SALE10", subtotal: 200000 })
    );

    const applyRes = await request(app)
      .post("/vouchers/apply")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ code: "SALE10" })
      .expect(200);

    expect(applyRes.body.success).toBe(true);
    expect(mockCartService.applyVoucherToCart).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_1", code: "SALE10" })
    );

    const createOrderRes = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ paymentMethod: "COD", shippingAddress: "HCM City" })
      .expect(201);

    expect(createOrderRes.body.success).toBe(true);
    expect(mockOrderService.createOrder).toHaveBeenCalled();

    const myOrdersRes = await request(app)
      .get("/orders/me")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);

    expect(myOrdersRes.body.success).toBe(true);
    expect(mockOrderService.listMyOrders).toHaveBeenCalledWith({ userId: "user_1" });
  });

  test("admin order management: list admin orders -> update order status", async () => {
    const listRes = await request(app)
      .get("/admin/orders")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(mockOrderService.listAdminOrders).toHaveBeenCalled();

    const updateRes = await request(app)
      .patch("/admin/orders/order_1/status")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "processing" })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(mockOrderService.updateAdminOrderStatus).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order_1", nextStatus: "processing" })
    );
  });

  test("GET /cart without Authorization header returns 401", async () => {
    const response = await request(app).get("/cart").expect(401);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("AUTH_UNAUTHORIZED");
  });

  test("GET /admin/orders with user token returns 403", async () => {
    const response = await request(app)
      .get("/admin/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("AUTH_FORBIDDEN");
  });

  test("POST /cart/items with invalid token returns 401", async () => {
    const response = await request(app)
      .post("/cart/items")
      .set("Authorization", "Bearer invalid_token_xyz")
      .send({ productId: "product_1", quantity: 1 })
      .expect(401);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("AUTH_INVALID_TOKEN");
  });
});
