const { getGatewayHealth } = require("../services/healthService");
const { successResponse } = require("../utils/response");

const createHealthController = (config) => (req, res) => {
  const health = getGatewayHealth({ legacyServiceUrl: config.legacyServiceUrl });
  res.status(200).json(successResponse(health));
};

module.exports = {
  createHealthController,
};
