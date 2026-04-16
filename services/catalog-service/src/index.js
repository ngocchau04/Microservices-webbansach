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
const Product = require("./models/Product");
const { removeDebugProducts } = require("../scripts/debugProductCleanup");

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

  const removedDebug = await removeDebugProducts(Product);
  if (removedDebug > 0) {
    console.log(
      `[catalog-service] removed ${removedDebug} debug catalog product(s) (titles: Debug Cart Stock / Debug Cart Stock 2)`
    );
  }

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
