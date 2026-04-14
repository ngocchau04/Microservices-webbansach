const express = require("express");
const { getHealth, getReady } = require("../controllers/healthController");

const createHealthRoutes = (config) => {
  const router = express.Router();
  router.get("/health", getHealth(config));
  router.get("/ready", getReady(config));
  return router;
};

module.exports = {
  createHealthRoutes,
};
