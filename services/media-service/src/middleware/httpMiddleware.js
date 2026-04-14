const { errorResponse } = require("../utils/response");

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const requestId = req.headers["x-request-id"] || "-";
    console.log(
      `[media-service] requestId=${requestId} method=${req.method} route=${req.originalUrl} status=${res.statusCode} durationMs=${durationMs}`
    );
  });

  next();
};

const notFoundHandler = (req, res) => {
  res.status(404).json(errorResponse("Route not found", "MEDIA_ROUTE_NOT_FOUND"));
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Media service failed to process request";
  const code = error.code || "MEDIA_INTERNAL_ERROR";

  if (statusCode >= 500) {
    console.error("[media-service]", error);
  }

  return res.status(statusCode).json(errorResponse(message, code));
};

module.exports = {
  requestLogger,
  notFoundHandler,
  errorHandler,
};
