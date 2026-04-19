const authService = require("../services/authService");
const { sendServiceResult } = require("../utils/http");

const register = async (req, res) => {
  const result = await authService.register({ payload: req.body, config: req.app.locals.config });
  return sendServiceResult(res, result);
};

const login = async (req, res) => {
  const result = await authService.login({ ...req.body, config: req.app.locals.config });
  return sendServiceResult(res, result);
};

const refreshToken = async (req, res) => {
  const result = await authService.refreshToken({ token: req.body.token, config: req.app.locals.config });
  return sendServiceResult(res, result);
};

const googleLogin = async (req, res) => {
  const result = await authService.googleLogin({ payload: req.body, config: req.app.locals.config });
  return sendServiceResult(res, result);
};

const forgotPassword = async (req, res) => {
  const result = await authService.forgotPassword({ email: req.body.email, config: req.app.locals.config });
  return sendServiceResult(res, result);
};

const resetPassword = async (req, res) => {
  const result = await authService.resetPassword(req.body);
  return sendServiceResult(res, result);
};

module.exports = {
  register,
  login,
  refreshToken,
  googleLogin,
  forgotPassword,
  resetPassword,
};
