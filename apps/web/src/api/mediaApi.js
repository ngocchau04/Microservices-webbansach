import apiClient from "../utils/apiClient";

const unwrap = (response) => {
  const body = response?.data || {};
  if (body.success) {
    return body.data;
  }
  return body.data || body;
};

const getData = (promise) => promise.then(unwrap);

export const uploadImage = (formData, config = {}) =>
  getData(
    apiClient.post("/api/media/images", formData, {
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...(config.headers || {}),
      },
    })
  );

export const deleteImage = (publicId, config = {}) =>
  getData(apiClient.delete(`/api/media/images/${encodeURIComponent(publicId)}`, config));
