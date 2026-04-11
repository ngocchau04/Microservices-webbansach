const reportingService = require("../services/reportingService");
const { sendServiceResult } = require("../utils/http");

const getSummary = async (req, res) => {
  const result = await reportingService.getDashboardSummary({
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

const getRevenue = async (req, res) => {
  const result = await reportingService.getDashboardRevenue({
    period: req.query.period,
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

const getTopProducts = async (req, res) => {
  const result = await reportingService.getDashboardTopProducts({
    config: req.app.locals.config,
    limit: req.query.limit,
    sortBy: req.query.sortBy,
  });

  return sendServiceResult(res, result);
};

const getOrderStatus = async (req, res) => {
  const result = await reportingService.getDashboardOrderStatus({
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

module.exports = {
  getSummary,
  getRevenue,
  getTopProducts,
  getOrderStatus,
};
