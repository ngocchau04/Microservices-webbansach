const { successResponse } = require("../utils/response");

const healthCheck = (req, res) => {
  res.status(200).json(
    successResponse({
      service: "identity-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    })
  );
};

module.exports = {
  healthCheck,
};
