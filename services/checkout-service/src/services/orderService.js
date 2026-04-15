const Order = require("../models/Order");
const Cart = require("../models/Cart");
const voucherService = require("./voucherService");
const { fetchProductSnapshot } = require("./catalogClient");
const { sendOrderEmail, sendOrderStatusEmail } = require("./notificationClient");
const { roundMoney } = require("../utils/money");

const REVIEW_WINDOW_DAYS = 14;
const RETURN_WINDOW_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RETURN_FLOW_SET = new Set([
  "return_requested",
  "return_processing",
  "return_accepted",
  "return_rejected",
  "returned",
]);

const ADMIN_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  received: [],
  completed: [],
  return_requested: ["return_processing", "return_accepted", "return_rejected"],
  return_processing: ["returned", "return_rejected"],
  return_accepted: ["returned"],
  return_rejected: [],
  returned: [],
  cancelled: [],
};

const mapOrderLegacy = (order) => ({
  _id: order._id,
  userId: order.userId,
  name: order.shippingInfo?.name,
  phone: order.shippingInfo?.phone,
  email: order.shippingInfo?.email,
  address: order.shippingInfo?.address,
  products: order.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    title: item.title,
    price: item.price,
    image: item.image,
  })),
  type: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  status: order.orderStatus,
  total: order.totals?.total || 0,
  discount: order.totals?.discount || 0,
  subtotal: order.totals?.subtotal || 0,
  deliveredAt: order.deliveredAt || null,
  receivedAt: order.receivedAt || null,
  reviewedAt: order.reviewedAt || null,
  completedAt: order.completedAt || null,
  createdAt: order.createdAt,
  returnRequestReason: order.returnRequestReason || "",
  returnRequestedAt: order.returnRequestedAt || null,
});

const hasProductInOrder = (order, productId) =>
  Array.isArray(order?.items) &&
  order.items.some((item) => String(item?.productId) === String(productId));

const resolveReceiptAt = (order) => {
  if (order?.receivedAt) {
    return new Date(order.receivedAt);
  }
  if (order?.updatedAt) {
    return new Date(order.updatedAt);
  }
  return null;
};

const buildPostDeliveryWindow = ({ order, now = new Date() }) => {
  const receiptAt = resolveReceiptAt(order);
  if (!receiptAt || Number.isNaN(receiptAt.getTime())) {
    return {
      receiptAt: null,
      reviewDeadlineAt: null,
      returnDeadlineAt: null,
      reviewWindowOpen: false,
      returnWindowOpen: false,
    };
  }

  const reviewDeadlineAt = new Date(receiptAt.getTime() + REVIEW_WINDOW_DAYS * DAY_IN_MS);
  const returnDeadlineAt = new Date(receiptAt.getTime() + RETURN_WINDOW_DAYS * DAY_IN_MS);

  return {
    receiptAt,
    reviewDeadlineAt,
    returnDeadlineAt,
    reviewWindowOpen: now.getTime() <= reviewDeadlineAt.getTime(),
    returnWindowOpen: now.getTime() <= returnDeadlineAt.getTime(),
  };
};

const emitOrderConfirmationEmail = async ({ order, config }) => {
  try {
    await sendOrderEmail({ config, order });
  } catch (error) {
    console.warn(
      `[checkout-service] send order confirmation email failed for order=${order._id}: ${error.message}`
    );
  }
};

const emitOrderStatusEmail = async ({ order, previousStatus, config }) => {
  try {
    await sendOrderStatusEmail({
      config,
      order,
      previousStatus,
    });
  } catch (error) {
    console.warn(
      `[checkout-service] send order status email failed for order=${order._id}: ${error.message}`
    );
  }
};

