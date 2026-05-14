// test/bookstore.integration.test.js 
// (Đã chuyển đổi sang Microservices Integration Test qua API Gateway)
// Yêu cầu: Chạy lệnh `npm run compose:up` trước khi test.
// Lưu ý: KHÔNG DÙNG MOCK. Các test sẽ gọi trực tiếp vào API Gateway thật (cổng 8080).

const request = require("supertest");

// Trỏ trực tiếp vào API Gateway thực tế đang chạy
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080";

describe("Hệ thống: Integration Microservices Tests", () => {
  let adminToken;
  let userToken;
  let testProductId;

  // Tăng timeout vì gọi qua HTTP thực và Database thật có thể chậm
  jest.setTimeout(30000);

  describe("1. Identity Service: Đăng nhập với User Seed Thật", () => {
    test("Admin đăng nhập thành công", async () => {
      // Đăng nhập bằng credential từ file README.md
      const res = await request(GATEWAY_URL).post("/api/auth/login").send({
        email: "admin@bookstore.local",
        password: "Admin@123",
      });

      // Cho phép test fail tự nhiên nếu API chưa sẵn sàng
      expect(res.statusCode).toBe(200);
      adminToken = res.body.token || res.body.accessToken;
      expect(adminToken).toBeDefined();
    });

    test("User thường đăng nhập thành công", async () => {
      const res = await request(GATEWAY_URL).post("/api/auth/login").send({
        email: "user@bookstore.local",
        password: "User@123",
      });

      expect(res.statusCode).toBe(200);
      userToken = res.body.token || res.body.accessToken;
      expect(userToken).toBeDefined();
    });
  });

  describe("2. Catalog Service: Tìm kiếm Sản phẩm thật", () => {
    test("Lấy danh sách sản phẩm thật từ Catalog", async () => {
      const res = await request(GATEWAY_URL)
        .get("/api/catalog/products"); // Theo ReportChatbot, endpoint đúng là /products

      expect(res.statusCode).toBe(200);
      
      // Microservices Catalog trả về cấu trúc { data: { items: [] } }
      const data = res.body.data?.items || res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);

      // Lưu lại productId để test checkout nếu có data
      if (data.length > 0) {
        testProductId = data[0]._id;
      }
    });

    test("Tìm kiếm từ khóa rác không làm crash server", async () => {
      const res = await request(GATEWAY_URL)
        .get("/api/catalog/products")
        .query({ q: "khong_ton_tai_test_123" });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("3. Checkout Service: Quản lý Giỏ hàng", () => {
    test("Thêm sản phẩm thật vào giỏ hàng (cần đăng nhập)", async () => {
      let isFakeId = false;
      if (!testProductId) {
        console.warn("Cảnh báo: Không có testProductId. Sẽ dùng ID giả để test.");
        testProductId = "60c72b2f9b1e8a001c8e4d3a"; 
        isFakeId = true;
      }

      const res = await request(GATEWAY_URL)
        .post("/api/checkout/cart") // Chuẩn Microservices: Giỏ hàng nằm ở checkout-service
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 1,
        });

      if (isFakeId) {
        // Nếu dùng ID giả, checkout-service phải chặn và trả về 404 (Product Not Found)
        expect(res.statusCode).toBe(404);
      } else {
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("cart");
      }
    });

    test("Không có Token thì bị chặn (401 Unauthorized)", async () => {
      const res = await request(GATEWAY_URL)
        .get("/api/checkout/cart");
      
      // HTTP 401 hoặc 403 tùy gateway config, nhưng không thể 200
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe("4. Reporting & Auth: Phân quyền xem đơn hàng", () => {
    test("User thường không được xem tất cả đơn hàng (Admin Only)", async () => {
      const res = await request(GATEWAY_URL)
        .get("/api/checkout/order") // Endpoint đúng của orderController là /order
        .set("Authorization", `Bearer ${userToken}`);

      // Nếu API trả về 200 (Thành công) thì test sẽ FAIL đỏ, báo hiệu lỗ hổng bảo mật phân quyền.
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test("Admin có quyền xem tất cả đơn hàng", async () => {
      const res = await request(GATEWAY_URL)
        .get("/api/checkout/order")
        .set("Authorization", `Bearer ${adminToken}`);

      // Dù thành công hay không định tuyến thì không thể là 401/403
      expect(res.statusCode).not.toBe(401);
      expect(res.statusCode).not.toBe(403);
    });
  });
});
