const authService = require("../services/authService");
const { sendServiceResult } = require("../utils/http");

const getMe = async (req, res) => {
  const result = await authService.getCurrentUser({ userId: req.user.userId });
  return sendServiceResult(res, result);
};

const updateMe = async (req, res) => {
  const result = await authService.updateCurrentUser({ userId: req.user.userId, payload: req.body });
  return sendServiceResult(res, result);
};

const updateProfileByField = async (req, res) => {
  const result = await authService.updateUserByEmailField({
    email: req.body.email,
    field: req.params.field,
    value: req.body[req.params.field],
  });

  return sendServiceResult(res, result);
};

const getFavorites = async (req, res) => {
  const result = await authService.getFavorites({ userId: req.user.userId });
  return sendServiceResult(res, result);
};

const addFavorite = async (req, res) => {
  const result = await authService.addFavorite({
    userId: req.user.userId,
    productId: req.body.productId,
  });
  return sendServiceResult(res, result);
};

const removeFavorite = async (req, res) => {
  const result = await authService.removeFavorite({
    userId: req.user.userId,
    productId: req.body.productId,
  });
  return sendServiceResult(res, result);
};

module.exports = {
  getMe,
  updateMe,
  updateProfileByField,
  getFavorites,
  addFavorite,
  removeFavorite,
};
