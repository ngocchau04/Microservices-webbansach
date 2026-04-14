const express = require("express");
const { healthCheck } = require("../controllers/healthController");
const notificationController = require("../controllers/notificationController");
const { internalAuthRequired } = require("../middleware/internalAuthMiddleware");

const createNotificationRoutes = (config) => {
  const router = express.Router();
  const requireInternalAuth = internalAuthRequired(config);

  router.get("/health", healthCheck);
  router.post(
    "/send-verification-email",
    requireInternalAuth,
    notificationController.sendVerificationEmail
  );
  router.post("/send-order-email", requireInternalAuth, notificationController.sendOrderEmail);
  router.post(
    "/send-order-status-email",
    requireInternalAuth,
    notificationController.sendOrderStatusEmail
  );
  router.post("/send-support-email", requireInternalAuth, notificationController.sendSupportEmail);

  return router;
};

module.exports = {
  createNotificationRoutes,
};
