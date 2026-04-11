const { errorResponse } = require("../utils/response");

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json(errorResponse("Permission denied", "AUTH_FORBIDDEN"));
  }

  next();
};

module.exports = {
  adminMiddleware,
};
