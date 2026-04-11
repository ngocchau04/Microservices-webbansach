const normalizePrice = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parsePagination = (query = {}) => {
  const page = clamp(toPositiveInt(query.page, 1), 1, 100000);
  const limit = clamp(toPositiveInt(query.limit, 10), 1, 100);
  return { page, limit, skip: (page - 1) * limit };
};

const parseSort = (query = {}) => {
  const sort = {};

  const allowedFields = new Set([
    "price",
    "rating",
    "discount",
    "soldCount",
    "createdAt",
    "title",
  ]);

  if (query.sortBy && allowedFields.has(query.sortBy)) {
    sort[query.sortBy] = query.sortOrder === "asc" ? 1 : -1;
  }

  const sortByPriceFlag = Number(query.isSortByPrice);
  if (Number.isFinite(sortByPriceFlag) && sortByPriceFlag !== 0) {
    sort.price = sortByPriceFlag > 0 ? 1 : -1;
  }

  const sortByRatingFlag = Number(query.isSortByRating);
  if (Number.isFinite(sortByRatingFlag) && sortByRatingFlag !== 0) {
    sort.rating = sortByRatingFlag > 0 ? 1 : -1;
  }

  const sortByDiscountFlag = Number(query.isSortByDiscount);
  if (Number.isFinite(sortByDiscountFlag) && sortByDiscountFlag !== 0) {
    sort.discount = sortByDiscountFlag > 0 ? 1 : -1;
  }

  if (!Object.keys(sort).length) {
    sort.createdAt = -1;
  }

  return sort;
};

const buildProductFilter = (params = {}) => {
  const filter = {};

  if (typeof params.type === "string" && params.type.trim()) {
    filter.type = params.type.trim();
  }

  if (typeof params.author === "string" && params.author.trim()) {
    filter.author = params.author.trim();
  }

  if (typeof params.title === "string" && params.title.trim()) {
    filter.title = { $regex: params.title.trim(), $options: "i" };
  }

  const minPrice = normalizePrice(params.minPrice);
  const maxPrice = normalizePrice(params.maxPrice);

  if (minPrice !== null || maxPrice !== null) {
    filter.price = {};
    filter.price.$gte = minPrice !== null ? minPrice : 0;
    filter.price.$lte =
      maxPrice !== null ? maxPrice : Number.MAX_SAFE_INTEGER;
  }

  const q = typeof params.q === "string" ? params.q.trim() : "";
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { author: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  return filter;
};

const validateProductPayload = (payload = {}) => {
  if (!payload || typeof payload !== "object") {
    return "Product payload is required";
  }

  if (!payload.imgSrc || typeof payload.imgSrc !== "string") {
    return "imgSrc is required";
  }

  if (!payload.title || typeof payload.title !== "string") {
    return "title is required";
  }

  if (!payload.author || typeof payload.author !== "string") {
    return "author is required";
  }

  const price = normalizePrice(payload.price);
  if (price === null || price < 0) {
    return "price must be a valid non-negative number";
  }

  if (!payload.type || typeof payload.type !== "string") {
    return "type is required";
  }

  return null;
};

const validateReviewPayload = (payload = {}) => {
  const stars = Number(payload.stars ?? payload.rating);

  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return "stars must be between 1 and 5";
  }

  if (!payload.content || typeof payload.content !== "string" || !payload.content.trim()) {
    return "content is required";
  }

  return null;
};

module.exports = {
  normalizePrice,
  parsePagination,
  parseSort,
  buildProductFilter,
  validateProductPayload,
  validateReviewPayload,
};
