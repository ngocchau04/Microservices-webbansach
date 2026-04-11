const { successResponse } = require("../utils/response");

const getHealth = (config) => (req, res) => {
  res.status(200).json(
    successResponse({
      service: "api-gateway",
      status: "ok",
      upstreams: {
        identity: config.identityServiceUrl,
        catalog: config.catalogServiceUrl,
        checkout: config.checkoutServiceUrl,
        media: config.mediaServiceUrl,
        notification: config.notificationServiceUrl,
        reporting: config.reportingServiceUrl,
        support: config.supportServiceUrl,
      },
      timestamp: new Date().toISOString(),
    })
  );
};

module.exports = {
  getHealth,
};
