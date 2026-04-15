const express = require("express");
const { healthCheck, readyCheck } = require("../controllers/healthController");
const productController = require("../controllers/productController");
const searchController = require("../controllers/searchController");
const reviewController = require("../controllers/reviewController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authRequired, authOptional } = require("../middleware/authMiddleware");
const { adminRequired } = require("../middleware/adminMiddleware");

const createCatalogRoutes = (config) => {
  const router = express.Router();
  const requireAuth = authRequired(config);
  const optionalAuth = authOptional(config);

  router.get("/health", healthCheck);
  router.get("/ready", readyCheck);

  router.get("/products", asyncHandler(productController.listProducts));
  router.get("/products/:id", asyncHandler(productController.getProductById));
  router.post(
    "/products",
    requireAuth,
    adminRequired,
    asyncHandler(productController.createProduct)
  );
  router.put(
    "/products/:id",
    requireAuth,
    adminRequired,
    asyncHandler(productController.updateProduct)
  );
  router.delete(
    "/products/:id",
    requireAuth,
    adminRequired,
    asyncHandler(productController.deleteProduct)
  );

  router.get("/search", asyncHandler(searchController.searchProducts));

  router.get(
    "/products/:id/reviews",
    asyncHandler(reviewController.listReviewsByProduct)
  );
  router.post(
    "/products/:id/reviews",
    requireAuth,
    asyncHandler(reviewController.createReview)
  );
  router.put("/reviews/:id", requireAuth, asyncHandler(reviewController.updateReview));
  router.delete(
    "/reviews/:id",
    requireAuth,
    asyncHandler(reviewController.deleteReview)
  );

  // Compatibility aliases for existing UI flow
  router.post("/products/list", asyncHandler(productController.listProductsByIds));
  router.get(
    "/products/similar/:type",
    asyncHandler(productController.listSimilarProducts)
  );

  router.post("/search/filter", asyncHandler(searchController.filterProductsLegacy));
  router.get("/search/top24", asyncHandler(searchController.top24Legacy));
  router.get("/search/top10", asyncHandler(searchController.top10Legacy));
  router.get("/search/sale10", asyncHandler(searchController.sale10Legacy));
  router.get("/search/topAuthors", asyncHandler(searchController.topAuthorsLegacy));

  router.get("/feedback/:bookId", asyncHandler(reviewController.listFeedbackLegacy));
  router.post(
    "/feedback/:bookId",
    requireAuth,
    asyncHandler(reviewController.createFeedbackLegacy)
  );
  router.delete(
    "/feedback/:feedbackId",
    optionalAuth,
    asyncHandler(reviewController.deleteFeedbackLegacy)
  );

  return router;
};

module.exports = {
  createCatalogRoutes,
};
