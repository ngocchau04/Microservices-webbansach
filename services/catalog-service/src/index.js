require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { getEnvConfig } = require("./config/env");
const { connectDatabase } = require("./config/database");
const { createCatalogRoutes } = require("./routes/catalogRoutes");
const {
  requestLogger,
  notFoundHandler,
  errorHandler,
} = require("./middleware/httpMiddleware");

const config = getEnvConfig();

const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.locals.config = config;

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(requestLogger);
  app.use(createCatalogRoutes(config));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const app = createApp();

const startServer = async () => {
  await connectDatabase({ mongoUri: config.mongoUri, dbName: config.dbName });

  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, () => {
      console.log(`[catalog-service] running on port ${config.port}`);
    });

    server.on("listening", () => resolve(server));
    server.on("error", reject);
  });
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error("[catalog-service] failed to start", error);
    process.exit(1);
  });
}

module.exports = {
  app,
  config,
  createApp,
  startServer,
};
