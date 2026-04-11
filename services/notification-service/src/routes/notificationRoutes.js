const express = require("express");
const { healthCheck } = require("../controllers/healthController");
const notificationController = require("../controllers/notificationController");

const createNotificationRoutes = () => {
  const router = express.Router();

  router.get("/health", healthCheck);
  router.post("/send-verification-email", notificationController.sendVerificationEmail);
  router.post("/send-order-email", notificationController.sendOrderEmail);
  router.post("/send-order-status-email", notificationController.sendOrderStatusEmail);
  router.post("/send-support-email", notificationController.sendSupportEmail);

  return router;
};

module.exports = {
  createNotificationRoutes,
};
