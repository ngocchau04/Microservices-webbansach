const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const err = new Error(payload?.message || `Checkout request failed: ${response.status}`);
      err.statusCode = response.status;
      err.payload = payload;
      throw err;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

const checkReviewEligibility = async ({ config, authHeader, productId, orderId }) => {
  const url = `${config.checkoutServiceUrl}/orders/review-eligibility`;
  return fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
      body: JSON.stringify({ productId, orderId }),
    },
    config.checkoutRequestTimeoutMs
  );
};

const completeOrderAfterReview = async ({ config, authHeader, orderId, productId }) => {
  const url = `${config.checkoutServiceUrl}/orders/${orderId}/complete-after-review`;
  return fetchWithTimeout(
    url,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
      body: JSON.stringify({ productId }),
    },
    config.checkoutRequestTimeoutMs
  );
};

module.exports = {
  checkReviewEligibility,
  completeOrderAfterReview,
};
