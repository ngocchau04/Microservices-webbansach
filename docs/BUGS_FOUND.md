# BUGS FOUND — Phát hiện khi cải thiện test

Các bug phát hiện trong quá trình đọc/sửa test. KHÔNG sửa trực tiếp trong test — cần fix ở tầng code nguồn (controller/service).

---

## BUG-01: API response shape không nhất quán — identity-service login

**Phát hiện tại:** `services/identity-service/test/identity.smoke.test.js` lines 131, 140, 148, 183  
**Cũng xuất hiện tại:** `services/identity-service/test/functional.identity.integration.test.js`  
**Nguồn gốc:** P2-01 trong TEST_REVIEW.md  
**Ngày phát hiện:** 2026-05-14

### Triệu chứng

Test phải dùng pattern `||` để handle 2 dạng response khác nhau từ cùng 1 endpoint:

```js
// Pattern lộ ra bug trong test (không nên tồn tại):
const token = loginRes.body.token || loginRes.body.data.token;
```

### Phân tích

Endpoint login của identity-service trả về response theo 2 shape khác nhau tùy code path:
- **Shape A:** `{ token: "...", user: {...} }` — response flat
- **Shape B:** `{ success: true, data: { token: "...", user: {...} } }` — response wrapped

### Tác động

- Test phải viết defensive code thay vì assert cụ thể
- Client code (frontend) có thể đang xử lý sai với một trong hai shape
- Không thể unit test assertion chính xác mà không biết shape nào là đúng

### Fix đề xuất (tầng code nguồn)

Chọn 1 shape duy nhất (nên dùng wrapped: `{ success, data }` cho nhất quán với toàn bộ hệ thống microservices) và cập nhật tất cả response trong `identity-service/src/controllers/authController.js`.

Sau khi fix code nguồn, cập nhật test để xóa pattern `||` và assert shape cụ thể.

---

## BUG-02: liveCatalogFallbackService chặn truy vấn shipping_policy trước khi corpus được tra cứu

**Phát hiện tại:** `services/assistant-service/test/chatbot.chat.integration.test.js` line 102  
**Nguồn gốc:** Phân tích khi test fail với response không chứa nội dung corpus  
**Ngày phát hiện:** 2026-05-14

### Triệu chứng

Test gài FAQ tenant-specific (`"Don hang tai tenant chatbot duoc giao trong 24 gio o noi thanh."`) vào `CorpusDocument` nhưng response thực tế là hardcoded static string, không phải nội dung corpus:

```
Expected: toContain("24 gio")
Received: "Đơn hàng của bạn sẽ được xử lý sớm nhất trong giờ làm việc..."
```

### Phân tích

Luồng xử lý trong `chatInternal()` (`chatService.js`):

1. `detectPolicyIntent("chinh sach van chuyen...")` → `{ faqRefId: "shipping" }`
2. `chatService.js` line 396 chuyển thành `intent: "shipping_policy"` rồi gọi `runLiveCatalogFallback()`
3. `liveCatalogFallbackService.js` line 127-133: match `intent === "shipping_policy"` → return **hardcoded `POLICY_SHIPPING` constant** mà không tra `CorpusDocument` gì cả
4. `chatInternal()` nhận `liveFallback` non-null → `return liveFallback` tại line 406-408
5. Toàn bộ phần corpus retrieval (lines 410-481 chatService.js) **không bao giờ được chạy**

`liveCatalogFallbackService.js` được thiết kế như một "short-circuit" cho live catalog nhưng vô tình chặn luôn tenant-specific FAQ corpus — vi phạm tenant isolation.

### Tác động

- Tất cả tenant đều nhận cùng 1 nội dung shipping/return policy hardcoded, bất kể corpus của tenant đó
- Tenant isolation bị phá vỡ với `shipping_policy` và `return_policy` intent
- `sources[]` luôn rỗng với `shipping_policy` intent (test `sources.length > 0` fail)

### Fix đề xuất (tầng code nguồn)

