const { errorResponse } = require("../utils/response");

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const code = error.code || "GATEWAY_INTERNAL_ERROR";
  const message =
    statusCode >= 500
      ? "Gateway could not process the request"
      : error.message || "Request failed";

  res.status(statusCode).json(errorResponse(message, code));
};

module.exports = {
  errorHandler,
};