const normalizeInputItems = async ({ payload, userId, config }) => {
  const payloadItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.products)
    ? payload.products.map((item) => ({
        productId: item.productId || item.id,
        quantity: item.quantity,
      }))
    : [];

  if (!payloadItems.length) {
    const cart = await Cart.findOne({ userId });
    if (!cart || !cart.items.length) {
      return {
        ok: false,
        statusCode: 400,
        message: "No order items provided and cart is empty",
        code: "CHECKOUT_EMPTY_ORDER_ITEMS",
      };
    }

    return {
      ok: true,
      data: {
        items: cart.items.map((item) => ({
          productId: item.productId,
          title: item.title,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          stockSnapshot: item.stockSnapshot,
        })),
      },
    };
  }

  const snapshots = [];

  for (const input of payloadItems) {
    const productId = String(input.productId || "");
    const quantity = Number(input.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return {
        ok: false,
        statusCode: 400,
        message: "Invalid product item payload",
        code: "CHECKOUT_INVALID_ORDER_ITEM",
      };
    }

    const snapshotResult = await fetchProductSnapshot({ config, productId });
    if (!snapshotResult.ok) {
      return snapshotResult;
    }

    const snapshot = snapshotResult.data;
    if (quantity > snapshot.stockSnapshot) {
      return {
        ok: false,
        statusCode: 400,
        message: `Quantity for product ${productId} exceeds stock`,
        code: "CHECKOUT_STOCK_EXCEEDED",
      };
    }

    snapshots.push({
      productId: snapshot.productId,
      title: snapshot.title,
      price: snapshot.price,
      image: snapshot.image,
      quantity,
      stockSnapshot: snapshot.stockSnapshot,
    });
  }

  return {
    ok: true,
    data: { items: snapshots },
  };
};

const VOUCHER_ORDER_REJECT_MESSAGE = "Voucher đã hết hoặc không tồn tại !";

const resolveTotals = async ({ items, payload, cart }) => {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  );

  let voucherInfo = {
    code: null,
    type: null,
    value: 0,
    discountAmount: 0,
  };

  const rawVoucherCode =
    payload.voucherCode ||
    payload.voucher?.code ||
    payload.appliedVoucherCode ||
    cart?.appliedVoucher?.code ||
    null;

  const voucherCode =
    rawVoucherCode != null && String(rawVoucherCode).trim()
      ? String(rawVoucherCode).trim()
      : null;

  if (voucherCode) {
    const voucherResult = await voucherService.resolveApplicableVoucher({
      code: voucherCode,
      subtotal,
    });

    if (!voucherResult.ok) {
      return {
        ok: false,
        statusCode: voucherResult.statusCode >= 400 && voucherResult.statusCode < 500
          ? voucherResult.statusCode
          : 400,
        message: VOUCHER_ORDER_REJECT_MESSAGE,
        code: voucherResult.code || "CHECKOUT_VOUCHER_INVALID",
      };
    }

    voucherInfo = {
      code: voucherResult.data.voucher.code,
      type: voucherResult.data.voucher.type,
      value: voucherResult.data.voucher.value,
      discountAmount: voucherResult.data.discount,
    };
  }

  const discount = roundMoney(voucherInfo.discountAmount || 0);
  const total = roundMoney(Math.max(subtotal - discount, 0));

  return {
    ok: true,
    data: {
      subtotal,
      discount,
      total,
      voucherInfo,
    },
  };
};

const createOrder = async ({ user, payload, config }) => {
  const userId = String(payload.userId || user.userId);

  if (String(user.userId) !== userId && user.role !== "admin") {
    return {
      ok: false,
      statusCode: 403,
      message: "Permission denied",
      code: "CHECKOUT_FORBIDDEN",
    };
  }

  const shippingInfo = {
    name: String(payload.name || payload.shippingInfo?.name || "").trim(),
    phone: String(payload.phone || payload.shippingInfo?.phone || "").trim(),
    email: String(payload.email || payload.shippingInfo?.email || user.email || "").trim(),
    address: String(payload.address || payload.shippingInfo?.address || "").trim(),
  };

  if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.email || !shippingInfo.address) {
    return {
      ok: false,
      statusCode: 400,
      message: "Shipping info is required",
      code: "CHECKOUT_SHIPPING_REQUIRED",
    };
  }

  const itemResult = await normalizeInputItems({ payload, userId, config });
  if (!itemResult.ok) {
    return itemResult;
  }

  const cart = await Cart.findOne({ userId });
  const totalsResult = await resolveTotals({
    items: itemResult.data.items,
    payload,
    cart,
  });

  if (!totalsResult.ok) {
    return totalsResult;
  }

  const totals = totalsResult.data;

  const paymentMethod = payload.paymentMethod || payload.type || "cod";
  const paymentStatus = paymentMethod === "online" ? "pending" : "unpaid";

  const order = await Order.create({
    userId,
    items: itemResult.data.items,
    shippingInfo,
    paymentMethod,
    paymentStatus,
    orderStatus: "pending",
    voucherInfo: totals.voucherInfo,
    totals: {
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
    },
  });

  if (totals.voucherInfo.code) {
    await voucherService.incrementVoucherUsage({ code: totals.voucherInfo.code });
  }

  if (cart) {
    const purchasedIds = new Set(itemResult.data.items.map((item) => String(item.productId)));
    cart.items = cart.items.filter((item) => !purchasedIds.has(String(item.productId)));
    if (!cart.items.length) {
      cart.appliedVoucher = null;
    }
    const subtotal = roundMoney(
      cart.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
    );
    cart.subtotal = subtotal;
    cart.discount = 0;
    cart.total = subtotal;
    await cart.save();
  }

  await emitOrderConfirmationEmail({ order, config });

  return {
    ok: true,
    statusCode: 201,
    data: {
      item: order,
      order,
    },
    legacy: {
      status: "success",
      data: mapOrderLegacy(order),
    },
  };
};

