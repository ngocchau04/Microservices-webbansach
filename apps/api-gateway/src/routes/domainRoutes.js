const express = require("express");
const { proxyByDomain } = require("../controllers/proxyController");

const createDomainRoutes = (config) => {
  const router = express.Router();
  router.use("/api", proxyByDomain(config));
  return router;
};

module.exports = {
  createDomainRoutes,
};
