const express = require("express");
const { healthCheck, readyCheck } = require("../controllers/healthController");
const feedbackController = require("../controllers/feedbackController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authRequired } = require("../middleware/authMiddleware");
const { adminRequired } = require("../middleware/adminMiddleware");
const { internalAuthRequired } = require("../middleware/internalAuthMiddleware");

const createSupportRoutes = (config) => {
  const router = express.Router();
  const requireAuth = authRequired(config);
  const requireInternal = internalAuthRequired(config);

  router.get("/health", healthCheck);
  router.get("/ready", readyCheck);

  router.post("/feedback", requireAuth, asyncHandler(feedbackController.submitFeedback));
  router.get("/feedback/me", requireAuth, asyncHandler(feedbackController.getMyFeedback));
  router.get(
    "/feedback/conversations/me",
    requireAuth,
    asyncHandler(feedbackController.getMyConversations)
  );
  router.post(
    "/feedback/conversations/:id/messages",
    requireAuth,
    asyncHandler(feedbackController.postMyConversationMessage)
  );
  router.post(
    "/internal/handoffs",
    requireInternal,
    asyncHandler(feedbackController.createAssistantHandoff)
  );

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
  router.post(
    "/admin/feedback/conversations/:id/messages",
    requireAuth,
    adminRequired,
    asyncHandler(feedbackController.postAdminConversationMessage)
  );

  return router;
};

module.exports = {
  createSupportRoutes,
};
