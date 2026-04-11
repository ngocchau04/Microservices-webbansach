const express = require("express");
const { healthCheck } = require("../controllers/healthController");
const feedbackController = require("../controllers/feedbackController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authRequired } = require("../middleware/authMiddleware");
const { adminRequired } = require("../middleware/adminMiddleware");

const createSupportRoutes = (config) => {
  const router = express.Router();
  const requireAuth = authRequired(config);

  router.get("/health", healthCheck);

  router.post("/feedback", requireAuth, asyncHandler(feedbackController.submitFeedback));
  router.get("/feedback/me", requireAuth, asyncHandler(feedbackController.getMyFeedback));

  router.get(
    "/admin/feedback",
    requireAuth,
    adminRequired,
    asyncHandler(feedbackController.getAdminFeedback)
  );
  router.patch(
    "/admin/feedback/:id/status",
    requireAuth,
    adminRequired,
    asyncHandler(feedbackController.updateAdminFeedbackStatus)
  );

  return router;
};

module.exports = {
  createSupportRoutes,
};
