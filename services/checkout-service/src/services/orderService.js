const Order = require("../models/Order");
const Cart = require("../models/Cart");
const voucherService = require("./voucherService");
const { fetchProductSnapshot } = require("./catalogClient");
const { sendOrderEmail, sendOrderStatusEmail } = require("./notificationClient");
const { roundMoney } = require("../utils/money");

const ADMIN_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["completed", "returned"],
  completed: [],
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
  createdAt: order.createdAt,
});

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

  const voucherCode =
    payload.voucherCode ||
    payload.voucher?.code ||
    payload.appliedVoucherCode ||
    cart?.appliedVoucher?.code ||
    null;

  if (voucherCode) {
    const voucherResult = await voucherService.resolveApplicableVoucher({
      code: voucherCode,
      subtotal,
    });

    if (voucherResult.ok) {
      voucherInfo = {
        code: voucherResult.data.voucher.code,
        type: voucherResult.data.voucher.type,
        value: voucherResult.data.voucher.value,
        discountAmount: voucherResult.data.discount,
      };
    }
  }

  const discount = roundMoney(voucherInfo.discountAmount || 0);
  const total = roundMoney(Math.max(subtotal - discount, 0));

  return {
    subtotal,
    discount,
    total,
    voucherInfo,
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
  const totals = await resolveTotals({
    items: itemResult.data.items,
    payload,
    cart,
  });

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

  if (nextStatus === "completed") {
    order.paymentStatus = order.paymentMethod === "cod" ? "paid" : order.paymentStatus;
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
  listAdminOrders,
  updateAdminOrderStatus,
  mapOrderLegacy,
};


