const express = require("express");
const multer = require("multer");
const { healthCheck, readyCheck } = require("../controllers/healthController");
const assistantController = require("../controllers/assistantController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { reindexAuth } = require("../middleware/reindexAuthMiddleware");

const createAssistantRoutes = (config) => {
  const router = express.Router();
  const guardReindex = reindexAuth(config);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file || !file.mimetype || !file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image upload is allowed"));
      }
      return cb(null, true);
    },
  });

  router.get("/health", healthCheck);
  router.get("/ready", readyCheck);
  router.get("/suggestions", asyncHandler(assistantController.suggestions));
  router.post("/chat", asyncHandler(assistantController.chat));
  router.post("/chat/image", upload.single("image"), asyncHandler(assistantController.chatImage));
  router.post("/reindex", guardReindex, asyncHandler(assistantController.reindex));
  router.post("/graph/reindex", guardReindex, asyncHandler(assistantController.graphReindex));

  return router;
};

module.exports = {
  createAssistantRoutes,
};
