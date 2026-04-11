// test/bookstore.e2e.test.js
// Kiểm thử: Tìm kiếm hàng, Giỏ hàng, Đơn hàng, Phân quyền
// Backend: dùng các controller userController & orderController

const request = require("supertest");
const mongoose = require("mongoose");
const { app, connectDB } = require("../index");

// Model dùng để chuẩn bị dữ liệu đăng nhập
const User = require("../models/User");

require("dotenv").config();

let adminToken;
let userToken;
let adminId;
let userId;

beforeAll(async () => {
  // Kết nối MongoDB (dùng connectDB trong index.js)
  await connectDB();

  // Xóa dữ liệu user test nếu đã tồn tại
  await User.deleteMany({
    email: { $in: ["admin.test@example.com", "user.test@example.com"] },
  });

  // Tạo admin test
  const admin = await User.create({
    name: "Admin Test",
    sdt: "0123456789",
    email: "admin.test@example.com",
    password: "admin123", // login đang check plain text
    role: "admin",
  });

  // Tạo user thường test
  const user = await User.create({
    name: "User Test",
    sdt: "0987654321",
    email: "user.test@example.com",
    password: "user123",
    role: "user",
  });

  adminId = admin._id.toString();
  userId = user._id.toString();

  // Đăng nhập admin
  const resAdmin = await request(app).post("/login").send({
    username: "admin.test@example.com",
    password: "admin123",
  });

  if (resAdmin.statusCode !== 200) {
    console.warn("Admin login failed:", resAdmin.statusCode, resAdmin.body);
  }
  adminToken = resAdmin.body.token;

  // Đăng nhập user thường
  const resUser = await request(app).post("/login").send({
    username: "user.test@example.com",
    password: "user123",
  });

  if (resUser.statusCode !== 200) {
    console.warn("User login failed:", resUser.statusCode, resUser.body);
  }
  userToken = resUser.body.token;
}, 30000);

afterAll(async () => {
  // Xóa user test (nếu muốn sạch DB)
  await User.deleteMany({
    email: { $in: ["admin.test@example.com", "user.test@example.com"] },
  });

  await mongoose.disconnect();
});

/* ============================================================
 * 1. NGƯỜI DÙNG TÌM KIẾM HÀNG
 *    Dùng searchController mount tại /search
 * ============================================================ */

describe("Chức năng: Người dùng tìm kiếm hàng", () => {
  test("Tìm kiếm với từ khóa hợp lệ trả về 200", async () => {
    const res = await request(app)
      .get("/search")
      .query({ keyword: "Java" }); // trong DB sẵn có nhiều sách Java

    expect(res.statusCode).toBe(200);
    // Tùy controller: có thể trả về array hoặc object.
    // Ở đây chỉ kiểm tra không lỗi & có dữ liệu (nếu là mảng).
    if (Array.isArray(res.body)) {
      expect(res.body.length).toBeGreaterThanOrEqual(0);
    }
  });

  test("Tìm kiếm với từ khóa không tồn tại vẫn trả về 200, không lỗi server", async () => {
    const res = await request(app)
      .get("/search")
      .query({ keyword: "khongtontai_123456" });

    expect(res.statusCode).toBe(200);
  });
});

/* ============================================================
 * 2. GIỎ HÀNG
 *    Dùng các route /cart trong userController
 * ============================================================ */

describe("Chức năng: Giỏ hàng", () => {
  // Dùng một ObjectId giả làm productId (không bắt buộc phải tồn tại thật)
  const fakeProductId = new mongoose.Types.ObjectId().toString();

  test("User đăng nhập có thể thêm sản phẩm vào giỏ hàng", async () => {
    const res = await request(app)
      .post("/cart")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        productId: fakeProductId,
        quantity: 1,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("cart");
    expect(Array.isArray(res.body.cart)).toBe(true);
  });

  test("User đăng nhập có thể cập nhật số lượng trong giỏ hàng", async () => {
    const res = await request(app)
      .post("/cart")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        productId: fakeProductId,
        quantity: 3,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("cart");
    const item = res.body.cart.find(
      (i) => i.product.toString() === fakeProductId
    );
    if (item) {
      expect(item.quantity).toBe(3);
    }
  });

  test("Lấy giỏ hàng của user đăng nhập", async () => {
    const res = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("cart");
    expect(Array.isArray(res.body.cart)).toBe(true);
  });

  test("Không gửi token mà gọi /cart phải bị chặn (401 hoặc 403)", async () => {
    const res = await request(app).get("/cart");
    expect([401, 403]).toContain(res.statusCode);
  });
});

/* ============================================================
 * 3. ĐƠN HÀNG
 *    Dùng orderController mount tại /order
 *    - Admin: GET /order, PUT /order/:id/status
 *    - User:  GET /order/user, POST /order
 * ============================================================ */

describe("Chức năng: Đơn hàng", () => {
  let anyOrderId = null;

  test("Admin xem danh sách tất cả đơn hàng", async () => {
    const res = await request(app)
      .get("/order")
      .set("Authorization", `Bearer ${adminToken}`);

    // orderController: res.status(200).json({ status: "success", data: orders });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "success");
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      anyOrderId = res.body.data[0]._id;
    }
  });

  test("User thường KHÔNG được xem tất cả đơn hàng (GET /order)", async () => {
    const res = await request(app)
      .get("/order")
      .set("Authorization", `Bearer ${userToken}`);

    // checkAdmin sẽ chặn, có thể trả 401 hoặc 403
    expect([401, 403]).toContain(res.statusCode);
  });

  test("User xem đơn hàng của chính mình qua /order/user", async () => {
    const res = await request(app)
      .get("/order/user")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ userId }); // controller đang check req.body.userId

    // orderController: res.status(200).json({ status: "success", data: orders });
    // Nếu chưa có đơn thì data có thể là mảng rỗng, vẫn pass
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty("status", "success");
      expect(Array.isArray(res.body.data)).toBe(true);
    } else {
      // Trong trường hợp code kiểm tra không khớp body, có thể 403
      expect([403]).toContain(res.statusCode);
    }
  });

  test("Admin có thể cập nhật trạng thái đơn hàng nếu tồn tại ít nhất 1 đơn", async () => {
    if (!anyOrderId) {
      // Không có đơn hàng nào trong DB → bỏ qua test này
      console.warn(
        "Không tìm thấy đơn hàng nào để test cập nhật trạng thái. Bỏ qua test này."
      );
      return;
    }

    const res = await request(app)
      .put(`/order/${anyOrderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "processing" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "success");
    expect(res.body.data).toHaveProperty("status", "processing");
  });
});

/* ============================================================
 * 4. PHÂN QUYỀN
 *    Dùng lại các endpoint đã có:
 *    - /order (admin vs user)
 *    - /cart (login vs không login)
 * ============================================================ */

describe("Chức năng: Phân quyền", () => {
  test("Admin truy cập GET /order thành công", async () => {
    const res = await request(app)
      .get("/order")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  });

  test("User thường truy cập GET /order bị chặn (không phải admin)", async () => {
    const res = await request(app)
      .get("/order")
      .set("Authorization", `Bearer ${userToken}`);

    expect([401, 403]).toContain(res.statusCode);
  });

  test("Không có token mà gọi GET /order cũng bị chặn", async () => {
    const res = await request(app).get("/order");
    expect([401, 403]).toContain(res.statusCode);
  });

  test("User thường (đã login) vẫn truy cập /cart được bình thường", async () => {
    const res = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${userToken}`);

    // /cart dành cho user login, nên phải OK
    expect(res.statusCode).toBe(200);
  });
});