const listMyOrders = async ({ userId }) => {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });

  return {
    ok: true,
    statusCode: 200,
    data: {
      items: orders,
    },
    legacy: {
      status: "success",
      data: orders.map(mapOrderLegacy),
    },
  };
};

const listOrdersByUserId = async ({ requester, userId }) => {
  if (String(requester.userId) !== String(userId) && requester.role !== "admin") {
    return {
      ok: false,
      statusCode: 403,
      message: "Permission denied",
      code: "CHECKOUT_FORBIDDEN",
    };
  }

  return listMyOrders({ userId: String(userId) });
};

const getOrderById = async ({ requester, orderId }) => {
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

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: order,
      order,
    },
    legacy: {
      status: "success",
      data: mapOrderLegacy(order),
    },
  };
};

const cancelOrder = async ({ requester, orderId, config }) => {
  const order = await Order.findById(orderId);

  if (!order) {
    return {
      ok: false,
      statusCode: 404,
      message: "Order not found",
      code: "CHECKOUT_ORDER_NOT_FOUND",
    };
  }

  if (String(order.userId) !== String(requester.userId)) {
    return {
      ok: false,
      statusCode: 403,
      message: "Permission denied",
      code: "CHECKOUT_FORBIDDEN",
    };
  }

  if (!["pending", "confirmed"].includes(order.orderStatus)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Order can no longer be cancelled",
      code: "CHECKOUT_INVALID_ORDER_TRANSITION",
    };
  }

  const previousStatus = order.orderStatus;
  order.orderStatus = "cancelled";
  order.paymentStatus = "cancelled";
  await order.save();
  await emitOrderStatusEmail({ order, previousStatus, config });

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: order,
      order,
    },
    legacy: {
      status: "success",
      data: mapOrderLegacy(order),
    },
  };
};

const listAdminOrders = async () => {
  const orders = await Order.find().sort({ createdAt: -1 });

  return {
    ok: true,
    statusCode: 200,
    data: {
      items: orders,
    },
    legacy: {
      status: "success",
      data: orders.map(mapOrderLegacy),
    },
  };
};

const confirmOrderReceived = async ({ requester, orderId, config }) => {
  const order = await Order.findById(orderId);

  if (!order) {
    return {
      ok: false,
      statusCode: 404,
      message: "Order not found",
      code: "CHECKOUT_ORDER_NOT_FOUND",
    };
  }

  if (String(order.userId) !== String(requester.userId)) {
    return {
      ok: false,
      statusCode: 403,
      message: "Permission denied",
      code: "CHECKOUT_FORBIDDEN",
    };
  }

  if (order.orderStatus !== "delivered") {
    return {
      ok: false,
      statusCode: 400,
      message: "Chỉ có thể xác nhận nhận hàng khi đơn ở trạng thái đã giao.",
      code: "CHECKOUT_RECEIPT_CONFIRM_NOT_ALLOWED",
    };
  }

  const previousStatus = order.orderStatus;
  const now = new Date();
  order.orderStatus = "received";
  order.receivedAt = now;
  if (order.paymentMethod === "cod" && order.paymentStatus === "unpaid") {
    order.paymentStatus = "paid";
  }
  await order.save();
  await emitOrderStatusEmail({ order, previousStatus, config });

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: order,
      order,
    },
    legacy: {
      status: "success",
      data: mapOrderLegacy(order),
    },
  };
};

