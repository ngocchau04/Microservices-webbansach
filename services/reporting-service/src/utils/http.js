const { successResponse, errorResponse } = require("./response");

const sendServiceResult = (res, result) => {
  if (result.ok) {
    return res
      .status(result.statusCode || 200)
      .json(successResponse(result.data || null, result.meta || {}));
  }

  return res
    .status(result.statusCode || 500)
    .json(
      errorResponse(
        result.message || "Request failed",
        result.code || "REPORTING_UNKNOWN_ERROR",
        result.meta || {}
      )
    );
};

module.exports = {
  sendServiceResult,
};
