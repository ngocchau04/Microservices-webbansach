const { errorResponse } = require("../utils/response");

const internalAuthRequired = (config) => (req, res, next) => {
  const expected = String(config.internalApiKey || "").trim();
  if (!expected) {
    return res
      .status(503)
      .json(errorResponse("Internal API key not configured", "INTERNAL_AUTH_NOT_CONFIGURED"));
  }

  const provided = String(req.headers["x-internal-api-key"] || "").trim();
  if (!provided || provided !== expected) {
    return res.status(401).json(errorResponse("Invalid internal token", "INTERNAL_AUTH_INVALID"));
  }

  return next();
};

module.exports = {
  internalAuthRequired,
};
