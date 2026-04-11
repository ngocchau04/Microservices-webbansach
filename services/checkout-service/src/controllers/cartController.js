const cartService = require("../services/cartService");
const { sendServiceResult } = require("../utils/http");

const getCart = async (req, res) => {
  const result = await cartService.getCart({ userId: req.user.userId });
  return sendServiceResult(res, result);
};

const addCartItem = async (req, res) => {
  const result = await cartService.upsertCartItem({
    userId: req.user.userId,
    productId: req.body.productId,
    quantity: req.body.quantity,
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

const updateCartItem = async (req, res) => {
  const result = await cartService.updateCartItem({
    userId: req.user.userId,
    itemId: req.params.itemId,
    quantity: req.body.quantity,
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

const removeCartItem = async (req, res) => {
  const result = await cartService.removeCartItem({
    userId: req.user.userId,
    itemId: req.params.itemId,
  });

  return sendServiceResult(res, result);
};

const clearCart = async (req, res) => {
  if (req.body && req.body.productId) {
    const result = await cartService.removeCartItem({
      userId: req.user.userId,
      itemId: req.body.productId,
    });

    return sendServiceResult(res, result);
  }

  const result = await cartService.clearCart({ userId: req.user.userId });
  return sendServiceResult(res, result);
};

// Legacy compatibility aliases
const upsertCartItemLegacy = async (req, res) => {
  return addCartItem(req, res);
};

const removeCartItemLegacy = async (req, res) => {
  return clearCart(req, res);
};

const removeCartItemsLegacy = async (req, res) => {
  const result = await cartService.removeCartItemsByProductIds({
    userId: req.user.userId,
    ids: req.body.ids,
  });

  return sendServiceResult(res, result);
};

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  upsertCartItemLegacy,
  removeCartItemLegacy,
  removeCartItemsLegacy,
};

