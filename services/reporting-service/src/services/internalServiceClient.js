const jwt = require("jsonwebtoken");

const postWithTimeout = async ({ url, method = "GET", payload, token, timeoutMs }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message = body?.message || `Internal request failed: ${response.status}`;
      const error = new Error(message);
      error.statusCode = response.status;
      error.code = body?.code || "REPORTING_INTERNAL_REQUEST_FAILED";
      throw error;
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
};

const createInternalAdminToken = (config) =>
  jwt.sign(
    {
      userId: config.internalServiceUserId,
      email: "reporting-service@internal",
      role: "admin",
    },
    config.jwtSecret,
    { expiresIn: "2m" }
  );

const fetchAllOrders = async ({ config }) => {
  const token = createInternalAdminToken(config);
  const url = `${config.checkoutServiceUrl}/admin/orders`;
  const body = await postWithTimeout({
    url,
    method: "GET",
    token,
    timeoutMs: config.checkoutRequestTimeoutMs,
  });

  const items = body?.data?.items || [];
  return items;
};

const fetchUsersCount = async ({ config }) => {
  const token = createInternalAdminToken(config);
  const url = `${config.identityServiceUrl}/users/count`;
  const body = await postWithTimeout({
    url,
    method: "GET",
    token,
    timeoutMs: config.identityRequestTimeoutMs,
  });

  const total = Number(body?.data?.total || 0);
  return Number.isFinite(total) ? total : 0;
};

module.exports = {
  fetchAllOrders,
  fetchUsersCount,
};
