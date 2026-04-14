const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const requestId = req.requestId || req.headers["x-request-id"] || "-";
    console.log(
      `[Gateway] requestId=${requestId} method=${req.method} route=${req.originalUrl} status=${res.statusCode} durationMs=${durationMs}`
    );
  });

  next();
};

module.exports = {
  requestLogger,
};
