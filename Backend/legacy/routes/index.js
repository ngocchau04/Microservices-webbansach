const express = require("express");

const legacyRoutes = express.Router();

legacyRoutes.use("/", require("../../controllers/userController"));
legacyRoutes.use("/search", require("../../controllers/searchController"));
legacyRoutes.use("/product", require("../../controllers/productController"));
legacyRoutes.use("/voucher", require("../../controllers/voucherController"));
legacyRoutes.use("/order", require("../../controllers/orderController"));
legacyRoutes.use("/review", require("../../controllers/reviewController"));
legacyRoutes.use("/feedback", require("../../controllers/feedbackController"));
legacyRoutes.use("/revenue", require("../../controllers/revenueController"));
legacyRoutes.use("/upload", require("../../controllers/uploadController"));

module.exports = {
  legacyRoutes,
};
