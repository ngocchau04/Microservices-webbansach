const reviewService = require("../services/reviewService");
const { sendServiceResult } = require("../utils/http");

const toLegacyFeedback = (item) => ({
  _id: item._id,
  bookId: item.productId,
  content: item.content,
  stars: item.stars,
  timestamp: item.createdAt,
});

const listReviewsByProduct = async (req, res) => {
  const result = await reviewService.listReviewsByProduct({ productId: req.params.id });
  return sendServiceResult(res, result);
};

const createReview = async (req, res) => {
  const result = await reviewService.createReview({
    productId: req.params.id,
    payload: req.body,
    actor: req.user,
    authHeader: req.headers.authorization || "",
    config: req.app.locals.config,
  });
  return sendServiceResult(res, result);
};

const updateReview = async (req, res) => {
  const result = await reviewService.updateReview({
    reviewId: req.params.id,
    payload: req.body,
    actor: req.user,
  });
  return sendServiceResult(res, result);
};

const deleteReview = async (req, res) => {
  const result = await reviewService.deleteReview({
    reviewId: req.params.id,
    actor: req.user,
  });
  return sendServiceResult(res, result);
};

const listFeedbackLegacy = async (req, res) => {
  const result = await reviewService.listReviewsByProduct({ productId: req.params.bookId });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.status(200).json(result.data.items.map(toLegacyFeedback));
};

const createFeedbackLegacy = async (req, res) => {
  const result = await reviewService.createReview({
    productId: req.params.bookId,
    payload: req.body,
    actor: req.user,
    authHeader: req.headers.authorization || "",
    config: req.app.locals.config,
  });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.status(201).json({
    feedback: toLegacyFeedback(result.data.item),
  });
};

const deleteFeedbackLegacy = async (req, res) => {
  const result = await reviewService.deleteReview({
    reviewId: req.params.feedbackId,
    actor: req.user,
    force: true,
  });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.status(200).json({
    message: "Feedback deleted successfully",
  });
};

module.exports = {
  listReviewsByProduct,
  createReview,
  updateReview,
  deleteReview,
  listFeedbackLegacy,
  createFeedbackLegacy,
  deleteFeedbackLegacy,
};
