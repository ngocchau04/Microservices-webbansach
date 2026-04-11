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
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res
      .status(401)
      .json(errorResponse("Invalid token", "AUTH_INVALID_TOKEN"));
  }
};

module.exports = {
  authRequired,
};
