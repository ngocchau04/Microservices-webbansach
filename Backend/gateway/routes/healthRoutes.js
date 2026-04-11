const express = require("express");
const { createHealthController } = require("../controllers/healthController");

const createHealthRoutes = (config) => {
  const router = express.Router();
  router.get("/health", createHealthController(config));
  return router;
};

module.exports = {
  createHealthRoutes,
};
