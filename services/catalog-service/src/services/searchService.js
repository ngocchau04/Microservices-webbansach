const Product = require("../models/Product");
const { parsePagination, parseSort, buildProductFilter } = require("../utils/validators");

const searchByMode = async ({ mode }) => {
  if (mode === "top24") {
    const items = await Product.find().limit(24);
    return {
      ok: true,
      statusCode: 200,
      data: { items, mode },
      legacy: { items },
    };
  }

  if (mode === "top10") {
    const items = await Product.find({ soldCount: { $exists: true } })
      .sort({ soldCount: -1 })
      .limit(10);
    return {
      ok: true,
      statusCode: 200,
      data: { items, mode },
      legacy: { items },
    };
  }

  if (mode === "sale10") {
    const items = await Product.find({ discount: { $exists: true } })
      .sort({ discount: -1 })
      .limit(10);

    return {
      ok: true,
      statusCode: 200,
      data: { items, mode },
      legacy: { items },
    };
  }

  if (mode === "topAuthors") {
    const items = await Product.aggregate([
      {
        $group: {
          _id: "$author",
          count: { $sum: 1 },
          books: { $push: "$title" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return {
      ok: true,
      statusCode: 200,
      data: { items, mode },
      legacy: { items },
    };
  }

  return null;
};

const searchProducts = async ({ params = {} }) => {
  const mode = typeof params.mode === "string" ? params.mode.trim() : "";

  if (mode) {
    const modeResult = await searchByMode({ mode });
    if (modeResult) {
      return modeResult;
    }
  }

  const filter = buildProductFilter(params);
  const { page, limit, skip } = parsePagination(params);
  const sort = parseSort(params);

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
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
      page,
      limit,
    },
  };
};

module.exports = {
  searchProducts,
};
