const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "catalog_test_secret";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017";
process.env.CATALOG_DB_NAME = "book_catalog_test";
process.env.PUBLIC_TENANT_ID = "public";
process.env.CATALOG_INTERNAL_API_KEY = "catalog_internal_test_key";

const products = [];
const reviews = [];

const clone = (value) => JSON.parse(JSON.stringify(value));

const toStringValue = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }

  return `${value}`;
};

const matchField = (itemValue, queryValue) => {
  if (queryValue && typeof queryValue === "object" && !Array.isArray(queryValue)) {
    if (Object.prototype.hasOwnProperty.call(queryValue, "$regex")) {
      const regex = new RegExp(queryValue.$regex, queryValue.$options || "");
      return regex.test(toStringValue(itemValue));
    }

    if (Object.prototype.hasOwnProperty.call(queryValue, "$exists")) {
      const exists = itemValue !== undefined;
      return Boolean(queryValue.$exists) ? exists : !exists;
    }

    if (Object.prototype.hasOwnProperty.call(queryValue, "$in")) {
      return queryValue.$in.some((candidate) => toStringValue(candidate) === toStringValue(itemValue));
    }

    if (
      Object.prototype.hasOwnProperty.call(queryValue, "$gte") ||
      Object.prototype.hasOwnProperty.call(queryValue, "$lte")
    ) {
      const numeric = Number(itemValue);
      if (Object.prototype.hasOwnProperty.call(queryValue, "$gte") && numeric < Number(queryValue.$gte)) {
        return false;
      }
      if (Object.prototype.hasOwnProperty.call(queryValue, "$lte") && numeric > Number(queryValue.$lte)) {
        return false;
      }
      return true;
    }
  }

  return toStringValue(itemValue) === toStringValue(queryValue);
};

const matchesQuery = (item, query = {}) => {
  if (query.$and && Array.isArray(query.$and)) {
    const andPassed = query.$and.every((condition) => matchesQuery(item, condition));
    if (!andPassed) {
      return false;
    }
  }

  if (query.$or && Array.isArray(query.$or)) {
    const orPassed = query.$or.some((condition) => matchesQuery(item, condition));
    if (!orPassed) {
      return false;
    }
  }

  return Object.entries(query)
    .filter(([key]) => key !== "$or" && key !== "$and")
    .every(([key, value]) => matchField(item[key], value));
};

const sortItems = (items, sortObj = {}) => {
  const entries = Object.entries(sortObj);
  if (!entries.length) {
    return items;
  }

  return [...items].sort((a, b) => {
    for (const [field, direction] of entries) {
      const aValue = a[field] ?? 0;
      const bValue = b[field] ?? 0;

      if (aValue < bValue) {
        return direction >= 0 ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction >= 0 ? 1 : -1;
      }
    }
    return 0;
  });
};

const attachProductDocMethods = (product) => {
  product.toObject = () => clone(product);
  product.set = (updates = {}) => {
    Object.assign(product, clone(updates));
  };
  product.save = async () => product;
  product.deleteOne = async () => {
    const index = products.findIndex((item) => item._id === product._id);
    if (index >= 0) {
      products.splice(index, 1);
    }
  };
  return product;
};

const attachReviewDocMethods = (review) => {
  review.toObject = () => clone(review);
  review.set = (updates = {}) => {
    Object.assign(review, clone(updates));
  };
  review.save = async () => review;
  review.deleteOne = async () => {
    const index = reviews.findIndex((item) => item._id === review._id);
    if (index >= 0) {
      reviews.splice(index, 1);
    }
  };
  return review;
};

