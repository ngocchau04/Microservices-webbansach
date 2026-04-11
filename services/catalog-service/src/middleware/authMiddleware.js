const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

const readBearerToken = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token || token === "null" || token === "undefined") {
    return null;
  }

  return token;
};

const authRequired = (config) => (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    return res
      .status(401)
      .json(errorResponse("Unauthorized - No token provided", "AUTH_UNAUTHORIZED"));
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json(errorResponse("Token expired", "AUTH_TOKEN_EXPIRED"));
    }

    return res.status(401).json(errorResponse("Invalid token", "AUTH_INVALID_TOKEN"));
  }
};

const authOptional = (config) => (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
};

module.exports = {
  authRequired,
  authOptional,
};
