const feedbackService = require("../services/feedbackService");
const { sendServiceResult } = require("../utils/http");

const submitFeedback = async (req, res) => {
  const result = await feedbackService.createFeedback({
    user: req.user,
    payload: req.body,
    config: req.app.locals.config,
    requestMeta: {
      userAgent: req.get("user-agent") || "",
      ipAddress: req.ip || "",
    },
  });

  return sendServiceResult(res, result);
};

const getMyFeedback = async (req, res) => {
  const result = await feedbackService.listMyFeedback({
    userId: req.user.userId,
  });

  return sendServiceResult(res, result);
};

const getAdminFeedback = async (req, res) => {
  const result = await feedbackService.listAdminFeedback();
  return sendServiceResult(res, result);
};

const updateAdminFeedbackStatus = async (req, res) => {
  const result = await feedbackService.updateFeedbackStatus({
    feedbackId: req.params.id,
    status: req.body.status,
    adminMessage: req.body.message,
  });

  return sendServiceResult(res, result);
};

module.exports = {
  submitFeedback,
  getMyFeedback,
  getAdminFeedback,
  updateAdminFeedbackStatus,
};
