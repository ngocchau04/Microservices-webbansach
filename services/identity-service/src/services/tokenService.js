const jwt = require("jsonwebtoken");

const signAccessToken = ({ user, config }) =>
  jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

const verifyAccessToken = ({ token, config }) =>
  jwt.verify(token, config.jwtSecret);

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