**Option A (nhanh):** Trong `liveCatalogFallbackService.js`, xóa hoặc comment out khối `if (intent === "shipping_policy")` (lines 127-133) và `if (intent === "return_policy")` (lines 135-140) để corpus retrieval trong `chatInternal()` xử lý — nơi có đầy đủ tenant-scoped `CorpusDocument` lookup.

**Option B (đúng hơn):** Trong các khối đó, gọi `CorpusDocument.findOne({ tenantId, sourceType: "faq", refId: "shipping" })` trước, chỉ dùng hardcoded `POLICY_SHIPPING` làm fallback khi corpus không có document. Cần truyền `tenantId` vào `liveCatalogFallbackService`.

---

## BUG-03: MongoDB text index "language override unsupported" trong catalog-service

**Phát hiện tại:** `services/catalog-service/test/productService.unit.test.js`, `services/catalog-service/test/functional.catalog.integration.test.js`  
**Nguồn gốc:** Pre-existing, phát hiện khi chạy `npm test` trong catalog-service  
**Ngày phát hiện:** 2026-05-14

### Triệu chứng

2 test suite không chạy được, toàn bộ test case trong mỗi suite fail với cùng lỗi:

```
MongoServerError: language override unsupported
```

Ảnh hưởng:
- `productService.unit.test.js` — 8 test cases không chạy
- `functional.catalog.integration.test.js` — 2 test cases không chạy

### Phân tích

MongoDB text index trong Product schema có `language` field (hoặc `default_language` / `language_override`) dùng giá trị không được MongoMemoryServer (hoặc phiên bản MongoDB test) hỗ trợ. Phổ biến nhất là dùng locale tiếng Việt (`"vietnamese"`) hoặc `language_override: "language"` trỏ vào field không tồn tại trong document.

MongoDB chỉ hỗ trợ một tập ngôn ngữ nhất định trong text index; ngôn ngữ không nằm trong danh sách sẽ gây `language override unsupported` khi tạo collection/index.

### Tác động

- 2 test suite hoàn toàn không chạy được trong môi trường `npm test`
- Không thể verify logic của `productService` (createProduct, listProducts, updateProduct, deleteProduct, ...) qua automated test

### Fix đề xuất (tầng code nguồn)

Trong Product schema (`catalog-service/src/models/Product.js`), tìm phần định nghĩa text index và thêm `default_language: "none"` để tắt ngôn ngữ:

```js
// Trước:
ProductSchema.index({ title: "text", author: "text", description: "text" });

// Sau:
ProductSchema.index(
  { title: "text", author: "text", description: "text" },
  { default_language: "none" }
);
```

`"none"` là giá trị đặc biệt MongoDB hỗ trợ để bỏ qua stemming/stop-words — hoạt động tốt cho tiếng Việt và các ngôn ngữ không có trong danh sách built-in. **KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

---

## BUG-04: idempotencyStore trong notification-service không có reset method cho test

**Phát hiện tại:** `services/notification-service/test/notification.service.unit.test.js`, `services/notification-service/test/functional.notification.integration.test.js`  
**Nguồn gốc:** P1-08 trong TEST_REVIEW.md  
**Ngày phát hiện:** 2026-05-14

### Triệu chứng

Không có lỗi tức thì — tests hiện đang PASS. Vấn đề là rủi ro latent: `idempotencyStore` (Map in-memory) trong `notificationService.js` giữ state giữa các test trong cùng file, nhưng không có cách reset từ test.

### Phân tích

`notificationService.js` line 15:
```js
const idempotencyStore = new Map();
```

Module chỉ export 4 hàm gửi email — **không export reset method**:
```js
module.exports = {
  sendVerificationEmail,
  sendOrderEmail,
  sendOrderStatusEmail,
  sendSupportEmail,
};
```

Các test hiện dùng các idempotency key khác nhau (`"verify-demo-1"`, `"verify-route-1"`) nên chưa conflict. Nhưng nếu thêm test mới trong cùng file mà vô tình dùng lại key cũ (hoặc nếu `beforeEach` không reset store), test sẽ nhận `deduplicated: true` sai.

