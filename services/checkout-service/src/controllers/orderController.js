const orderService = require("../services/orderService");
const { sendServiceResult } = require("../utils/http");

const createOrder = async (req, res) => {
  const result = await orderService.createOrder({
    user: req.user,
    payload: req.body,
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

const getMyOrders = async (req, res) => {
  const result = await orderService.listMyOrders({ userId: req.user.userId });
  return sendServiceResult(res, result);
};

const getOrderById = async (req, res) => {
  const result = await orderService.getOrderById({
    requester: req.user,
    orderId: req.params.id,
  });

  return sendServiceResult(res, result);
};

const cancelOrder = async (req, res) => {
  const result = await orderService.cancelOrder({
    requester: req.user,
    orderId: req.params.id,
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

const listAdminOrders = async (req, res) => {
  const result = await orderService.listAdminOrders();
  return sendServiceResult(res, result);
};

const updateAdminOrderStatus = async (req, res) => {
  const result = await orderService.updateAdminOrderStatus({
    orderId: req.params.id,
    nextStatus: req.body.status,
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

// Legacy compatibility endpoints
const listOrdersLegacy = async (req, res) => {
  if (req.user.role === "admin") {
    return listAdminOrders(req, res);
  }

  return getMyOrders(req, res);
};

const updateOrderStatusLegacy = async (req, res) => {
  return updateAdminOrderStatus(req, res);
};

const listOrdersByUserLegacy = async (req, res) => {
  const result = await orderService.listOrdersByUserId({
    requester: req.user,
    userId: req.params.userId,
  });

  if (result.ok) {
    // Keep raw array shape for old profile/admin-user screens
    return res.status(200).json(result.data.items.map(orderService.mapOrderLegacy));
  }

  return sendServiceResult(res, result);
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  listAdminOrders,
  updateAdminOrderStatus,
  listOrdersLegacy,
  updateOrderStatusLegacy,
  listOrdersByUserLegacy,
};

