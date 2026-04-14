const { errorResponse } = require("../utils/response");

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const requestId = req.headers["x-request-id"] || "-";
    console.log(
      `[identity-service] requestId=${requestId} method=${req.method} route=${req.originalUrl} status=${res.statusCode} durationMs=${durationMs}`
    );
  });

  next();
};

const notFoundHandler = (req, res) => {
  res
    .status(404)
    .json(errorResponse("Route not found", "IDENTITY_ROUTE_NOT_FOUND"));
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Identity service failed to process request";
  const code = error.code || "IDENTITY_INTERNAL_ERROR";

  if (statusCode >= 500) {
    console.error("[identity-service]", error);
  }

  res.status(statusCode).json(errorResponse(message, code));
};

module.exports = {
  requestLogger,
  notFoundHandler,
  errorHandler,
};
