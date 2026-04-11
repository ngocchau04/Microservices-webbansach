const Cart = require("../models/Cart");
const { fetchProductSnapshot } = require("./catalogClient");
const voucherService = require("./voucherService");
const { roundMoney } = require("../utils/money");

const mapLegacyCartItems = (items = []) =>
  items.map((item) => ({
    _id: item._id,
    product: {
      _id: item.productId,
      title: item.title,
      price: item.price,
      imgSrc: item.image,
      stock: item.stockSnapshot,
      discount: 0,
    },
    quantity: item.quantity,
  }));

const calculateTotals = ({ items = [], appliedVoucher = null }) => {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
  );

  let discount = 0;

  if (appliedVoucher && subtotal > 0) {
    if (appliedVoucher.type === "fixed") {
      discount = Number(appliedVoucher.value) || 0;
    }

    if (appliedVoucher.type === "percent") {
      const max = appliedVoucher.maxDiscount;
      discount = subtotal * ((Number(appliedVoucher.value) || 0) / 100);
      if (Number.isFinite(max) && max >= 0) {
        discount = Math.min(discount, max);
      }
    }
  }

  discount = Math.min(roundMoney(discount), subtotal);
  const total = roundMoney(Math.max(subtotal - discount, 0));

  return {
    subtotal,
    discount,
    total,
  };
};

const hydrateCart = (cart) => {
  const totals = calculateTotals({
    items: cart.items,
    appliedVoucher: cart.appliedVoucher,
  });

  cart.subtotal = totals.subtotal;
  cart.discount = totals.discount;
  cart.total = totals.total;

  return cart;
};

const ensureCart = async (userId) => {
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }

  return hydrateCart(cart);
};

const getCart = async ({ userId }) => {
  const cart = await ensureCart(userId);
  await cart.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      cart,
      items: cart.items,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
      appliedVoucher: cart.appliedVoucher,
    },
    legacy: {
      status: "success",
      cart: mapLegacyCartItems(cart.items),
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
    },
  };
};

const upsertCartItem = async ({ userId, productId, quantity, config }) => {
  if (!productId) {
    return {
      ok: false,
      statusCode: 400,
      message: "productId is required",
      code: "CHECKOUT_PRODUCT_ID_REQUIRED",
    };
  }

  const normalizedQuantity = Number(quantity);
  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    return {
      ok: false,
      statusCode: 400,
      message: "quantity must be a positive integer",
      code: "CHECKOUT_INVALID_QUANTITY",
    };
  }

  const productResult = await fetchProductSnapshot({ config, productId });
  if (!productResult.ok) {
    return productResult;
  }

  const snapshot = productResult.data;
  if (normalizedQuantity > snapshot.stockSnapshot) {
    return {
      ok: false,
      statusCode: 400,
      message: "Quantity exceeds current stock",
      code: "CHECKOUT_STOCK_EXCEEDED",
    };
  }

  const cart = await ensureCart(userId);
  const existing = cart.items.find((item) => item.productId === snapshot.productId);

  if (existing) {
    existing.title = snapshot.title;
    existing.price = snapshot.price;
    existing.image = snapshot.image;
    existing.stockSnapshot = snapshot.stockSnapshot;
    existing.quantity = normalizedQuantity;
  } else {
    cart.items.push({
      productId: snapshot.productId,
      title: snapshot.title,
      price: snapshot.price,
      image: snapshot.image,
      quantity: normalizedQuantity,
      stockSnapshot: snapshot.stockSnapshot,
    });
  }

  hydrateCart(cart);

  if (cart.appliedVoucher?.code) {
    const voucherResult = await voucherService.resolveApplicableVoucher({
      code: cart.appliedVoucher.code,
      subtotal: cart.subtotal,
    });

    if (!voucherResult.ok) {
      cart.appliedVoucher = null;
      hydrateCart(cart);
    } else {
      cart.appliedVoucher = voucherResult.data.voucherProjection;
      hydrateCart(cart);
    }
  }

  await cart.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      cart,
      item: cart.items.find((item) => item.productId === snapshot.productId),
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
    },
    legacy: {
      status: "success",
      message: "Cart updated",
      cart: mapLegacyCartItems(cart.items),
    },
  };
};

