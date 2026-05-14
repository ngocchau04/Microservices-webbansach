jest.mock("../src/models/PaymentTransaction", () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../src/models/Order", () => ({
  findById: jest.fn(),
}));

jest.mock("../src/services/vnpayService", () => ({
  createPaymentUrl: jest.fn(),
  verifyCallback: jest.fn(),
  isSuccessResponse: jest.fn(),
}));

jest.mock("../src/services/momoService", () => ({
  createPaymentUrl: jest.fn(),
  decodeExtraData: jest.fn(() => null),
  verifyCallback: jest.fn(),
  isSuccessResponse: jest.fn(),
}));

const PaymentTransaction = require("../src/models/PaymentTransaction");
const Order = require("../src/models/Order");
const momoService = require("../src/services/momoService");
const paymentService = require("../src/services/paymentService");

const createMutableDoc = (data) => ({
  ...data,
  save: jest.fn(async function save() {
    return this;
  }),
});

describe("functional payment unit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("createPayment uses MoMo demo fallback when demo mode is enabled", async () => {
    const order = createMutableDoc({
      _id: "order_1",
      userId: "user_1",
      totals: { total: 175000 },
      paymentMethod: "online",
      paymentStatus: "pending",
    });

    const transaction = createMutableDoc({
      _id: "pay_1",
      userId: "user_1",
      orderId: "order_1",
      amount: 175000,
      provider: "momo",
      metadata: {},
      status: "pending",
    });

    Order.findById.mockResolvedValue(order);
    PaymentTransaction.create.mockResolvedValue(transaction);

    const result = await paymentService.createPayment({
      requester: { userId: "user_1", role: "user" },
      payload: { orderId: "order_1", method: "online", provider: "momo" },
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
      "http://localhost:8080/api/checkout/payments/momo/demo-return?paymentId=pay_1"
    );
    expect(transaction.metadata.mode).toBe("momo-demo-fallback");
    expect(momoService.createPaymentUrl).not.toHaveBeenCalled();
  });

  test("handleMomoDemoReturn marks payment as succeeded and redirects to payment result page", async () => {
    const transaction = createMutableDoc({
      _id: "pay_1",
      orderId: "order_1",
      provider: "momo",
      metadata: {},
      status: "pending",
    });

    const order = createMutableDoc({
      _id: "order_1",
      paymentStatus: "pending",
    });

    PaymentTransaction.findById.mockResolvedValue(transaction);
    Order.findById.mockResolvedValue(order);

    const result = await paymentService.handleMomoDemoReturn({
      paymentId: "pay_1",
      config: {
        appBaseUrl: "http://localhost:5173",
      },
    });

    expect(result.ok).toBe(true);
    expect(transaction.status).toBe("succeeded");
    expect(order.paymentStatus).toBe("paid");
    expect(result.data.redirectUrl).toBe(
      "http://localhost:5173/payment?paymentId=pay_1&orderId=order_1&success=1&provider=momo"
    );
    expect(transaction.save).toHaveBeenCalled();
    expect(order.save).toHaveBeenCalled();
  });
});
