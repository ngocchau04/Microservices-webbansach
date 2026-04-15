import apiClient from "../utils/apiClient";

const normalizeAuthResponse = (response) => {
  const body = response?.data;

  if (body && body.success === true && body.data && typeof body.data === "object") {
    response.data = {
      ...body,
      ...body.data,
      status: body.status || "success",
    };
    return response;
  }

  if (body && body.success === false) {
    response.data = {
      ...body,
      status: body.status || "fail",
    };
  }

  return response;
};

const withNormalizedResponse = (requestPromise) =>
  requestPromise.then(normalizeAuthResponse);

export const login = (payload) =>
  withNormalizedResponse(apiClient.post("/api/auth/login", payload));

export const register = (payload) =>
  withNormalizedResponse(apiClient.post("/api/auth/register", payload));

export const refreshToken = (payload) =>
  withNormalizedResponse(apiClient.post("/api/auth/refresh-token", payload));

export const verifyAccount = (payload) =>
  withNormalizedResponse(apiClient.post("/api/auth/verify-account", payload));

export const googleLogin = (payload) =>
  withNormalizedResponse(apiClient.post("/api/auth/google-login", payload));

export const getMe = (token) =>
  withNormalizedResponse(
    apiClient.get("/api/auth/me", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
  );

export const checkEmail = (payload) =>
  withNormalizedResponse(apiClient.post("/api/auth/check-email", payload));

export const resendVerification = (payload) =>
  withNormalizedResponse(
    apiClient.post("/api/auth/resend-verification", payload)
  );

export const forgotPassword = (payload) =>
  withNormalizedResponse(apiClient.post("/api/auth/forgot-password", payload));

export const updateMe = (payload) =>
  withNormalizedResponse(apiClient.put("/api/auth/me", payload));

export const updateProfileField = (field, payload) =>
  withNormalizedResponse(apiClient.post(`/api/auth/profile/${field}`, payload));

export const getUsers = () =>
  withNormalizedResponse(apiClient.get("/api/auth/users"));

export const getUsersCount = () =>
  withNormalizedResponse(apiClient.get("/api/auth/users/count"));

export const getUserById = (id) =>
  withNormalizedResponse(apiClient.get(`/api/auth/users/${id}`));

export const updateUserStatus = (id, payload) =>
  withNormalizedResponse(apiClient.patch(`/api/auth/users/${id}/status`, payload));

export const updateUserByAdmin = (id, payload) =>
  withNormalizedResponse(apiClient.patch(`/api/auth/users/${id}`, payload));

export const deleteUserByAdmin = (id) =>
  withNormalizedResponse(apiClient.delete(`/api/auth/users/${id}`));

export const getOrdersByUser = (userId) =>
  withNormalizedResponse(apiClient.get(`/api/auth/users/${userId}/orders`));
export const getFavorites = (config = {}) =>
  withNormalizedResponse(apiClient.get("/api/auth/favorites", config));
export const toggleFavorite = (payload, config = {}) =>
  withNormalizedResponse(apiClient.post("/api/auth/favorites", payload, config));
export const removeFavorite = (payload, config = {}) =>
  withNormalizedResponse(
    apiClient.delete("/api/auth/favorites", { ...config, data: payload })
  );
