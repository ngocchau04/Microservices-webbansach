const createRequestId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const requestIdMiddleware = (req, res, next) => {
  const existing = req.headers["x-request-id"];
  const requestId = typeof existing === "string" && existing.trim() ? existing.trim() : createRequestId();

  req.requestId = requestId;
  req.headers["x-request-id"] = requestId;
  res.setHeader("x-request-id", requestId);

  next();
};

module.exports = {
  requestIdMiddleware,
};
