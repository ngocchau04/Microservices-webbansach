const { errorResponse } = require("../utils/response");

const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.message || `Catalog request failed: ${response.status}`;
      const error = new Error(message);
      error.statusCode = response.status;
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeProduct = (payload) => {
  if (!payload) {
    return null;
  }

  const data = payload.data || {};
  const item =
    data.item ||
    payload.product ||
    (Array.isArray(payload) ? payload[0] : null) ||
    payload;

  if (!item || !item._id) {
    return null;
  }

  const rawStock = item.stock;
  const stock = Number(rawStock);
  const hasStockValue =
    rawStock !== undefined &&
    rawStock !== null &&
    rawStock !== "" &&
    Number.isFinite(stock) &&
    stock >= 0;

  return {
    productId: String(item._id),
    title: item.title || "",
    price: Number(item.price) || 0,
    image: item.imgSrc || item.image || "",
    // Keep explicit zero stock for accurate out-of-stock checks.
    // Only treat truly missing stock as unspecified.
    stockSnapshot: hasStockValue ? stock : 999999,
  };
};

const fetchProductSnapshot = async ({ config, productId }) => {
  const url = `${config.catalogServiceUrl}/products/${productId}`;
  const payload = await fetchWithTimeout(url, {}, config.catalogRequestTimeoutMs);
  const normalized = normalizeProduct(payload);

  if (!normalized) {
    return {
      ok: false,
      statusCode: 404,
      message: "Product not found",
      code: "CHECKOUT_PRODUCT_NOT_FOUND",
    };
  }

  return {
    ok: true,
    data: normalized,
  };
};

module.exports = {
  fetchProductSnapshot,
};

