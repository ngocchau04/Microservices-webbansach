const { successResponse, errorResponse } = require("./response");

const sendServiceResult = (res, result) => {
  if (result.ok) {
    return res
      .status(result.statusCode || 200)
      .json(successResponse(result.data || null, result.legacy || {}));
  }

  return res
    .status(result.statusCode || 500)
    .json(errorResponse(result.message || "Request failed", result.code || "UNKNOWN_ERROR", result.legacy || {}));
};

module.exports = {
  sendServiceResult,
};