const updateCartItem = async ({ userId, itemId, quantity, config }) => {
  const normalizedQuantity = Number(quantity);
  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    return {
      ok: false,
      statusCode: 400,
      message: "quantity must be a positive integer",
      code: "CHECKOUT_INVALID_QUANTITY",
    };
  }

  const cart = await ensureCart(userId);

  let item = cart.items.id(itemId);
  if (!item) {
    item = cart.items.find((entry) => entry.productId === itemId);
  }

  if (!item) {
    return {
      ok: false,
      statusCode: 404,
      message: "Cart item not found",
      code: "CHECKOUT_CART_ITEM_NOT_FOUND",
    };
  }

  const productResult = await fetchProductSnapshot({ config, productId: item.productId });
  if (!productResult.ok) {
    return productResult;
  }

  const snapshot = productResult.data;
  if (normalizedQuantity > snapshot.stockSnapshot) {
    return {
      ok: false,
      statusCode: 400,
      message: "Quantity exceeds current stock",
      code: "CHECKOUT_STOCK_EXCEEDED",
    };
  }

  item.title = snapshot.title;
  item.price = snapshot.price;
  item.image = snapshot.image;
  item.stockSnapshot = snapshot.stockSnapshot;
  item.quantity = normalizedQuantity;

  hydrateCart(cart);
  await cart.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      cart,
      item,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
    },
    legacy: {
      status: "success",
      cart: mapLegacyCartItems(cart.items),
    },
  };
};

const removeCartItem = async ({ userId, itemId }) => {
  const cart = await ensureCart(userId);
  const before = cart.items.length;

  const directItem = cart.items.id(itemId);
  if (directItem) {
    directItem.deleteOne();
  } else {
    cart.items = cart.items.filter((item) => item.productId !== itemId);
  }

  if (before === cart.items.length) {
    return {
      ok: false,
      statusCode: 404,
      message: "Cart item not found",
      code: "CHECKOUT_CART_ITEM_NOT_FOUND",
    };
  }

  hydrateCart(cart);
  await cart.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      cart,
      items: cart.items,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
    },
    legacy: {
      status: "success",
      message: "Item removed from cart",
      cart: mapLegacyCartItems(cart.items),
    },
  };
};

const removeCartItemsByProductIds = async ({ userId, ids = [] }) => {
  const cart = await ensureCart(userId);
  const normalizedIds = Array.isArray(ids) ? ids.map(String) : [];

  cart.items = cart.items.filter((item) => !normalizedIds.includes(String(item.productId)));
  hydrateCart(cart);
  await cart.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      cart,
      items: cart.items,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
    },
    legacy: {
      status: "success",
      message: "Selected items removed from cart",
      cart: mapLegacyCartItems(cart.items),
    },
  };
};

const clearCart = async ({ userId }) => {
  const cart = await ensureCart(userId);
  cart.items = [];
  cart.appliedVoucher = null;
  hydrateCart(cart);
  await cart.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      cart,
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
    },
    legacy: {
      status: "success",
      message: "Cart cleared",
      cart: [],
    },
  };
};

const applyVoucherToCart = async ({ userId, code }) => {
  const cart = await ensureCart(userId);
  const result = await voucherService.resolveApplicableVoucher({
    code,
    subtotal: cart.subtotal,
  });

  if (!result.ok) {
    return result;
  }

  cart.appliedVoucher = result.data.voucherProjection;
  hydrateCart(cart);
  await cart.save();

  return {
    ok: true,
    statusCode: 200,
    data: {
      cart,
      appliedVoucher: cart.appliedVoucher,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
    },
    legacy: {
      status: "success",
      message: "Voucher applied",
      voucher: result.data.voucher,
      discount: cart.discount,
      total: cart.total,
    },
  };
};

module.exports = {
  getCart,
  upsertCartItem,
  updateCartItem,
  removeCartItem,
  removeCartItemsByProductIds,
  clearCart,
  applyVoucherToCart,
  calculateTotals,
  mapLegacyCartItems,
};

