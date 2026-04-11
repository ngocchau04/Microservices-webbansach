const { successResponse } = require("../utils/response");

const healthCheck = (req, res) => {
  res.status(200).json(
    successResponse({
      service: "catalog-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    })
  );
};

module.exports = {
  healthCheck,
};
