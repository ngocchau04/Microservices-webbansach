const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

const readBearerToken = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token || null;
};

const internalAuthRequired = (config) => (req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  const token = readBearerToken(req);
  if (!token) {
    return res
      .status(401)
      .json(errorResponse("Unauthorized - Internal token required", "NOTIFY_UNAUTHORIZED"));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded || decoded.internal !== true) {
      return res
        .status(403)
        .json(errorResponse("Forbidden - Internal token invalid", "NOTIFY_FORBIDDEN"));
    }
    req.internal = decoded;
    return next();
  } catch (error) {
    return res.status(401).json(errorResponse("Invalid token", "NOTIFY_INVALID_TOKEN"));
  }
};

module.exports = {
  internalAuthRequired,
};
