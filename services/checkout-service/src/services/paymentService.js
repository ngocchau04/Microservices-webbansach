const PaymentTransaction = require("../models/PaymentTransaction");
const Order = require("../models/Order");

const createPayment = async ({ requester, payload, config }) => {
  const orderId = payload.orderId;

  if (!orderId) {
    return {
      ok: false,
      statusCode: 400,
      message: "orderId is required",
      code: "CHECKOUT_PAYMENT_ORDER_REQUIRED",
    };
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return {
      ok: false,
      statusCode: 404,
      message: "Order not found",
      code: "CHECKOUT_ORDER_NOT_FOUND",
    };
  }

  if (requester.role !== "admin" && String(order.userId) !== String(requester.userId)) {
    return {
      ok: false,
      statusCode: 403,
      message: "Permission denied",
      code: "CHECKOUT_FORBIDDEN",
    };
  }

  const method = payload.method || order.paymentMethod || "cod";

  const transaction = await PaymentTransaction.create({
    userId: order.userId,
    orderId: String(order._id),
    method,
    provider: config.mockPaymentProvider,
    status: method === "online" ? "pending" : "processing",
    amount: order.totals.total,
    currency: "VND",
    metadata: {
      returnUrl: payload.returnUrl || null,
    },
  });

  if (method === "cod") {
    order.paymentStatus = "unpaid";
    await order.save();

    return {
      ok: true,
      statusCode: 201,
      data: {
        item: transaction,
        payment: transaction,
        mode: "cod",
      },
      legacy: {
        status: "success",
        data: {
          transactionId: transaction._id,
          mode: "cod",
          message: "COD selected",
        },
      },
    };
  }

  order.paymentStatus = "pending";
  await order.save();

  return {
    ok: true,
    statusCode: 201,
    data: {
      item: transaction,
      payment: transaction,
      mode: "online",
      checkoutUrl: `/payment?transactionId=${transaction._id}`,
      qrContent: `mockpay://checkout/${transaction._id}`,
    },
    legacy: {
      status: "success",
      data: {
        transactionId: transaction._id,
        checkoutUrl: `/payment?transactionId=${transaction._id}`,
      },
    },
  };
};

const handleWebhook = async ({ payload, config }) => {
  const secret = payload.webhookSecret || payload.secret;
  if (secret !== config.paymentWebhookSecret) {
    return {
      ok: false,
      statusCode: 401,
      message: "Invalid webhook secret",
      code: "CHECKOUT_PAYMENT_INVALID_WEBHOOK_SECRET",
    };
  }

  const transactionId = payload.transactionId || payload.paymentId;
  const status = payload.status;

  const transaction = await PaymentTransaction.findById(transactionId);
  if (!transaction) {
    return {
      ok: false,
      statusCode: 404,
      message: "Payment transaction not found",
      code: "CHECKOUT_PAYMENT_NOT_FOUND",
    };
  }

  const order = await Order.findById(transaction.orderId);
  if (!order) {
    return {
      ok: false,
      statusCode: 404,
      message: "Order not found",
      code: "CHECKOUT_ORDER_NOT_FOUND",
    };
  }

  if (status === "succeeded") {
    transaction.status = "succeeded";
    order.paymentStatus = "paid";
  } else if (status === "failed") {
    transaction.status = "failed";
    order.paymentStatus = "failed";
  } else {
    transaction.status = "processing";
    order.paymentStatus = "pending";
  }

  transaction.metadata = {
    ...transaction.metadata,
    webhookPayload: payload,
  };

  await transaction.save();
  await order.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: transaction,
      payment: transaction,
    },
    legacy: {
      status: "success",
      data: {
        transactionId: transaction._id,
        paymentStatus: transaction.status,
      },
    },
  };
};

const getPaymentById = async ({ requester, paymentId }) => {
  const payment = await PaymentTransaction.findById(paymentId);

  if (!payment) {
    return {
      ok: false,
      statusCode: 404,
      message: "Payment transaction not found",
      code: "CHECKOUT_PAYMENT_NOT_FOUND",
    };
  }

  if (requester.role !== "admin" && String(payment.userId) !== String(requester.userId)) {
    return {
      ok: false,
      statusCode: 403,
      message: "Permission denied",
      code: "CHECKOUT_FORBIDDEN",
    };
  }

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: payment,
      payment,
    },
    legacy: {
      status: "success",
      data: {
        transactionId: payment._id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
      },
    },
  };
};

module.exports = {
  createPayment,
  handleWebhook,
  getPaymentById,
};

