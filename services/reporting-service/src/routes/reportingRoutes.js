const express = require("express");
const { healthCheck, readyCheck } = require("../controllers/healthController");
const dashboardController = require("../controllers/dashboardController");
const { authRequired, adminRequired } = require("../middleware/authMiddleware");
const { asyncHandler } = require("../middleware/asyncHandler");

const createReportingRoutes = (config) => {
  const router = express.Router();
  const requireAuth = authRequired(config);

  router.get("/health", healthCheck);
  router.get("/ready", readyCheck);

  router.get(
    "/dashboard/summary",
    requireAuth,
    adminRequired,
    asyncHandler(dashboardController.getSummary)
  );
  router.get(
    "/dashboard/revenue",
    requireAuth,
    adminRequired,
    asyncHandler(dashboardController.getRevenue)
  );
  router.get(
    "/dashboard/top-products",
    requireAuth,
    adminRequired,
    asyncHandler(dashboardController.getTopProducts)
  );
  router.get(
    "/dashboard/order-status",
    requireAuth,
    adminRequired,
    asyncHandler(dashboardController.getOrderStatus)
  );

  return router;
};

module.exports = {
  createReportingRoutes,
};