const createFindQuery = (collection, query = {}, attachDocMethods = (item) => item) => {
  const state = {
    sortObj: {},
    skipValue: 0,
    limitValue: null,
  };

  const builder = {
    sort(sortObj = {}) {
      state.sortObj = sortObj;
      return this;
    },
    skip(skipValue = 0) {
      state.skipValue = Number(skipValue) || 0;
      return this;
    },
    limit(limitValue = 0) {
      state.limitValue = Number(limitValue);
      return this;
    },
    exec() {
      let items = collection.filter((item) => matchesQuery(item, query));
      items = sortItems(items, state.sortObj);
      if (state.skipValue > 0) {
        items = items.slice(state.skipValue);
      }
      if (Number.isFinite(state.limitValue) && state.limitValue >= 0) {
        items = items.slice(0, state.limitValue);
      }
      return Promise.resolve(items.map((item) => attachDocMethods(item)));
    },
    then(resolve, reject) {
      return this.exec().then(resolve, reject);
    },
  };

  return builder;
};

const mockProductModel = {
  find: jest.fn((query = {}) => createFindQuery(products, query, attachProductDocMethods)),

  countDocuments: jest.fn(async (query = {}) =>
    products.filter((item) => matchesQuery(item, query)).length
  ),

  findById: jest.fn(async (id) => {
    const found = products.find((item) => toStringValue(item._id) === toStringValue(id));
    return found ? attachProductDocMethods(found) : null;
  }),

  create: jest.fn(async (payload = {}) => {
    const createdAt = new Date().toISOString();
    const product = attachProductDocMethods({
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt,
      updatedAt: createdAt,
      ...clone(payload),
    });

    products.push(product);
    return product;
  }),

  findByIdAndUpdate: jest.fn(async (id, updates = {}) => {
    const found = products.find((item) => toStringValue(item._id) === toStringValue(id));
    if (!found) {
      return null;
    }

    Object.assign(found, clone(updates));
    found.updatedAt = new Date().toISOString();
    return attachProductDocMethods(found);
  }),

  aggregate: jest.fn(async (pipeline = []) => {
    if (!Array.isArray(pipeline) || !pipeline.length) {
      return [];
    }

    const grouped = {};
    for (const item of products) {
      const key = item.author || "";
      if (!grouped[key]) {
        grouped[key] = { _id: key, count: 0, books: [] };
      }
      grouped[key].count += 1;
      grouped[key].books.push(item.title);
    }

    return Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }),
};

const mockReviewModel = {
  find: jest.fn((query = {}) => createFindQuery(reviews, query, attachReviewDocMethods)),
  findOne: jest.fn(async (query = {}) => {
    const found = reviews.find((item) => matchesQuery(item, query));
    return found ? attachReviewDocMethods(found) : null;
  }),

  findById: jest.fn(async (id) => {
    const found = reviews.find((item) => toStringValue(item._id) === toStringValue(id));
    return found ? attachReviewDocMethods(found) : null;
  }),

  create: jest.fn(async (payload = {}) => {
    const createdAt = new Date().toISOString();
    const review = attachReviewDocMethods({
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt,
      updatedAt: createdAt,
      ...clone(payload),
    });

    reviews.push(review);
    return review;
  }),
};

jest.mock("../src/models/Product", () => mockProductModel);
jest.mock("../src/models/Review", () => mockReviewModel);
jest.mock("../src/services/checkoutClient", () => ({
  checkReviewEligibility: jest.fn(async () => ({
    data: {
      eligible: true,
      orderId: "order_1",
      message: "Đủ điều kiện đánh giá.",
    },
  })),
  completeOrderAfterReview: jest.fn(async () => ({
    data: { item: { _id: "order_1", orderStatus: "completed" } },
  })),
}));

const { createApp } = require("../src/index");

