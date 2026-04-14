const { successResponse } = require("../utils/response");

const upstreamConfig = (config) => ({
  identity: config.identityServiceUrl,
  catalog: config.catalogServiceUrl,
  checkout: config.checkoutServiceUrl,
  media: config.mediaServiceUrl,
  notification: config.notificationServiceUrl,
  reporting: config.reportingServiceUrl,
  support: config.supportServiceUrl,
  assistant: config.assistantServiceUrl,
});

const getHealth = (config) => (req, res) => {
  res.status(200).json(
    successResponse({
      service: "api-gateway",
      status: "ok",
      upstreams: upstreamConfig(config),
      timestamp: new Date().toISOString(),
    })
  );
};

const getReady = (config) => (req, res) => {
  res.status(200).json(
    successResponse({
      service: "api-gateway",
      ready: true,
      role: "edge-proxy",
      note: "Per-service Mongo readiness: GET /ready on each stateful service (identity, catalog, checkout, reporting, support, assistant).",
      upstreams: upstreamConfig(config),
      timestamp: new Date().toISOString(),
    })
  );
};

module.exports = {
  getHealth,
  getReady,
};
