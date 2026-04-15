const mongoose = require("mongoose");
const Product = require("../models/Product");
const Review = require("../models/Review");
const { validateReviewPayload } = require("../utils/validators");
const checkoutClient = require("./checkoutClient");

const toPlain = (doc) => (doc ? doc.toObject() : null);

const updateProductRatingSummary = async (productId) => {
  const reviews = await Review.find({ productId });
  const count = reviews.length;
  const avg =
    count > 0
      ? reviews.reduce((sum, item) => sum + Number(item.stars || 0), 0) / count
      : 0;

  await Product.findByIdAndUpdate(productId, {
    rating: Number(avg.toFixed(1)),
    reviewsCount: count,
  });
};

const listReviewsByProduct = async ({ productId }) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid product ID format",
      code: "CATALOG_INVALID_PRODUCT_ID",
    };
  }

  const items = await Review.find({ productId }).sort({ createdAt: -1 });

  return {
    ok: true,
    statusCode: 200,
    data: { items },
    legacy: {
      reviews: items,
    },
  };
};

const createReview = async ({
  productId,
  payload = {},
  actor = null,
  authHeader = "",
  config,
}) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid product ID format",
      code: "CATALOG_INVALID_PRODUCT_ID",
    };
  }

  const validationError = validateReviewPayload(payload);
  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      message: validationError,
      code: "CATALOG_VALIDATION_ERROR",
    };
  }

  const product = await Product.findById(productId);
  if (!product) {
    return {
      ok: false,
      statusCode: 404,
      message: "Product not found",
      code: "CATALOG_PRODUCT_NOT_FOUND",
    };
  }

  if (!actor?.userId) {
    return {
      ok: false,
      statusCode: 401,
      message: "Chỉ người mua đã đăng nhập mới có thể đánh giá.",
      code: "AUTH_UNAUTHORIZED",
    };
  }

  let eligibilityPayload;
  try {
    const eligibility = await checkoutClient.checkReviewEligibility({
      config,
      authHeader,
      productId,
      orderId: payload.orderId,
    });
    eligibilityPayload = eligibility?.data || eligibility;
  } catch (error) {
    return {
      ok: false,
      statusCode: error?.statusCode || 502,
      message: error?.payload?.message || "Không xác minh được điều kiện đánh giá.",
      code: error?.payload?.code || "CATALOG_REVIEW_ELIGIBILITY_UNAVAILABLE",
    };
  }

  if (!eligibilityPayload?.eligible || !eligibilityPayload?.orderId) {
    return {
      ok: false,
      statusCode: 400,
      message:
        eligibilityPayload?.message ||
        "Bạn chưa đủ điều kiện đánh giá sản phẩm này.",
      code: eligibilityPayload?.reasonCode || "CATALOG_REVIEW_NOT_ELIGIBLE",
    };
  }

  const existing = await Review.findOne({
    productId,
    userId: String(actor.userId),
    orderId: String(eligibilityPayload.orderId),
  });
  if (existing) {
    return {
      ok: false,
      statusCode: 409,
      message: "Bạn đã đánh giá sản phẩm này cho đơn hàng đã chọn.",
      code: "CATALOG_REVIEW_ALREADY_EXISTS",
    };
  }

  const created = await Review.create({
    productId,
    userId: actor?.userId || null,
    orderId: String(eligibilityPayload.orderId),
    username: actor?.email || actor?.name || "Anonymous",
    content: payload.content,
    stars: Number(payload.stars ?? payload.rating),
  });

  try {
    await checkoutClient.completeOrderAfterReview({
      config,
      authHeader,
      orderId: String(eligibilityPayload.orderId),
      productId,
    });
  } catch (error) {
    await created.deleteOne();
    return {
      ok: false,
      statusCode: error?.statusCode || 502,
      message:
        error?.payload?.message ||
        "Không thể hoàn tất đơn hàng sau khi đánh giá. Vui lòng thử lại.",
      code: error?.payload?.code || "CATALOG_REVIEW_FINALIZE_ORDER_FAILED",
    };
  }

  await updateProductRatingSummary(productId);

  const item = toPlain(created);

  return {
    ok: true,
    statusCode: 201,
    data: { item },
    legacy: {
      feedback: {
        ...item,
        timestamp: item.createdAt,
      },
    },
  };
};

const updateReview = async ({ reviewId, payload = {}, actor }) => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid review ID format",
      code: "CATALOG_INVALID_REVIEW_ID",
    };
  }

  const validationError = validateReviewPayload(payload);
  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      message: validationError,
      code: "CATALOG_VALIDATION_ERROR",
    };
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    return {
      ok: false,
      statusCode: 404,
      message: "Review not found",
      code: "CATALOG_REVIEW_NOT_FOUND",
    };
  }

  const canEdit =
    actor && (actor.role === "admin" || String(review.userId) === String(actor.userId));

  if (!canEdit) {
    return {
      ok: false,
      statusCode: 403,
      message: "Permission denied",
      code: "AUTH_FORBIDDEN",
    };
  }

  review.set({
    content: payload.content,
    stars: Number(payload.stars ?? payload.rating),
  });
  await review.save();

  await updateProductRatingSummary(review.productId);

  const item = toPlain(review);

  return {
    ok: true,
    statusCode: 200,
    data: { item },
  };
};

const deleteReview = async ({ reviewId, actor = null, force = false }) => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid review ID format",
      code: "CATALOG_INVALID_REVIEW_ID",
    };
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    return {
      ok: false,
      statusCode: 404,
      message: "Review not found",
      code: "CATALOG_REVIEW_NOT_FOUND",
    };
  }

  if (!force) {
    const canDelete =
      actor && (actor.role === "admin" || String(review.userId) === String(actor.userId));

    if (!canDelete) {
      return {
        ok: false,
        statusCode: 403,
        message: "Permission denied",
        code: "AUTH_FORBIDDEN",
      };
    }
  }

  await review.deleteOne();
  await updateProductRatingSummary(review.productId);

  return {
    ok: true,
    statusCode: 200,
    data: { message: "Review deleted successfully" },
    legacy: { message: "Feedback deleted successfully" },
  };
};

module.exports = {
  listReviewsByProduct,
  createReview,
  updateReview,
  deleteReview,
};
