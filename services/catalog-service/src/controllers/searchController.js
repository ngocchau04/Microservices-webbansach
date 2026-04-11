const searchService = require("../services/searchService");
const { sendServiceResult } = require("../utils/http");

const searchProducts = async (req, res) => {
  const result = await searchService.searchProducts({ params: req.query });
  return sendServiceResult(res, result);
};

const filterProductsLegacy = async (req, res) => {
  const result = await searchService.searchProducts({
    params: {
      ...req.query,
      ...req.body,
    },
  });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.status(200).json({
    products: result.data.items,
    total: result.data.total,
    page: result.data.page,
    limit: result.data.limit,
  });
};

const top24Legacy = async (req, res) => {
  const result = await searchService.searchProducts({ params: { mode: "top24" } });
  if (!result.ok) {
    return sendServiceResult(res, result);
  }
  return res.status(200).json(result.data.items);
};

const top10Legacy = async (req, res) => {
  const result = await searchService.searchProducts({ params: { mode: "top10" } });
  if (!result.ok) {
    return sendServiceResult(res, result);
  }
  return res.status(200).json(result.data.items);
};

const sale10Legacy = async (req, res) => {
  const result = await searchService.searchProducts({ params: { mode: "sale10" } });
  if (!result.ok) {
    return sendServiceResult(res, result);
  }
  return res.status(200).json(result.data.items);
};

const topAuthorsLegacy = async (req, res) => {
  const result = await searchService.searchProducts({ params: { mode: "topAuthors" } });
  if (!result.ok) {
    return sendServiceResult(res, result);
  }
  return res.status(200).json(result.data.items);
};

module.exports = {
  searchProducts,
  filterProductsLegacy,
  top24Legacy,
  top10Legacy,
  sale10Legacy,
  topAuthorsLegacy,
};
