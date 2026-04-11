const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "media-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = {
  healthCheck,
};
