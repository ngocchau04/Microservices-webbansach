const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "checkout-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = {
  healthCheck,
};

