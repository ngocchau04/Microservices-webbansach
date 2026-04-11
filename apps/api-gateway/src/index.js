require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { getEnvConfig } = require("./config/env");
const { createHealthRoutes } = require("./routes/healthRoutes");
const { createDomainRoutes } = require("./routes/domainRoutes");
const { requestLogger } = require("./middleware/requestLogger");
const { notFoundHandler } = require("./middleware/notFoundHandler");
const { errorHandler } = require("./middleware/errorHandler");

const config = getEnvConfig();
const app = express();
const jsonParser = express.json({ limit: "5mb" });

app.disable("x-powered-by");
app.use(cors());
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  return jsonParser(req, res, next);
});
app.use(requestLogger);

app.use(createHealthRoutes(config));
app.use(createDomainRoutes(config));

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`API Gateway running on port ${config.port}`);
    console.log(`Identity upstream: ${config.identityServiceUrl}`);
    console.log(`Catalog upstream: ${config.catalogServiceUrl}`);
    console.log(`Checkout upstream: ${config.checkoutServiceUrl}`);
    console.log(`Media upstream: ${config.mediaServiceUrl}`);
    console.log(`Notification upstream: ${config.notificationServiceUrl}`);
    console.log(`Reporting upstream: ${config.reportingServiceUrl}`);
    console.log(`Support upstream: ${config.supportServiceUrl}`);
  });
}

module.exports = {
  app,
  config,
};
