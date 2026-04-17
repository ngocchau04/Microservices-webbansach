const mongoose = require("mongoose");
const Product = require("../models/Product");
const {
  normalizePrice,
  parsePagination,
  parseSort,
  buildProductFilter,
  validateProductPayload,
} = require("../utils/validators");

const toPlain = (doc) => (doc ? doc.toObject() : null);

const normalizeProductPayload = (payload = {}) => {
  const next = { ...payload };

  const numericFields = [
    "price",
    "originalPrice",
    "discount",
    "rating",
    "reviewsCount",
    "soldCount",
    "stock",
    "publicationYear",
    "pages",
  ];

  numericFields.forEach((field) => {
    if (next[field] !== undefined) {
      const normalized = normalizePrice(next[field]);
      if (normalized !== null) {
        next[field] = normalized;
      }
    }
  });

  if (Array.isArray(next.features)) {
    next.features = next.features.filter((item) => typeof item === "string");
  }

  if (next.isHidden !== undefined) {
    next.isHidden = Boolean(next.isHidden);
  }

  return next;
};

const listProducts = async ({ query = {}, tenantId = "public" }) => {
  const filter = buildProductFilter(query);
  filter.tenantId = tenantId;
  const includeHidden = String(query.includeHidden) === "true";
  const visibilityFilter = {
    $or: [{ isHidden: false }, { isHidden: { $exists: false } }],
  };
  const mongoFilter = includeHidden ? filter : { $and: [filter, visibilityFilter] };
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query);

  const [items, total] = await Promise.all([
    Product.find(mongoFilter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(mongoFilter),
  ]);

  return {
    ok: true,
    statusCode: 200,
    data: {
      items,
      total,
      page,
      limit,
    },
    legacy: {
      products: items,
      total,
    },
  };
};

const getProductById = async ({ productId }) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid product ID format",
      code: "CATALOG_INVALID_PRODUCT_ID",
    };
  }

  const product = await Product.findById(productId);
  if (!product) {
    return {
      ok: false,
      statusCode: 404,
      message: "Product not found",
      code: "CATALOG_PRODUCT_NOT_FOUND",
    };
  }

  return {
    ok: true,
    statusCode: 200,
    data: { item: product },
    legacy: { product },
  };
};

const createProduct = async ({ payload }) => {
  const validationError = validateProductPayload(payload);
  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      message: validationError,
      code: "CATALOG_VALIDATION_ERROR",
    };
  }

  const data = normalizeProductPayload(payload);
  const created = await Product.create(data);
  const item = toPlain(created);

  return {
    ok: true,
    statusCode: 201,
    data: { item },
    legacy: {
      status: "success",
      item,
    },
  };
};

const updateProduct = async ({ productId, payload }) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid product ID format",
      code: "CATALOG_INVALID_PRODUCT_ID",
    };
  }

  const existing = await Product.findById(productId);
  if (!existing) {
    return {
      ok: false,
      statusCode: 404,
      message: "Product not found",
      code: "CATALOG_PRODUCT_NOT_FOUND",
      legacy: { status: "fail", message: "Product not found" },
    };
  }

  const merged = normalizeProductPayload({ ...toPlain(existing), ...payload });
  const validationError = validateProductPayload(merged);

  if (validationError) {
    return {
      ok: false,
      statusCode: 400,
      message: validationError,
      code: "CATALOG_VALIDATION_ERROR",
    };
  }

  existing.set(normalizeProductPayload(payload));
  await existing.save();

  const item = toPlain(existing);

  return {
    ok: true,
    statusCode: 200,
    data: { item },
    legacy: {
      status: "success",
      item,
    },
  };
};

const deleteProduct = async ({ productId }) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return {
      ok: false,
      statusCode: 400,
      message: "Invalid product ID format",
      code: "CATALOG_INVALID_PRODUCT_ID",
    };
  }

  const existing = await Product.findById(productId);
  if (!existing) {
    return {
      ok: false,
      statusCode: 404,
      message: "Product not found",
      code: "CATALOG_PRODUCT_NOT_FOUND",
      legacy: { status: "fail", message: "Product not found" },
    };
  }

  await existing.deleteOne();

  return {
    ok: true,
    statusCode: 200,
    data: { message: "Product deleted successfully" },
    legacy: {
      status: "success",
      message: "Product deleted successfully",
    },
  };
};

const listProductsByIds = async ({ ids = [] }) => {
  const sanitizedIds = Array.isArray(ids)
    ? ids.filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

  if (!sanitizedIds.length) {
    return {
      ok: true,
      statusCode: 200,
      data: { items: [] },
      legacy: { items: [] },
    };
  }

  const items = await Product.find({ _id: { $in: sanitizedIds } });

  return {
    ok: true,
    statusCode: 200,
    data: { items },
    legacy: { items },
  };
};

const listSimilarProducts = async ({ type }) => {
  const items = await Product.find({
    $and: [
      { type },
      { $or: [{ isHidden: false }, { isHidden: { $exists: false } }] },
    ],
  }).limit(10);

  return {
    ok: true,
    statusCode: 200,
    data: { items },
    legacy: { items },
  };
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