Pattern đúng (theo `adminCopilot.service.test.js`): expose `_resetIdempotencyStoreForTests()` và gọi trong `beforeEach` của test file.

### Tác động

- Rủi ro false positive trong tương lai khi thêm test case mới dùng cùng idempotency key
- Tests hiện tại PASS nhưng không bảo đảm isolation đầy đủ

### Fix đề xuất (tầng code nguồn)

Thêm vào cuối `notificationService.js`:

```js
// Chỉ dùng trong môi trường test — không expose trong production build
const _resetIdempotencyStoreForTests = () => idempotencyStore.clear();

module.exports = {
  sendVerificationEmail,
  sendOrderEmail,
  sendOrderStatusEmail,
  sendSupportEmail,
  _resetIdempotencyStoreForTests,
};
```

Sau khi code nguồn thêm method này, test file gọi trong `beforeEach`:
```js
beforeEach(() => {
  notificationService._resetIdempotencyStoreForTests();
});
```

**KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

---

## BUG-05: productController trả 500 cho mọi lỗi, không phân biệt lỗi client (ValidationError)

**Phát hiện tại:** `Backend/test/productController.unit.test.js` TC-13, TC-14 (test.skip)  
**Nguồn gốc:** Bước 4 — viết unit test mới cho productController  
**Ngày phát hiện:** 2026-05-14

### Triệu chứng

**Issue A — catch trả 500 cho tất cả lỗi:**

TC-13 (POST thiếu required field) và TC-14 (POST type ngoài enum) đều nhận 500 thay vì 400:

```
POST /product (body thiếu `title`)
Expected: 400 { status: "error", code: "VALIDATION_ERROR" }
Actual:   500 { status: "error", message: "Server error" }
```

Mongoose `ValidationError` là lỗi phía client (dữ liệu không hợp lệ) — phải trả 400, không phải 500.

**Issue B — PUT không hỗ trợ partial update:**

`productController.js` lines 94-119 xây `updatedData` bằng cách lấy từng field từ `req.body`:
```js
const updatedData = {
  imgSrc: req.body.imgSrc,   // undefined nếu không có trong body
  title: req.body.title,
  // ...
};
product.set(updatedData);
```

Khi client gửi PUT với chỉ `{ title: "new" }`, các field còn lại trong `updatedData` là `undefined`. Mongoose `product.set({ imgSrc: undefined, author: undefined, ... })` sẽ **unset** các field đó, dẫn đến ValidationError khi `save()`. Vì Issue A, lỗi này bị nuốt thành 500.

### Phân tích

Tất cả route handler trong `productController.js` dùng cùng pattern catch chung:

```js
} catch (error) {
  console.error("Error ...", error);
  res.status(500).json({ status: "error", message: "Server error" });
}
```

Không có xử lý `if (error.name === 'ValidationError')` để trả 400.

### Tác động

- `TC-13` và `TC-14` phải skip để tránh assert sai behavior → đánh mất test coverage cho validation path
- Bất kỳ request POST/PUT nào với dữ liệu không hợp lệ đều nhận 500 — client không thể phân biệt "lỗi server thật" với "dữ liệu sai"
- PUT partial update (chỉ gửi field cần thay đổi) không hoạt động; admin phải gửi full product data khi cập nhật

### Fix đề xuất (tầng code nguồn)

**Fix A — Phân biệt ValidationError trong catch:**
```js
} catch (error) {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ status: "error", message: error.message });
  }
  console.error("Error ...", error);
  res.status(500).json({ status: "error", message: "Server error" });
}
```

**Fix B — Chỉ include fields có mặt trong req.body vào updatedData (hỗ trợ partial update):**
```js
const updatedData = {};
const ALLOWED_FIELDS = ['imgSrc','title','author','translator','price','originalPrice',...,'type'];
for (const field of ALLOWED_FIELDS) {
  if (field in req.body) updatedData[field] = req.body[field];
}
product.set(updatedData);
```

**KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

