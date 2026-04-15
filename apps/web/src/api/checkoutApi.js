import apiClient from "../utils/apiClient";

const unwrap = (response) => {
  const body = response?.data || {};
  if (body.success) {
    return body.data;
  }
  return body.data || body;
};

const getData = (promise) => promise.then(unwrap);

export const getCart = () => getData(apiClient.get("/api/checkout/cart"));
export const addCartItem = (payload) => getData(apiClient.post("/api/checkout/cart/items", payload));
export const updateCartItem = (itemId, payload) =>
  getData(apiClient.patch(`/api/checkout/cart/items/${itemId}`, payload));
export const removeCartItem = (itemId) =>
  getData(apiClient.delete(`/api/checkout/cart/items/${itemId}`));
export const clearCart = () => getData(apiClient.delete("/api/checkout/cart"));

// legacy-compatible cart aliases used by existing UI
export const upsertCartItem = (payload) => getData(apiClient.post("/api/checkout/cart", payload));
export const removeCartItemByProduct = (productId) =>
  getData(apiClient.delete("/api/checkout/cart", { data: { productId } }));
export const removeCartItems = (ids) =>
  getData(apiClient.delete("/api/checkout/cart/list", { data: { ids } }));

export const listAvailableVouchers = () => getData(apiClient.get("/api/checkout/vouchers/available"));
export const listVouchers = () => getData(apiClient.get("/api/checkout/vouchers"));
export const getVoucherByCode = (code) => getData(apiClient.get(`/api/checkout/vouchers/${code}`));
export const validateVoucher = (payload) =>
  getData(apiClient.post("/api/checkout/vouchers/validate", payload));
export const applyVoucher = (payload) =>
  getData(apiClient.post("/api/checkout/vouchers/apply", payload));
export const createVoucher = (payload) => getData(apiClient.post("/api/checkout/vouchers", payload));
export const deleteVoucher = (id) => getData(apiClient.delete(`/api/checkout/vouchers/${id}`));

export const createOrder = (payload) => getData(apiClient.post("/api/checkout/orders", payload));
export const getMyOrders = () => getData(apiClient.get("/api/checkout/orders/me"));
export const getOrderById = (id) => getData(apiClient.get(`/api/checkout/orders/${id}`));
export const cancelOrder = (id) => getData(apiClient.patch(`/api/checkout/orders/${id}/cancel`));
export const confirmOrderReceived = (id) =>
  getData(apiClient.patch(`/api/checkout/orders/${id}/confirm-received`));
export const getReviewEligibility = (payload) =>
  getData(apiClient.post("/api/checkout/orders/review-eligibility", payload));
export const completeOrderAfterReview = (id, payload) =>
  getData(apiClient.patch(`/api/checkout/orders/${id}/complete-after-review`, payload));
export const requestOrderReturn = (id, payload) =>
  getData(apiClient.patch(`/api/checkout/orders/${id}/request-return`, payload));
export const getAdminOrders = () => getData(apiClient.get("/api/checkout/admin/orders"));
export const updateAdminOrderStatus = (id, payload) =>
  getData(apiClient.patch(`/api/checkout/admin/orders/${id}/status`, payload));

// legacy-compatible order aliases
export const getOrders = () => getData(apiClient.get("/api/checkout/orders"));
export const updateOrderStatus = (id, payload) =>
  getData(apiClient.put(`/api/checkout/orders/${id}/status`, payload));

export const createPayment = (payload) =>
  getData(apiClient.post("/api/checkout/payments/create", payload));
export const paymentWebhook = (payload) =>
  getData(apiClient.post("/api/checkout/payments/webhook", payload));
export const getPaymentById = (id) => getData(apiClient.get(`/api/checkout/payments/${id}`));

export const getOrdersByUserId = (userId) => getData(apiClient.get(`/api/checkout/users/${userId}/orders`));

