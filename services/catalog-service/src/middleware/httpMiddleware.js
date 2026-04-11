const { errorResponse } = require("../utils/response");

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      `[catalog-service] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`
    );
  });

  next();
};

const notFoundHandler = (req, res) => {
  res
    .status(404)
    .json(errorResponse("Route not found", "CATALOG_ROUTE_NOT_FOUND"));
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Catalog service failed to process request";
  const code = error.code || "CATALOG_INTERNAL_ERROR";

  if (statusCode >= 500) {
    console.error("[catalog-service]", error);
  }

  return res.status(statusCode).json(errorResponse(message, code));
};

module.exports = {
  requestLogger,
  notFoundHandler,
  errorHandler,
};
