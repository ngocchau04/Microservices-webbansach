const request = require("supertest");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const User = require("../models/User");

let app;
let mongo;

function buildTestApp() {
  const a = express();
  a.use(cors());
  a.use(express.json());

  // mount routes giống index.js
  a.use("/", require("../controllers/userController"));
  a.use("/search", require("../controllers/searchController"));
  a.use("/product", require("../controllers/productController"));
  a.use("/voucher", require("../controllers/voucherController"));
  a.use("/order", require("../controllers/orderController"));
  a.use("/review", require("../controllers/reviewController"));
  a.use("/feedback", require("../controllers/feedbackController"));
  a.use("/revenue", require("../controllers/revenueController"));
  a.use("/upload", require("../controllers/uploadController"));

  return a;
}

describe("Integration Test (API + DB) – ktpm-webbansach", () => {
  let userToken;
  let adminToken;
  let productId;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "jest" });

    app = buildTestApp();
  }, 60000);

  afterEach(async () => {
    const collections = await mongoose.connection.db.collections();
    for (const col of collections) {
      await col.deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  test("Login → Create product → Add cart → Get cart (integration flow)", async () => {
    // 1️⃣ Seed user & admin (tránh verify email)
    await User.create({
      name: "User IT",
      sdt: "000",
      email: "user.it@example.com",
      password: "12345678",
      role: "user",
      cart: [],
      favorite: []
    });

    await User.create({
      name: "Admin IT",
      sdt: "000",
      email: "admin.it@example.com",
      password: "12345678",
      role: "admin",
      cart: [],
      favorite: []
    });

    // 2️⃣ Login user
    const userLogin = await request(app)
      .post("/login")
      .send({ username: "user.it@example.com", password: "12345678" });

    expect(userLogin.statusCode).toBe(200);
    userToken = userLogin.body.token;
    expect(userToken).toBeTruthy();

    // 3️⃣ Login admin
    const adminLogin = await request(app)
      .post("/login")
      .send({ username: "admin.it@example.com", password: "12345678" });

    expect(adminLogin.statusCode).toBe(200);
    adminToken = adminLogin.body.token;
    expect(adminToken).toBeTruthy();

    // 4️⃣ Admin tạo product (type = 'V' hợp lệ enum)
    const createProduct = await request(app)
      .post("/product")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        imgSrc: "img.jpg",
        title: "Sách Văn Học Test",
        author: "Tác giả A",
        translator: "",
        price: 10000,
        originalPrice: 12000,
        discount: 0,
        rating: 5,
        reviewsCount: 0,
        soldCount: 0,
        features: [],
        similarBooks: [],
        sku: "TEST-001",
        ageGroup: "",
        supplier: "",
        publisher: "",
        publicationYear: 2025,
        language: "VN",
        weight: "",
        dimensions: "",
        pages: 100,
        binding: "",
        description: "Mô tả test",
        type: "V" // ✅ HỢP LỆ enum
      });

    expect(createProduct.statusCode).toBe(201);
    productId = createProduct.body.data._id;
    expect(productId).toBeTruthy();

    // 5️⃣ User thêm sản phẩm vào giỏ
    const addCart = await request(app)
      .post("/cart")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ productId, quantity: 1 });

    expect(addCart.statusCode).toBe(200);
    expect(Array.isArray(addCart.body.cart)).toBe(true);

    // 6️⃣ User xem giỏ hàng
    const getCart = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${userToken}`);

    expect(getCart.statusCode).toBe(200);
    expect(Array.isArray(getCart.body.cart)).toBe(true);
    expect(getCart.body.cart.length).toBe(1);
    expect(getCart.body.cart[0].product).toBeDefined();
  });
});
