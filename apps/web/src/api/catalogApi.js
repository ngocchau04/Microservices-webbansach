import apiClient from "../utils/apiClient";

const normalizeCatalogResponse = (response) => {
  const body = response?.data;

  if (body && body.success === true) {
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
  requestPromise.then(normalizeCatalogResponse);

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.append(key, value);
  });

  const output = query.toString();
  return output ? `?${output}` : "";
};

export const getProducts = (params = {}) =>
  withNormalizedResponse(
    apiClient.get(`/api/catalog/products${toQueryString(params)}`)
  );

export const getProductById = (id) =>
  withNormalizedResponse(apiClient.get(`/api/catalog/products/${id}`));

export const createProduct = (payload, config = {}) =>
  withNormalizedResponse(apiClient.post("/api/catalog/products", payload, config));

export const updateProduct = (id, payload, config = {}) =>
  withNormalizedResponse(
    apiClient.put(`/api/catalog/products/${id}`, payload, config)
  );

export const deleteProduct = (id, config = {}) =>
  withNormalizedResponse(apiClient.delete(`/api/catalog/products/${id}`, config));

export const searchProducts = (params = {}) =>
  withNormalizedResponse(
    apiClient.get(`/api/catalog/search${toQueryString(params)}`)
  );

export const getTopProducts = () => searchProducts({ mode: "top24" });
export const getTopSellingProducts = () => searchProducts({ mode: "top10" });
export const getFlashSaleProducts = () => searchProducts({ mode: "sale10" });
export const getTopAuthors = () => searchProducts({ mode: "topAuthors" });

export const getProductReviews = (productId) =>
  withNormalizedResponse(apiClient.get(`/api/catalog/products/${productId}/reviews`));

export const createProductReview = (productId, payload, config = {}) =>
  withNormalizedResponse(
    apiClient.post(`/api/catalog/products/${productId}/reviews`, payload, config)
  );

export const updateReview = (reviewId, payload, config = {}) =>
  withNormalizedResponse(apiClient.put(`/api/catalog/reviews/${reviewId}`, payload, config));

export const deleteReview = (reviewId, config = {}) =>
  withNormalizedResponse(apiClient.delete(`/api/catalog/reviews/${reviewId}`, config));

// Temporary compatibility helpers for untouched flows
export const getProductListByIds = (payload, config = {}) =>
  apiClient.post("/api/catalog/products/list", payload, config);

export const getSimilarProducts = (type) =>
  apiClient.get(`/api/catalog/products/similar/${type}`);

export const filterProducts = (payload, queryString = "") =>
  apiClient.post(`/api/catalog/search/filter${queryString}`, payload);

export const getProductFeedback = (id) => getProductReviews(id);
export const postProductFeedback = (id, payload, config = {}) =>
  createProductReview(id, payload, config);
