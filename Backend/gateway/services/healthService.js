const { buildHealthPayload } = require("../models/healthModel");

const getGatewayHealth = ({ legacyServiceUrl }) =>
  buildHealthPayload({
    serviceName: "api-gateway",
    target: legacyServiceUrl,
  });

module.exports = {
  getGatewayHealth,
};
