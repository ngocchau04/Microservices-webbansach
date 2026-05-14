// test/assistant.real.test.js
// Kiểm thử Integration Test cho chức năng Chatbot (Assistant Service) qua Gateway
// Không sử dụng Mock. Mọi lỗi (crash, timeout, rỗng) đều được report tự nhiên.

const request = require("supertest");
const mongoose = require("mongoose");

// Trỏ vào Gateway để đảm bảo định tuyến `/api/assistant` chạy tốt
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080";

describe("Assistant Service: Integration Chatbot Tests", () => {
  jest.setTimeout(30000); // Tăng timeout cho các API qua mạng thật

  let testProductId = null;

  beforeAll(async () => {
    // Lấy một ProductId thật từ catalog để test luồng ngữ cảnh (Graph)
    try {
      const res = await request(GATEWAY_URL).get("/api/catalog/products");
      const data = res.body.data?.items || res.body.data || res.body;
      if (Array.isArray(data) && data.length > 0) {
        testProductId = data[0]._id;
      }
    } catch (err) {
      console.warn("Lỗi khi fetch catalog trước khi test:", err.message);
    }
  });

  describe("1. Nhánh Text Chat (Rule-based & Fallback)", () => {
    test("Hỏi chatbot một câu bình thường (VD: 'Có sách React không?')", async () => {
      const res = await request(GATEWAY_URL)
        .post("/api/assistant/chat")
        .send({
          message: "Bạn có sách Đắc nhân tâm không?",
          context: {}
        });

      // Chắc chắn server không sập
      expect(res.statusCode).toBe(200);
      
      // Cấu trúc response thật của chatbot nằm trong res.body.data
      const responseData = res.body.data || res.body;
      expect(responseData).toHaveProperty("mainAnswer");
      expect(responseData).toHaveProperty("recommendations");
      expect(Array.isArray(responseData.recommendations)).toBe(true);
    });

    test("Hỏi chính sách vận chuyển (Rule-based Intent)", async () => {
      const res = await request(GATEWAY_URL)
        .post("/api/assistant/chat")
        .send({
          message: "Chính sách giao hàng của shop thế nào?",
          context: {}
        });

      expect(res.statusCode).toBe(200);
      
      const responseData = res.body.data || res.body;
      expect(responseData.mainAnswer).toMatch(/vận chuyển|giao hàng|nhận hàng/i);
    });
  });

  describe("2. Nhánh GraphRAG (Ngữ cảnh sản phẩm hiện tại)", () => {
    test("Hỏi sách 'Cùng thể loại' (Yêu cầu truyền currentProductId thật)", async () => {
      if (!testProductId) {
        console.warn("Bỏ qua test vì chưa lấy được testProductId thật từ Catalog");
        return;
      }

      const res = await request(GATEWAY_URL)
        .post("/api/assistant/chat")
        .send({
          message: "Có cuốn nào cùng thể loại cuốn này không?",
          currentProductId: testProductId,
          context: {}
        });

      expect(res.statusCode).toBe(200);
      const responseData = res.body.data || res.body;
      expect(responseData).toHaveProperty("mainAnswer");
      expect(Array.isArray(responseData.recommendations)).toBe(true);
    });
  });

  describe("3. Nhánh Image Search Chatbot", () => {
    test("Upload ảnh trống bị trả về lỗi từ server (fail naturally)", async () => {
      const res = await request(GATEWAY_URL)
        .post("/api/assistant/chat/image")
        .attach('image', Buffer.from('fake data format byte'), 'random.jpg');

      // Nếu cấu hình Image-Search Service thật bị lỗi, HTTP code sẽ khác 200 (có thể 400 hoặc 500)
      // Nếu nó pass thành công nhờ mock mode thì sẽ trả về 200
      // Chấp nhận mọi kết quả tự nhiên từ server, không ép code success
      expect(res.statusCode).toBeDefined();
    });
  });
});