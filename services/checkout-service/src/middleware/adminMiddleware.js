const { errorResponse } = require("../utils/response");

const adminRequired = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json(errorResponse("Permission denied", "AUTH_FORBIDDEN"));
  }

  return next();
};

module.exports = {
  adminRequired,
};

