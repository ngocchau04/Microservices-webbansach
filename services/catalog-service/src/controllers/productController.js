const productService = require("../services/productService");
const { sendServiceResult } = require("../utils/http");
const { resolveCatalogTenantContext } = require("../services/tenantContextService");

const listProducts = async (req, res) => {
  const tenantContext = resolveCatalogTenantContext({
    req,
    config: req.app.locals.config || {},
  });
  const result = await productService.listProducts({
    query: req.query,
    tenantId: tenantContext.tenantId,
  });
  return sendServiceResult(res, result);
};

const getProductById = async (req, res) => {
  const result = await productService.getProductById({ productId: req.params.id });
  return sendServiceResult(res, result);
};

const createProduct = async (req, res) => {
  const result = await productService.createProduct({ payload: req.body });
  return sendServiceResult(res, result);
};

const updateProduct = async (req, res) => {
  const result = await productService.updateProduct({
    productId: req.params.id,
    payload: req.body,
  });
  return sendServiceResult(res, result);
};

const deleteProduct = async (req, res) => {
  const result = await productService.deleteProduct({ productId: req.params.id });
  return sendServiceResult(res, result);
};

const listProductsByIds = async (req, res) => {
  const result = await productService.listProductsByIds({ ids: req.body.ids });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.status(200).json(result.data.items);
};

const listSimilarProducts = async (req, res) => {
  const result = await productService.listSimilarProducts({ type: req.params.type });

  if (!result.ok) {
    return sendServiceResult(res, result);
  }

  return res.status(200).json(result.data.items);
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listProductsByIds,
  listSimilarProducts,
};
