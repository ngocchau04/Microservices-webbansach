const { proxyToLegacy } = require("../services/proxyService");

const createProxyController = (config) => async (req, res, next) => {
  try {
    await proxyToLegacy(req, res, config);
  } catch (error) {
    error.statusCode = 502;
    error.code = "LEGACY_SERVICE_UNAVAILABLE";
    next(error);
  }
};

module.exports = {
  createProxyController,
};
