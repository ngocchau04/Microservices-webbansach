import apiClient from "../utils/apiClient";

const normalizeReportingResponse = (response) => {
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
  requestPromise.then(normalizeReportingResponse);

export const getDashboardSummary = () =>
  withNormalizedResponse(apiClient.get("/api/reporting/dashboard/summary"));

export const getRevenue = (period = "month") =>
  withNormalizedResponse(
    apiClient.get("/api/reporting/dashboard/revenue", {
      params: { period },
    })
  );

export const getTopProducts = (params = {}) =>
  withNormalizedResponse(
    apiClient.get("/api/reporting/dashboard/top-products", {
      params,
    })
  );

export const getOrderStatusStats = () =>
  withNormalizedResponse(apiClient.get("/api/reporting/dashboard/order-status"));
