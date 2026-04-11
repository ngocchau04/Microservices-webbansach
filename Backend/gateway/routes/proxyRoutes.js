const express = require("express");
const { createProxyController } = require("../controllers/proxyController");

const createProxyRoutes = (config) => {
  const router = express.Router();
  router.use("/", createProxyController(config));
  return router;
};

module.exports = {
  createProxyRoutes,
};