const checkReviewEligibility = async ({ requester, productId, orderId = null }) => {
  const pid = String(productId || "").trim();
  const oid = String(orderId || "").trim();

  if (!pid) {
    return {
      ok: false,
      statusCode: 400,
      message: "productId is required",
      code: "CHECKOUT_PRODUCT_REQUIRED",
    };
  }

  let orders = [];
  if (oid) {
    const candidate = await Order.findById(oid);
    if (candidate && String(candidate.userId) === String(requester.userId)) {
      orders = [candidate];
    }
  } else {
    orders = await Order.find({ userId: String(requester.userId), "items.productId": pid }).sort({
      createdAt: -1,
    });
  }

  if (!orders.length) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        eligible: false,
        reasonCode: "NOT_PURCHASED",
        message: "Bạn chỉ có thể đánh giá sản phẩm đã mua.",
      },
    };
  }

  const matchedOrder = orders.find((order) => hasProductInOrder(order, pid));
  if (!matchedOrder) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        eligible: false,
        reasonCode: "NOT_PURCHASED",
        message: "Bạn chỉ có thể đánh giá sản phẩm đã mua.",
      },
    };
  }

  const status = String(matchedOrder.orderStatus || "").toLowerCase();
  const postWindow = buildPostDeliveryWindow({ order: matchedOrder });
  const payload = {
    orderId: matchedOrder._id,
    orderStatus: status,
    receiptConfirmedAt: postWindow.receiptAt,
    reviewDeadlineAt: postWindow.reviewDeadlineAt,
    returnDeadlineAt: postWindow.returnDeadlineAt,
    reviewWindowOpen: postWindow.reviewWindowOpen,
    returnWindowOpen: postWindow.returnWindowOpen,
  };

  if (RETURN_FLOW_SET.has(status)) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        ...payload,
        eligible: false,
        reasonCode: "ORDER_IN_RETURN_FLOW",
        message: "Đơn hàng đang trong quy trình hoàn trả nên không thể đánh giá.",
      },
    };
  }

  if (status === "completed") {
    return {
      ok: true,
      statusCode: 200,
      data: {
        ...payload,
        eligible: false,
        reasonCode: "ORDER_FINALIZED",
        message: "Đơn hàng đã hoàn tất sau đánh giá.",
      },
    };
  }

  if (status !== "received") {
    return {
      ok: true,
      statusCode: 200,
      data: {
        ...payload,
        eligible: false,
        reasonCode: "RECEIPT_NOT_CONFIRMED",
        message: "Bạn cần xác nhận đã nhận hàng trước khi đánh giá.",
      },
    };
  }

  if (!postWindow.reviewWindowOpen) {
    return {
      ok: true,
      statusCode: 200,
      data: {
        ...payload,
        eligible: false,
        reasonCode: "REVIEW_WINDOW_EXPIRED",
        message: "Đã quá thời hạn 14 ngày để đánh giá sản phẩm.",
      },
    };
  }

  return {
    ok: true,
    statusCode: 200,
    data: {
      ...payload,
      eligible: true,
      reasonCode: null,
      message: "Đủ điều kiện đánh giá.",
    },
  };
};

const completeOrderAfterReview = async ({ requester, orderId, productId, config }) => {
  const order = await Order.findById(orderId);

  if (!order) {
    return {
      ok: false,
      statusCode: 404,
      message: "Order not found",
      code: "CHECKOUT_ORDER_NOT_FOUND",
    };
  }

  if (String(order.userId) !== String(requester.userId)) {
    return {
      ok: false,
      statusCode: 403,
      message: "Permission denied",
      code: "CHECKOUT_FORBIDDEN",
    };
  }

  const pid = String(productId || "").trim();
  if (!pid || !hasProductInOrder(order, pid)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Product does not belong to this order",
      code: "CHECKOUT_REVIEW_ORDER_MISMATCH",
    };
  }

  if (order.orderStatus !== "received") {
    return {
      ok: false,
      statusCode: 400,
      message: "Order is not eligible for post-delivery review completion",
      code: "CHECKOUT_INVALID_ORDER_TRANSITION",
    };
  }

  const windowInfo = buildPostDeliveryWindow({ order });
  if (!windowInfo.reviewWindowOpen) {
    return {
      ok: false,
      statusCode: 400,
      message: "Review window expired",
      code: "CHECKOUT_REVIEW_WINDOW_EXPIRED",
    };
  }

  const previousStatus = order.orderStatus;
  const now = new Date();
  order.orderStatus = "completed";
  order.reviewedAt = now;
  order.completedAt = now;
  if (order.paymentMethod === "cod" && order.paymentStatus === "unpaid") {
    order.paymentStatus = "paid";
  }
  await order.save();
  await emitOrderStatusEmail({ order, previousStatus, config });

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: order,
      order,
    },
    legacy: {
      status: "success",
      data: mapOrderLegacy(order),
    },
  };
};

