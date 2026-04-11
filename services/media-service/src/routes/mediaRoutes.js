const express = require("express");
const { healthCheck } = require("../controllers/healthController");
const mediaController = require("../controllers/mediaController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authRequired } = require("../middleware/authMiddleware");
const { adminRequired } = require("../middleware/adminMiddleware");
const { createUploadMiddleware } = require("../middleware/uploadMiddleware");

const createMediaRoutes = (config) => {
  const router = express.Router();
  const requireAuth = authRequired(config);
  const uploadImageMiddleware = createUploadMiddleware(config);

  router.get("/health", healthCheck);

  router.post(
    "/images",
    requireAuth,
    adminRequired,
    uploadImageMiddleware,
    asyncHandler(mediaController.uploadImage)
  );

  router.delete(
    "/images/:publicId",
    requireAuth,
    adminRequired,
    asyncHandler(mediaController.deleteImage)
  );

  return router;
};

module.exports = {
  createMediaRoutes,
};
