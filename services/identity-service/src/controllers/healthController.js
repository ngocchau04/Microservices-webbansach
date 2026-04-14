const mongoose = require("mongoose");
const { successResponse, errorResponse } = require("../utils/response");

const healthCheck = (req, res) => {
  res.status(200).json(
    successResponse({
      service: "identity-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    })
  );
};

const readyCheck = (req, res) => {
  const ok = mongoose.connection.readyState === 1;
  if (ok) {
    return res.status(200).json(
      successResponse({
        service: "identity-service",
        ready: true,
        mongo: "connected",
        timestamp: new Date().toISOString(),
      })
    );
  }

  return res.status(503).json(
    errorResponse("MongoDB not connected", "SERVICE_NOT_READY", {
      service: "identity-service",
      ready: false,
      mongo: "disconnected",
      timestamp: new Date().toISOString(),
    })
  );
};

module.exports = {
  healthCheck,
  readyCheck,
};
