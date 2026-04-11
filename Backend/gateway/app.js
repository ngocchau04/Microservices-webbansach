const express = require("express");
const cors = require("cors");
const { resolveGatewayConfig } = require("./config/env");
const { createHealthRoutes } = require("./routes/healthRoutes");
const { createProxyRoutes } = require("./routes/proxyRoutes");
const { errorHandler } = require("./middleware/errorHandler");

const createGatewayApp = (overrides = {}) => {
  const app = express();
  const config = resolveGatewayConfig(overrides);

  app.disable("x-powered-by");
  app.use(cors());
  app.use(createHealthRoutes(config));
  app.use(createProxyRoutes(config));
  app.use(errorHandler);

  return { app, config };
};

module.exports = {
  createGatewayApp,
};
