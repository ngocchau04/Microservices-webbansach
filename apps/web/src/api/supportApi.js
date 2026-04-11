import apiClient from "../utils/apiClient";

const normalizeSupportResponse = (response) => {
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
  requestPromise.then(normalizeSupportResponse);

export const submitFeedback = (payload) =>
  withNormalizedResponse(apiClient.post("/api/support/feedback", payload));

export const getMyFeedback = () =>
  withNormalizedResponse(apiClient.get("/api/support/feedback/me"));

export const getAdminFeedback = () =>
  withNormalizedResponse(apiClient.get("/api/support/admin/feedback"));

export const updateAdminFeedbackStatus = (feedbackId, payload) =>
  withNormalizedResponse(
    apiClient.patch(`/api/support/admin/feedback/${feedbackId}/status`, payload)
  );
