const PaymentTransaction = require("../models/PaymentTransaction");
const Order = require("../models/Order");
const {
  createPaymentUrl: createVnpayPaymentUrl,
  verifyCallback: verifyVnpayCallback,
  isSuccessResponse: isVnpaySuccessResponse,
} = require("./vnpayService");
const {
  createPaymentUrl: createMomoPaymentUrl,
  decodeExtraData,
  verifyCallback: verifyMomoCallback,
  isSuccessResponse: isMomoSuccessResponse,
} = require("./momoService");

const buildPaymentResultRedirectUrl = ({ config, transaction, order, success }) =>
  `${config.appBaseUrl}/payment?paymentId=${encodeURIComponent(
    String(transaction._id)
  )}&orderId=${encodeURIComponent(String(order._id))}&success=${success ? "1" : "0"}`;

const buildProviderResultRedirectUrl = ({ config, transaction, order, success }) =>
  `${buildPaymentResultRedirectUrl({ config, transaction, order, success })}&provider=${encodeURIComponent(
    transaction.provider || "online"
  )}`;

const findMomoTransaction = async (payload = {}) => {
  const extraData = decodeExtraData(payload.extraData);
  const paymentId = payload.paymentId || extraData?.paymentId;

  if (paymentId) {
    return PaymentTransaction.findById(paymentId);
  }

  if (payload.orderId) {
    return PaymentTransaction.findOne({ "metadata.momoOrderId": String(payload.orderId) });
  }

  return null;
};

const markTransactionStatus = async ({ transaction, order, success, metadataPatch = {} }) => {
  transaction.status = success ? "succeeded" : "failed";
  transaction.metadata = {
    ...transaction.metadata,
    ...metadataPatch,
  };
  order.paymentStatus = success ? "paid" : "failed";

  await transaction.save();
  await order.save();
};

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
  const provider =
    method === "online"
      ? String(payload.provider || config.paymentProvider || config.mockPaymentProvider || "mockpay")
          .trim()
          .toLowerCase()
      : "cod";

  const transaction = await PaymentTransaction.create({
    userId: order.userId,
    orderId: String(order._id),
    method,
    provider,
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

  if (provider === "vnpay") {
    const hasVnpayCredentials = Boolean(config.vnpayTmnCode && config.vnpaySecretKey);
    let checkoutUrl;

    if (hasVnpayCredentials) {
      try {
        checkoutUrl = createVnpayPaymentUrl({
          transaction,
          order,
          config,
          ipAddress: payload.ipAddress || payload.clientIpAddress || undefined,
        });
      } catch (error) {
        return {
          ok: false,
          statusCode: 500,
          message: error.message || "VNPay payment URL creation failed",
          code: "CHECKOUT_PAYMENT_VNPAY_CREATE_FAILED",
        };
      }
    } else {
      checkoutUrl = `${config.apiBaseUrl}${config.vnpayReturnPath.replace(
        /\/return$/,
        "/demo-return"
      )}?paymentId=${encodeURIComponent(String(transaction._id))}`;
    }

    transaction.metadata = {
      ...transaction.metadata,
      checkoutUrl,
      mode: hasVnpayCredentials ? "vnpay-live-sandbox" : "vnpay-demo-fallback",
    };
    await transaction.save();

    return {
      ok: true,
      statusCode: 201,
      data: {
        item: transaction,
        payment: transaction,
        mode: "online",
        provider,
        fallbackMode: hasVnpayCredentials ? "gateway" : "demo",
        checkoutUrl,
      },
      legacy: {
        status: "success",
        data: {
          transactionId: transaction._id,
          checkoutUrl,
          provider,
        },
      },
    };
  }

  if (provider === "momo") {
    const forceMomoDemoMode = Boolean(config.momoDemoMode);
    const hasMomoCredentials = Boolean(
      config.momoPartnerCode && config.momoAccessKey && config.momoSecretKey
    );
    let momoCheckout;
    let checkoutUrl;

    if (!forceMomoDemoMode && hasMomoCredentials) {
      try {
        momoCheckout = await createMomoPaymentUrl({
          transaction,
          order,
          config,
        });
        checkoutUrl = momoCheckout.checkoutUrl;
      } catch (error) {
        return {
          ok: false,
          statusCode: 500,
          message: error.message || "MoMo payment URL creation failed",
          code: "CHECKOUT_PAYMENT_MOMO_CREATE_FAILED",
        };
      }
    } else {
      checkoutUrl = `${config.apiBaseUrl}${config.momoReturnPath.replace(
        /\/return$/,
        "/demo-return"
      )}?paymentId=${encodeURIComponent(String(transaction._id))}`;
    }

    transaction.metadata = {
      ...transaction.metadata,
      checkoutUrl,
      mode:
        !forceMomoDemoMode && hasMomoCredentials
          ? "momo-live-test"
          : "momo-demo-fallback",
      momoOrderId: momoCheckout?.orderId || null,
      momoRequestId: momoCheckout?.requestId || null,
      momoExtraData: momoCheckout?.extraData || null,
      momoCreatePayload: momoCheckout?.responsePayload || null,
    };
    await transaction.save();

    return {
      ok: true,
      statusCode: 201,
      data: {
        item: transaction,
        payment: transaction,
        mode: "online",
        provider,
        fallbackMode: !forceMomoDemoMode && hasMomoCredentials ? "gateway" : "demo",
        checkoutUrl,
      },
      legacy: {
        status: "success",
        data: {
          transactionId: transaction._id,
          checkoutUrl,
          provider,
        },
      },
    };
  }

  return {
    ok: true,
    statusCode: 201,
    data: {
      item: transaction,
      payment: transaction,
      mode: "online",
      provider,
      checkoutUrl: `/payment?transactionId=${transaction._id}`,
      qrContent: `mockpay://checkout/${transaction._id}`,
    },
    legacy: {
      status: "success",
      data: {
        transactionId: transaction._id,
        checkoutUrl: `/payment?transactionId=${transaction._id}`,
        provider,
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

const handleVnpayReturn = async ({ query, config }) => {
  if (!verifyVnpayCallback({ params: query, config })) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid VNPay signature",
      code: "CHECKOUT_PAYMENT_INVALID_VNPAY_SIGNATURE",
    };
  }

  const transactionId = String(query.vnp_TxnRef || "").trim();
  if (!transactionId) {
    return {
      ok: false,
      statusCode: 400,
      message: "Missing VNPay transaction reference",
      code: "CHECKOUT_PAYMENT_VNPAY_TXN_REF_REQUIRED",
    };
  }

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

  const succeeded = isVnpaySuccessResponse(query);
  await markTransactionStatus({
    transaction,
    order,
    success: succeeded,
    metadataPatch: {
      vnpayReturnPayload: query,
    },
  });

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: transaction,
      payment: transaction,
      order,
      success: succeeded,
      redirectUrl: buildProviderResultRedirectUrl({ config, transaction, order, success: succeeded }),
    },
  };
};

const handleVnpayDemoReturn = async ({ paymentId, config }) => {
  if (!paymentId) {
    return {
      ok: false,
      statusCode: 400,
      message: "paymentId is required",
      code: "CHECKOUT_PAYMENT_ID_REQUIRED",
    };
  }

  const transaction = await PaymentTransaction.findById(paymentId);
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

  await markTransactionStatus({
    transaction,
    order,
    success: true,
    metadataPatch: {
      demoReturn: {
        at: new Date().toISOString(),
        provider: "vnpay-demo-fallback",
      },
    },
  });

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: transaction,
      payment: transaction,
      order,
      success: true,
      redirectUrl: buildProviderResultRedirectUrl({ config, transaction, order, success: true }),
    },
  };
};

