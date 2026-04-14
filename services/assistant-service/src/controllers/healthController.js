const mongoose = require("mongoose");

const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "assistant-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
};

const readyCheck = (req, res) => {
  const ok = mongoose.connection.readyState === 1;
  if (ok) {
    return res.status(200).json({
      success: true,
      data: {
        service: "assistant-service",
        ready: true,
        mongo: "connected",
        timestamp: new Date().toISOString(),
      },
    });
  }

  return res.status(503).json({
    success: false,
    message: "MongoDB not connected",
    code: "SERVICE_NOT_READY",
    service: "assistant-service",
    ready: false,
    mongo: "disconnected",
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  healthCheck,
  readyCheck,
};
