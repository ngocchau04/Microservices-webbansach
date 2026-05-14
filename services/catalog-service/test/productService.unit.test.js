process.env.NODE_ENV = "test";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
process.env.CATALOG_DB_NAME = "book_catalog_jest";

const mongoose = require("mongoose");

const { connectDatabase } = require("../src/config/database");
const Product = require("../src/models/Product");
const productService = require("../src/services/productService");

describe("catalog productService unit", () => {
  const buildProductPayload = (overrides = {}) => ({
    tenantId: "public",
    imgSrc: "https://example.com/book.jpg",
    title: "Node.js Design Patterns",
    author: "Mario Casciaro",
    price: 180000,
    originalPrice: 220000,
    discount: 18,
    rating: 4.5,
    reviewsCount: 12,
    soldCount: 35,
    stock: 20,
    type: "K",
    description: "A practical backend engineering book.",
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

  test("createProduct stores a real product document with normalized numeric fields", async () => {
    const result = await productService.createProduct({
      payload: buildProductPayload({
        price: "199000",
        stock: "15",
        publicationYear: "2024",
        pages: "320",
      }),
    });

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(201);

    const created = await Product.findById(result.data.item._id).lean();
    expect(created).toBeTruthy();
    expect(created.price).toBe(199000);
    expect(created.stock).toBe(15);
    expect(created.publicationYear).toBe(2024);
    expect(created.pages).toBe(320);
  });

  test("getProductById returns the real product from a lean query without crashing on toObject", async () => {
    const product = await Product.create(
      buildProductPayload({
        title: "Clean Architecture",
        author: "Robert C. Martin",
      })
    );

    const result = await productService.getProductById({
      productId: String(product._id),
    });

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.data.item.title).toBe("Clean Architecture");
    expect(result.data.item.author).toBe("Robert C. Martin");
  });

  test("listProducts filters by tenant and excludes hidden products by default", async () => {
    await Product.create([
      buildProductPayload({
        tenantId: "tenant_a",
        title: "Visible Tenant A",
        author: "Author A",
        price: 120000,
        type: "K",
        isHidden: false,
      }),
      buildProductPayload({
        tenantId: "tenant_a",
        title: "Hidden Tenant A",
        author: "Author A",
        price: 90000,
        type: "K",
        isHidden: true,
      }),
      buildProductPayload({
        tenantId: "tenant_b",
        title: "Visible Tenant B",
        author: "Author B",
        price: 150000,
        type: "G",
        isHidden: false,
      }),
    ]);

    const result = await productService.listProducts({
      tenantId: "tenant_a",
      query: {},
    });

    expect(result.ok).toBe(true);
    expect(result.data.total).toBe(1);
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0].title).toBe("Visible Tenant A");
  });

  test("listProducts can include hidden products and sort them by price ascending", async () => {
    await Product.create([
      buildProductPayload({
        title: "Book High",
        author: "Author A",
        price: 300000,
        isHidden: true,
      }),
      buildProductPayload({
        title: "Book Mid",
        author: "Author B",
        price: 200000,
        isHidden: false,
      }),
      buildProductPayload({
        title: "Book Low",
        author: "Author C",
        price: 100000,
        isHidden: true,
      }),
    ]);

    const result = await productService.listProducts({
      tenantId: "public",
      query: {
        includeHidden: "true",
        sortBy: "price",
        sortOrder: "asc",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.data.items.map((item) => item.title)).toEqual([
      "Book Low",
      "Book Mid",
      "Book High",
    ]);
  });

  test("updateProduct persists real changes to the database", async () => {
    const product = await Product.create(
      buildProductPayload({
        title: "Old Title",
        price: 150000,
        stock: 7,
      })
    );

    const result = await productService.updateProduct({
      productId: String(product._id),
      payload: {
        title: "New Title",
        price: "175000",
        stock: "11",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.data.item.title).toBe("New Title");

    const updated = await Product.findById(product._id).lean();
    expect(updated.title).toBe("New Title");
    expect(updated.price).toBe(175000);
    expect(updated.stock).toBe(11);
  });

  test("deleteProduct removes the real product document", async () => {
    const product = await Product.create(buildProductPayload());

    const result = await productService.deleteProduct({
      productId: String(product._id),
    });

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);

    const deleted = await Product.findById(product._id).lean();
    expect(deleted).toBeNull();
  });

  test("listProductsByIds only returns the requested real products", async () => {
    const [bookA, bookB, bookC] = await Product.create([
      buildProductPayload({ title: "Book A", author: "A" }),
      buildProductPayload({ title: "Book B", author: "B" }),
      buildProductPayload({ title: "Book C", author: "C" }),
    ]);

    const result = await productService.listProductsByIds({
      ids: [String(bookA._id), String(bookC._id)],
    });

    expect(result.ok).toBe(true);
    expect(result.data.items).toHaveLength(2);
    expect(result.data.items.map((item) => item.title).sort()).toEqual(["Book A", "Book C"]);
    expect(result.data.items.some((item) => String(item._id) === String(bookB._id))).toBe(false);
  });

  test("listSimilarProducts returns real visible products of the same type", async () => {
    await Product.create([
      buildProductPayload({ title: "Tech Visible 1", type: "K", isHidden: false }),
      buildProductPayload({ title: "Tech Visible 2", type: "K", isHidden: false }),
      buildProductPayload({ title: "Tech Hidden", type: "K", isHidden: true }),
      buildProductPayload({ title: "Comic Visible", type: "G", isHidden: false }),
    ]);

    const result = await productService.listSimilarProducts({ type: "K" });

    expect(result.ok).toBe(true);
    expect(result.data.items.map((item) => item.title).sort()).toEqual([
      "Tech Visible 1",
      "Tech Visible 2",
    ]);
  });
});
