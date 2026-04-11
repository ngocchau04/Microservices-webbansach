const express = require("express");
const { healthCheck } = require("../controllers/healthController");
const cartController = require("../controllers/cartController");
const voucherController = require("../controllers/voucherController");
const orderController = require("../controllers/orderController");
const paymentController = require("../controllers/paymentController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authRequired } = require("../middleware/authMiddleware");
const { adminRequired } = require("../middleware/adminMiddleware");

const createCheckoutRoutes = (config) => {
  const router = express.Router();
  const requireAuth = authRequired(config);

  router.get("/health", healthCheck);

  router.get("/cart", requireAuth, asyncHandler(cartController.getCart));
  router.post("/cart/items", requireAuth, asyncHandler(cartController.addCartItem));
  router.patch("/cart/items/:itemId", requireAuth, asyncHandler(cartController.updateCartItem));
  router.delete("/cart/items/:itemId", requireAuth, asyncHandler(cartController.removeCartItem));
  router.delete("/cart", requireAuth, asyncHandler(cartController.clearCart));

  router.post("/vouchers/validate", asyncHandler(voucherController.validateVoucher));
  router.post("/vouchers/apply", requireAuth, asyncHandler(voucherController.applyVoucher));
  router.get("/vouchers/available", asyncHandler(voucherController.listAvailable));

  router.post("/orders", requireAuth, asyncHandler(orderController.createOrder));
  router.get("/orders/me", requireAuth, asyncHandler(orderController.getMyOrders));
  router.get("/orders/:id", requireAuth, asyncHandler(orderController.getOrderById));
  router.patch("/orders/:id/cancel", requireAuth, asyncHandler(orderController.cancelOrder));

  router.get("/admin/orders", requireAuth, adminRequired, asyncHandler(orderController.listAdminOrders));
  router.patch(
    "/admin/orders/:id/status",
    requireAuth,
    adminRequired,
    asyncHandler(orderController.updateAdminOrderStatus)
  );

  router.post("/payments/create", requireAuth, asyncHandler(paymentController.createPayment));
  router.post("/payments/webhook", asyncHandler(paymentController.paymentWebhook));
  router.get("/payments/:id", requireAuth, asyncHandler(paymentController.getPaymentById));

  // Legacy compatibility aliases used by existing UI
  router.post("/cart", requireAuth, asyncHandler(cartController.upsertCartItemLegacy));
  router.delete("/cart/list", requireAuth, asyncHandler(cartController.removeCartItemsLegacy));

  router.get("/vouchers", asyncHandler(voucherController.listAvailable));
  router.get("/vouchers/:voucherCode", asyncHandler(voucherController.getVoucherByCode));
  router.post("/vouchers", requireAuth, adminRequired, asyncHandler(voucherController.createVoucher));
  router.delete("/vouchers/:id", requireAuth, adminRequired, asyncHandler(voucherController.deleteVoucher));

  router.get("/orders", requireAuth, asyncHandler(orderController.listOrdersLegacy));
  router.put(
    "/orders/:id/status",
    requireAuth,
    adminRequired,
    asyncHandler(orderController.updateOrderStatusLegacy)
  );
  router.get("/users/:userId/orders", requireAuth, asyncHandler(orderController.listOrdersByUserLegacy));

  return router;
};

module.exports = {
  createCheckoutRoutes,
};