const handleMomoReturn = async ({ query, config }) => {
  if (!verifyMomoCallback({ params: query, config })) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid MoMo signature",
      code: "CHECKOUT_PAYMENT_INVALID_MOMO_SIGNATURE",
    };
  }

  const transaction = await findMomoTransaction(query);
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

  const succeeded = isMomoSuccessResponse(query);
  await markTransactionStatus({
    transaction,
    order,
    success: succeeded,
    metadataPatch: {
      momoReturnPayload: query,
    },
  });

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: transaction,
      payment: transaction,
      order,
      success: succeeded,
      redirectUrl: buildProviderResultRedirectUrl({ config, transaction, order, success: succeeded }),
    },
  };
};

const handleMomoDemoReturn = async ({ paymentId, config }) => {
  if (!paymentId) {
    return {
      ok: false,
      statusCode: 400,
      message: "paymentId is required",
      code: "CHECKOUT_PAYMENT_ID_REQUIRED",
    };
  }

  const transaction = await PaymentTransaction.findById(paymentId);
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

  await markTransactionStatus({
    transaction,
    order,
    success: true,
    metadataPatch: {
      demoReturn: {
        at: new Date().toISOString(),
        provider: "momo-demo-fallback",
      },
    },
  });

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: transaction,
      payment: transaction,
      order,
      success: true,
      redirectUrl: buildProviderResultRedirectUrl({ config, transaction, order, success: true }),
    },
  };
};

const handleMomoIpn = async ({ payload, config }) => {
  if (!verifyMomoCallback({ params: payload, config })) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid MoMo signature",
      code: "CHECKOUT_PAYMENT_INVALID_MOMO_SIGNATURE",
    };
  }

  const transaction = await findMomoTransaction(payload);
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

  const succeeded = isMomoSuccessResponse(payload);
  await markTransactionStatus({
    transaction,
    order,
    success: succeeded,
    metadataPatch: {
      momoIpnPayload: payload,
    },
  });

  return {
    ok: true,
    statusCode: 204,
    data: null,
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
  handleVnpayReturn,
  handleVnpayDemoReturn,
  handleMomoReturn,
  handleMomoDemoReturn,
  handleMomoIpn,
  getPaymentById,
};
