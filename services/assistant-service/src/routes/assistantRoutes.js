const express = require("express");
const { healthCheck, readyCheck } = require("../controllers/healthController");
const assistantController = require("../controllers/assistantController");
const { asyncHandler } = require("../middleware/asyncHandler");
const { reindexAuth } = require("../middleware/reindexAuthMiddleware");

const createAssistantRoutes = (config) => {
  const router = express.Router();
  const guardReindex = reindexAuth(config);

  router.get("/health", healthCheck);
  router.get("/ready", readyCheck);
  router.get("/suggestions", asyncHandler(assistantController.suggestions));
  router.post("/chat", asyncHandler(assistantController.chat));
  router.post("/reindex", guardReindex, asyncHandler(assistantController.reindex));

  return router;
};

module.exports = {
  createAssistantRoutes,
};
