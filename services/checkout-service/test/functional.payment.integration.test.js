process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "functional_checkout_secret";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.CHECKOUT_DB_NAME = "book_checkout_jest";

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

const { connectDatabase } = require("../src/config/database");
const { createCheckoutRoutes } = require("../src/routes/checkoutRoutes");
const Order = require("../src/models/Order");
const PaymentTransaction = require("../src/models/PaymentTransaction");

describe("functional payment integration", () => {
  const config = {
    jwtSecret: process.env.JWT_SECRET,
    apiBaseUrl: "http://localhost:8080",
    appBaseUrl: "http://localhost:5173",
    paymentProvider: "momo",
    mockPaymentProvider: "momo",
    momoDemoMode: true,
    momoReturnPath: "/payments/momo/return",
    vnpayReturnPath: "/payments/vnpay/return",
    paymentWebhookSecret: "functional_webhook_secret",
  };

  const userId = "user_checkout_payment";
  const userToken = jwt.sign(
    { userId, role: "user", email: "user1@example.com" },
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

  beforeAll(async () => {
    await connectDatabase({
      mongoUri: process.env.MONGO_URI,
      dbName: process.env.CHECKOUT_DB_NAME,
    });
  });

  beforeEach(async () => {
    await PaymentTransaction.deleteMany({});
    await Order.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("POST /payments/create creates a pending MoMo payment and returns the demo checkout URL", async () => {
    const order = await Order.create({
      userId,
      items: [
        {
          productId: "book_payment_1",
          title: "Clean Code",
          price: 175000,
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
      paymentMethod: "online",
      paymentStatus: "unpaid",
      totals: {
        subtotal: 175000,
        discount: 0,
        total: 175000,
      },
    });

    const response = await request(buildApp())
      .post("/payments/create")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ orderId: String(order._id), method: "online", provider: "momo" })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.provider).toBe("momo");
    expect(response.body.data.fallbackMode).toBe("demo");
    expect(response.body.data.checkoutUrl).toContain("/payments/momo/demo-return?paymentId=");

    const payment = await PaymentTransaction.findById(response.body.data.payment._id).lean();
    const updatedOrder = await Order.findById(order._id).lean();

    expect(payment).toBeTruthy();
    expect(payment.provider).toBe("momo");
    expect(payment.method).toBe("online");
    expect(payment.status).toBe("pending");
    expect(payment.metadata.mode).toBe("momo-demo-fallback");
    expect(updatedOrder.paymentStatus).toBe("pending");
  });

  test("GET /payments/momo/demo-return marks payment as succeeded and redirects to the payment result page", async () => {
    const order = await Order.create({
      userId,
      items: [
        {
          productId: "book_payment_2",
          title: "Refactoring",
          price: 210000,
          image: "",
          quantity: 1,
          stockSnapshot: 8,
        },
      ],
      shippingInfo: {
        name: "Van A",
        phone: "0900000000",
        email: "vana@example.com",
        address: "Ho Chi Minh City",
      },
      paymentMethod: "online",
      paymentStatus: "pending",
      totals: {
        subtotal: 210000,
        discount: 0,
        total: 210000,
      },
    });

    const payment = await PaymentTransaction.create({
      userId,
      orderId: String(order._id),
      method: "online",
      provider: "momo",
      status: "pending",
      amount: order.totals.total,
      currency: "VND",
      metadata: {
        checkoutUrl: `http://localhost:8080/payments/momo/demo-return?paymentId=${order._id}`,
        mode: "momo-demo-fallback",
      },
    });

    const response = await request(buildApp())
      .get("/payments/momo/demo-return")
      .query({ paymentId: String(payment._id) })
      .expect(302);

    expect(response.headers.location).toBe(
      `http://localhost:5173/payment?paymentId=${payment._id}&orderId=${order._id}&success=1&provider=momo`
    );

    const updatedPayment = await PaymentTransaction.findById(payment._id).lean();
    const updatedOrder = await Order.findById(order._id).lean();

    expect(updatedPayment.status).toBe("succeeded");
    expect(updatedPayment.metadata.demoReturn.provider).toBe("momo-demo-fallback");
    expect(updatedOrder.paymentStatus).toBe("paid");
  });
});
