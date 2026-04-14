require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { getEnvConfig } = require("./config/env");
const { configureCloudinary } = require("./config/cloudinary");
const { createMediaRoutes } = require("./routes/mediaRoutes");
const {
  requestLogger,
  notFoundHandler,
  errorHandler,
} = require("./middleware/httpMiddleware");

const config = getEnvConfig();
const validateConfig = () => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET (or SECRET_KEY) is required");
  }
};
validateConfig();
configureCloudinary(config);

const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.locals.config = config;

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(requestLogger);
  app.use(createMediaRoutes(config));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const app = createApp();

const startServer = async () =>
  new Promise((resolve, reject) => {
    const server = app.listen(config.port, () => {
      console.log(`[media-service] running on port ${config.port}`);
    });

    server.on("listening", () => resolve(server));
    server.on("error", reject);
  });

if (require.main === module) {
  startServer().catch((error) => {
    console.error("[media-service] failed to start", error);
    process.exit(1);
  });
}

module.exports = {
  app,
  config,
  createApp,
  startServer,
};
