const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const momoService = require("../src/services/momoService");

const Order = require("../src/models/Order");
const PaymentTransaction = require("../src/models/PaymentTransaction");
const paymentService = require("../src/services/paymentService");

const baseOrderFields = {
  userId: "user_1",
  items: [{ productId: "book-1", title: "Book 1", price: 175000, quantity: 1, stockSnapshot: 5 }],
  shippingInfo: { name: "Test User", phone: "0901234567", email: "test@example.com", address: "123 Test St" },
  totals: { subtotal: 175000, discount: 0, total: 175000 },
};

describe("functional payment unit", () => {
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
    await PaymentTransaction.deleteMany({});
    jest.clearAllMocks();
  });

  test("createPayment uses MoMo demo fallback when demo mode is enabled", async () => {
    const createPaymentSpy = jest.spyOn(momoService, "createPaymentUrl");

    const order = await Order.create({
      ...baseOrderFields,
      paymentMethod: "online",
      paymentStatus: "unpaid",
    });

    const result = await paymentService.createPayment({
      requester: { userId: "user_1", role: "user" },
      payload: { orderId: String(order._id), method: "online", provider: "momo" },
      config: {
        paymentProvider: "momo",
        apiBaseUrl: "http://localhost:8080",
        momoReturnPath: "/api/checkout/payments/momo/return",
        momoDemoMode: true,
        momoPartnerCode: "MOMO",
        momoAccessKey: "access",
        momoSecretKey: "secret",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.data.provider).toBe("momo");
    expect(result.data.fallbackMode).toBe("demo");
    expect(result.data.checkoutUrl).toBe(
      `http://localhost:8080/api/checkout/payments/momo/demo-return?paymentId=${encodeURIComponent(String(result.data.payment._id))}`
    );
    expect(result.data.payment.metadata.mode).toBe("momo-demo-fallback");
    expect(createPaymentSpy).not.toHaveBeenCalled();
  });

  test("handleMomoDemoReturn marks payment as succeeded and redirects to payment result page", async () => {
    const order = await Order.create({
      ...baseOrderFields,
      paymentStatus: "pending",
    });

    const transaction = await PaymentTransaction.create({
      userId: "user_1",
      orderId: String(order._id),
      method: "online",
      provider: "momo",
      amount: 175000,
      status: "pending",
      metadata: {},
    });

    const result = await paymentService.handleMomoDemoReturn({
      paymentId: String(transaction._id),
      config: {
        appBaseUrl: "http://localhost:5173",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.data.payment.status).toBe("succeeded");
    expect(result.data.order.paymentStatus).toBe("paid");
    expect(result.data.redirectUrl).toBe(
      `http://localhost:5173/payment?paymentId=${encodeURIComponent(String(transaction._id))}&orderId=${encodeURIComponent(String(order._id))}&success=1&provider=momo`
    );
  });
});
