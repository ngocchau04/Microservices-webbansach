process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "catalog_integration_test_secret";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.CATALOG_DB_NAME = "book_catalog_jest";

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");

const { createApp } = require("../src/index");
const { connectDatabase } = require("../src/config/database");
const Product = require("../src/models/Product");

describe("functional catalog integration", () => {
  const app = createApp();
  const adminToken = jwt.sign(
    { userId: "admin_1", role: "admin", email: "admin@example.com", tenantId: "public" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const buildProductPayload = (overrides = {}) => ({
    tenantId: "public",
    imgSrc: "https://example.com/book.jpg",
    title: "Distributed Systems in Practice",
    author: "System Author",
    price: 210000,
    stock: 12,
    type: "K",
    description: "A backend and microservices focused book.",
    ...overrides,
  });

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase({
        mongoUri: process.env.MONGO_URI,
        dbName: process.env.CATALOG_DB_NAME,
      });
    }
  });

  beforeEach(async () => {
    await Product.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("admin CRUD flow works through the real catalog API", async () => {
    const createRes = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(buildProductPayload())
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const productId = createRes.body.data.item._id;

    const detailRes = await request(app).get(`/products/${productId}`).expect(200);
    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data.item.title).toBe("Distributed Systems in Practice");

    const updateRes = await request(app)
      .put(`/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(
        buildProductPayload({
          title: "Distributed Systems Updated",
          price: 225000,
          stock: 9,
        })
      )
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.item.title).toBe("Distributed Systems Updated");

    const deleteRes = await request(app)
      .delete(`/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(deleteRes.body.success).toBe(true);

    await request(app).get(`/products/${productId}`).expect(404);
  });

  test("list and search endpoints return the expected real products", async () => {
    await Product.create([
      buildProductPayload({
        title: "Node.js Microservices",
        author: "Alice",
        price: 180000,
        type: "K",
      }),
      buildProductPayload({
        title: "React for Teams",
        author: "Bob",
        price: 150000,
        type: "G",
      }),
      buildProductPayload({
        title: "Hidden Book",
        author: "Ghost",
        price: 90000,
        type: "K",
        isHidden: true,
      }),
    ]);

    const listRes = await request(app).get("/products").expect(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.items.map((item) => item.title).sort()).toEqual([
      "Node.js Microservices",
      "React for Teams",
    ]);

    const searchRes = await request(app)
      .get("/search")
      .query({ author: "Alice", page: 1, limit: 10 })
      .expect(200);

    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.items).toHaveLength(1);
    expect(searchRes.body.data.items[0].title).toBe("Node.js Microservices");

    const similarRes = await request(app).get("/products/similar/K").expect(200);
    expect(Array.isArray(similarRes.body)).toBe(true);
    expect(similarRes.body.map((item) => item.title)).toEqual(["Node.js Microservices"]);
  });
});