const requestOrderReturn = async ({ requester, orderId, reason, config }) => {
  const order = await Order.findById(orderId);

  if (!order) {
    return {
      ok: false,
      statusCode: 404,
      message: "Order not found",
      code: "CHECKOUT_ORDER_NOT_FOUND",
    };
  }

  if (String(order.userId) !== String(requester.userId)) {
    return {
      ok: false,
      statusCode: 403,
      message: "Permission denied",
      code: "CHECKOUT_FORBIDDEN",
    };
  }

  if (order.orderStatus !== "received") {
    return {
      ok: false,
      statusCode: 400,
      message: "Chỉ có thể yêu cầu hoàn trả sau khi đã xác nhận nhận hàng.",
      code: "CHECKOUT_RETURN_NOT_ALLOWED",
    };
  }

  const windowInfo = buildPostDeliveryWindow({ order });
  if (!windowInfo.returnWindowOpen) {
    return {
      ok: false,
      statusCode: 400,
      message: "Đã quá thời hạn 7 ngày để gửi yêu cầu hoàn trả.",
      code: "CHECKOUT_RETURN_WINDOW_EXPIRED",
    };
  }

  const trimmed = String(reason || "").trim();
  if (!trimmed) {
    return {
      ok: false,
      statusCode: 400,
      message: "Vui lòng nhập lý do hoàn trả.",
      code: "CHECKOUT_RETURN_REASON_REQUIRED",
    };
  }

  const previousStatus = order.orderStatus;
  order.orderStatus = "return_requested";
  order.returnRequestReason = trimmed.slice(0, 2000);
  order.returnRequestedAt = new Date();

  await order.save();
  await emitOrderStatusEmail({ order, previousStatus, config });

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: order,
      order,
    },
    legacy: {
      status: "success",
      data: mapOrderLegacy(order),
    },
  };
};

const updateAdminOrderStatus = async ({ orderId, nextStatus, config }) => {
  const order = await Order.findById(orderId);

  if (!order) {
    return {
      ok: false,
      statusCode: 404,
      message: "Order not found",
      code: "CHECKOUT_ORDER_NOT_FOUND",
    };
  }

  const allowedStatuses = ADMIN_TRANSITIONS[order.orderStatus] || [];
  if (!allowedStatuses.includes(nextStatus)) {
    return {
      ok: false,
      statusCode: 400,
      message: `Invalid order status transition from ${order.orderStatus} to ${nextStatus}`,
      code: "CHECKOUT_INVALID_ORDER_TRANSITION",
    };
  }

  const previousStatus = order.orderStatus;
  order.orderStatus = nextStatus;

  if (nextStatus === "delivered") {
    order.deliveredAt = new Date();
  }

  if (nextStatus === "completed") {
    order.paymentStatus = order.paymentMethod === "cod" ? "paid" : order.paymentStatus;
    order.completedAt = new Date();
  }

  if (nextStatus === "cancelled") {
    order.paymentStatus = "cancelled";
  }

  await order.save();
  await emitOrderStatusEmail({ order, previousStatus, config });

  return {
    ok: true,
    statusCode: 200,
    data: {
      item: order,
      order,
    },
    legacy: {
      status: "success",
      data: mapOrderLegacy(order),
    },
  };
};

module.exports = {
  createOrder,
  listMyOrders,
  listOrdersByUserId,
  getOrderById,
  cancelOrder,
  confirmOrderReceived,
  checkReviewEligibility,
  completeOrderAfterReview,
  requestOrderReturn,
  listAdminOrders,
  updateAdminOrderStatus,
  mapOrderLegacy,
  resolveTotals,
};


