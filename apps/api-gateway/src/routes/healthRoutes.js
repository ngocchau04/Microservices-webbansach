const express = require("express");
const { getHealth } = require("../controllers/healthController");

const createHealthRoutes = (config) => {
  const router = express.Router();
  router.get("/health", getHealth(config));
  return router;
};

module.exports = {
  createHealthRoutes,
};