describe("catalog-service smoke flow", () => {
  const app = createApp();

  const adminToken = jwt.sign(
    { userId: "admin_1", role: "admin", email: "admin@example.com", tenantId: "public" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  const userToken = jwt.sign(
    { userId: "user_1", role: "user", email: "user@example.com", tenantId: "public" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  const tenantAToken = jwt.sign(
    { userId: "tenant_a_user", role: "user", email: "ta@example.com", tenantId: "tenant_a" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  beforeEach(() => {
    products.length = 0;
    reviews.length = 0;
    jest.clearAllMocks();

    products.push(
      attachProductDocMethods({
        _id: new mongoose.Types.ObjectId().toString(),
        tenantId: "public",
        imgSrc: "https://example.com/book1.jpg",
        title: "Node in Action",
        author: "Alice",
        price: 100000,
        discount: 10,
        soldCount: 15,
        rating: 0,
        reviewsCount: 0,
        type: "K",
        description: "Node and microservices",
        createdAt: new Date("2026-01-01").toISOString(),
      }),
      attachProductDocMethods({
        _id: new mongoose.Types.ObjectId().toString(),
        tenantId: "public",
        imgSrc: "https://example.com/book2.jpg",
        title: "React Guide",
        author: "Bob",
        price: 150000,
        discount: 20,
        soldCount: 30,
        rating: 0,
        reviewsCount: 0,
        type: "G",
        description: "React and frontend",
        createdAt: new Date("2026-01-02").toISOString(),
      })
    );
  });

  test("load product list, detail and search", async () => {
    const listRes = await request(app).get("/products").expect(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data.items)).toBe(true);
    expect(listRes.body.data.items.length).toBeGreaterThan(0);

    const productId = listRes.body.data.items[0]._id;

    const detailRes = await request(app).get(`/products/${productId}`).expect(200);
    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data.item._id).toBe(productId);

    const searchRes = await request(app)
      .get("/search")
      .query({ author: "Alice", page: 1, limit: 10 })
      .expect(200);

    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.items.length).toBe(1);
    expect(searchRes.body.data.items[0].author).toBe("Alice");
  });

  test("rejects tenant header mismatch against JWT claim", async () => {
    await request(app)
      .get("/products")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .set("x-tenant-id", "public")
      .expect(403);
  });

  test("allows internal tenant-scoped product list for assistant reindex", async () => {
    products.push(
      attachProductDocMethods({
        _id: new mongoose.Types.ObjectId().toString(),
        tenantId: "tenant_a",
        imgSrc: "https://example.com/tenant-a.jpg",
        title: "Tenant A Book",
        author: "Tenant A",
        price: 111000,
        type: "K",
      })
    );

    const response = await request(app)
      .get("/products")
      .set("x-internal-api-key", process.env.CATALOG_INTERNAL_API_KEY)
      .set("x-tenant-id", "tenant_a")
      .query({ page: 1, limit: 100 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.items.length).toBe(1);
    expect(response.body.data.items[0].tenantId).toBe("tenant_a");
  });

  test("rejects tenant-scoped internal list when internal key is invalid", async () => {
    await request(app)
      .get("/products")
      .set("x-internal-api-key", "wrong_key")
      .set("x-tenant-id", "tenant_a")
      .expect(401);
  });

  test("review flow works", async () => {
    const productId = products[0]._id;

    const createReviewRes = await request(app)
      .post(`/products/${productId}/reviews`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ content: "Great book", stars: 5 })
      .expect(201);

    expect(createReviewRes.body.success).toBe(true);

    const listReviewRes = await request(app)
      .get(`/products/${productId}/reviews`)
      .expect(200);

    expect(listReviewRes.body.success).toBe(true);
    expect(listReviewRes.body.data.items.length).toBe(1);
    expect(listReviewRes.body.data.items[0].content).toBe("Great book");
  });

  test("admin CRUD product works", async () => {
    const createRes = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        imgSrc: "https://example.com/book3.jpg",
        title: "Catalog Service Design",
        author: "Admin",
        price: 99000,
        type: "K",
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);

    const createdId = createRes.body.data.item._id;

    const updateRes = await request(app)
      .put(`/products/${createdId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Catalog Service Design Updated",
        imgSrc: "https://example.com/book3.jpg",
        author: "Admin",
        price: 120000,
        type: "K",
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.item.title).toContain("Updated");

    const deleteRes = await request(app)
      .delete(`/products/${createdId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(deleteRes.body.success).toBe(true);
  });
});
