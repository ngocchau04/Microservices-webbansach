const { errorResponse } = require("../utils/response");

const notFoundHandler = (req, res) => {
  res.status(404).json(
    errorResponse("Route not found", "GATEWAY_ROUTE_NOT_FOUND")
  );
};

module.exports = {
  notFoundHandler,
};
