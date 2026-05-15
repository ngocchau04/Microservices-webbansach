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

---

## BUG-06: voucherController trả 500 cho ValidationError, E11000, và không validate expiration date

**Phát hiện tại:** `Backend/test/voucherController.unit.test.js` TC-06, TC-07, TC-08 (test.skip)  
**Nguồn gốc:** Bước 4 — viết unit test mới cho voucherController  
**Ngày phát hiện:** 2026-05-14

### Triệu chứng

**Issue A — POST thiếu required field → 500 thay vì 400:**
```
POST /voucher (body thiếu voucherCode)
Actual:   500 { status: "error", message: "Server error" }
Expected: 400 { status: "error", ... }
```
Mongoose `ValidationError` bị nuốt vào catch block chung → 500.

**Issue B — POST code trùng (unique) → 500 thay vì 409:**
```
POST /voucher (voucherCode đã tồn tại)
Actual:   500 { status: "error", message: "Server error" }
Expected: 409 { status: "error", ... }
```
MongoDB `MongoServerError: E11000 duplicate key error` bị nuốt → 500.

**Issue C — POST không validate expiration date trong quá khứ → 201:**
```
POST /voucher { voucherExpiration: new Date('2020-01-01') }
Actual:   201 — voucher được tạo thành công với expiration đã qua
Expected: 400 — từ chối tạo voucher hết hạn ngay từ đầu
```
Không có validation nào trong controller hoặc schema kiểm tra `voucherExpiration >= now`.

### Phân tích

`voucherController.js` dùng pattern catch chung giống `productController.js`:
```js
} catch (error) {
  console.error("Error:", error);
  res.status(500).json({ status: "error", message: "Server error" });
}
```
Không phân biệt `ValidationError` (400), `MongoServerError code 11000` (409), hay server error thật (500).

`voucherExpiration` trong `Voucher.js` schema chỉ là `{ type: Date }` — không có custom validator nào kiểm tra ngày không được trong quá khứ.

### Tác động

- Client nhận 500 cho lỗi dữ liệu của chính mình → không thể phân biệt bug server với input sai
- Admin có thể tạo voucher đã hết hạn mà không bị cảnh báo
- Duplicate voucherCode → 500 thay vì 409

### Fix đề xuất (tầng code nguồn)

**Fix A — Phân biệt lỗi trong catch:**
```js
} catch (error) {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ status: "error", message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ status: "error", message: "Voucher code already exists" });
  }
  console.error("Error:", error);
  res.status(500).json({ status: "error", message: "Server error" });
}
```

**Fix B — Thêm validate expiration date vào schema:**
```js
voucherExpiration: {
  type: Date,
  validate: {
    validator: function(v) { return !v || v > new Date(); },
    message: 'Expiration date must be in the future',
  },
},
```

**KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

---

## BUG-07: voucherController không validate ObjectId format trong PUT và DELETE

**Phát hiện tại:** `Backend/test/voucherController.unit.test.js` TC-16, TC-22 (test.skip)  
**Nguồn gốc:** Bước 4 — viết unit test mới cho voucherController  
**Ngày phát hiện:** 2026-05-14

### Triệu chứng

```
PUT /voucher/not-an-objectid
DELETE /voucher/not-an-objectid
Actual:   500 { status: "error", message: "Server error" }
Expected: 400 { message: "Invalid voucher ID format" }
```

### Phân tích

`productController.js` có kiểm tra ObjectId hợp lệ trước khi query:
```js
if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({ message: "Invalid product ID format" });
}
```

`voucherController.js` không có kiểm tra này. Khi `Voucher.findById('not-an-objectid')` được gọi, Mongoose ném `CastError: Cast to ObjectId failed` → bị nuốt vào catch block chung → 500.

### Tác động

- Không nhất quán với productController (product trả 400, voucher trả 500)
- CastError bị log như server error gây nhiễu log

### Fix đề xuất (tầng code nguồn)

Thêm vào đầu handler `PUT /:id` và `DELETE /:id` trong `voucherController.js`:
```js
if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ message: "Invalid voucher ID format" });
}
```

**KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

---

## BUG-08: userController — Ba endpoint update thiếu authentication và trả HTTP status code sai cho lỗi

**Phát hiện tại:** `Backend/test/failureTests.unit.test.js` FT-09, FT-10 (test.skip); `Backend/test/userProfile.unit.test.js` UP-02, UP-04, UP-06  
**Nguồn gốc:** Bước 4 — viết unit test mới cho userProfile và failureTests  
**Ngày phát hiện:** 2026-05-15

### Triệu chứng

**Issue A — Ba endpoint không có authentication (security gap):**

```
POST /update-name   → không cần token → cập nhật được tên bất kỳ user nào nếu biết email
POST /update-phone  → không cần token → tương tự
POST /update-password → không cần token → bất kỳ ai cũng đổi được password của người khác
```

Bất kỳ client nào cũng có thể gọi trực tiếp mà không cần JWT.

**Issue B — Lỗi trả về HTTP 200 thay vì HTTP 4xx/5xx:**

```
POST /update-name (email không tồn tại)
Actual:   HTTP 200 { status: "fail", message: "User not found" }
Expected: HTTP 404 { status: "fail", message: "User not found" }

POST /update-name (DB lỗi)
Actual:   HTTP 200 { status: "fail", message: "<error message>" }
Expected: HTTP 500 { status: "error", message: "Server error" }
```

Cả ba endpoint dùng `.then().catch()` với `res.send()` — không set HTTP status code. `res.send(body)` mặc định là 200 cho mọi trường hợp kể cả lỗi.

### Phân tích

```js
router.post("/update-name", (req, res) => {
  const { email, name } = req.body;
  User.findOneAndUpdate({ email }, { name }, { new: true })
    .then((user) => {
      if (user) {
        res.send({ status: "success", user });       // HTTP 200 ✓
      } else {
        res.send({ status: "fail", message: "User not found" });  // HTTP 200 ✗ (nên 404)
      }
    })
    .catch((error) => res.send({ status: "fail", message: error.message })); // HTTP 200 ✗ (nên 500)
});
```

Không có `checkLogin` middleware được gọi trước bất kỳ endpoint nào trong ba route này.

### Tác động

- **Security**: Bất kỳ attacker nào biết email của user đều có thể thay đổi name, phone, hoặc password mà không cần xác thực
- **API contract**: Client không thể phân biệt success (200) với "user not found" (cũng 200) qua HTTP status — phải parse body
- Không nhất quán với các endpoint khác trong project (đều dùng `res.status(404).json(...)`)

### Fix đề xuất (tầng code nguồn)

**Fix A — Thêm `checkLogin` middleware:**
```js
router.post("/update-name", checkLogin, (req, res) => { ... });
router.post("/update-phone", checkLogin, (req, res) => { ... });
router.post("/update-password", checkLogin, (req, res) => { ... });
```
Và đổi lookup từ email sang `req.user.userId` (sau khi thêm auth, dùng userId từ token thay vì email từ body).

**Fix B — Sửa HTTP status code:**
```js
.then((user) => {
  if (user) {
    res.status(200).json({ status: "success", user });
  } else {
    res.status(404).json({ status: "fail", message: "User not found" });
  }
})
.catch((error) => {
  console.error(error);
  res.status(500).json({ status: "error", message: "Server error" });
});
```

**KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

---

## BUG-09: reviewController — schema field mismatch và ownership check hỏng hoàn toàn

**Phát hiện tại:** `Backend/test/reviewController.unit.test.js` RV-11, RV-13 (test.skip)  
**Nguồn gốc:** Bước 4 — viết unit test mới cho reviewController  
**Ngày phát hiện:** 2026-05-15

### Triệu chứng

**Issue A — GET query sai field → luôn trả về array rỗng:**

```
GET /review/:productId (DB có 1 review cho productId này)
Actual:   200 { status: "success", data: [] }
Expected: 200 { status: "success", data: [{ rating: 5, review: "..." }] }
```

`reviewController.js` line 9:
```js
const reviews = await Review.find({ productId: req.params.productId });
```

Nhưng `Review.js` schema định nghĩa field là `product` (không phải `productId`):
```js
product: { type: mongoose.Schema.Types.ObjectId, ref: "products" }
```

MongoDB query `{ productId: ... }` không match field nào → luôn trả `[]`.

**Issue B — Ownership check bị hỏng hoàn toàn:**

`reviewController.js` line 39:
```js
if (req.user.id !== review.userId) { return res.status(403)... }
```

- `req.user.id`: JWT payload là `{ userId, role }` (xem `verityService.js`) → `req.user.id` = `undefined`
- `review.userId`: Schema có `user` (ObjectId), không có `userId` → `review.userId` = `undefined`
- `undefined !== undefined` = `false` → if block không bao giờ chạy → check không bao giờ trả 403

Kết quả: **bất kỳ user đăng nhập nào đều có thể sửa review của người khác**.

**Issue C — POST không gán userId đúng:**

`reviewController.js` line 20:
```js
req.body.userId = req.user.id;  // req.user.id = undefined
const review = new Review(req.body);
```

`req.user.id` là `undefined`. Schema có field `user` (không phải `userId`) → `userId` bị ignore bởi Mongoose strict mode → review được lưu nhưng **không có thông tin user gì cả**.

### Tác động

- GET reviews theo product luôn trả về `[]` → frontend không hiển thị được review nào
- Bất kỳ user đã đăng nhập nào cũng có thể sửa/xóa review của người khác
- Review sau khi tạo không liên kết với user → không thể biết ai viết review

### Fix đề xuất (tầng code nguồn)

**Fix A — GET query:**
```js
const reviews = await Review.find({ product: req.params.productId });
```

**Fix B — POST gán đúng field:**
```js
req.body.user = req.user.userId;  // dùng `user` field và `userId` từ JWT
```

**Fix C — PUT ownership check:**
```js
if (req.user.userId !== review.user?.toString()) {
  return res.status(403).json({ status: "fail", message: "Permission denied" });
}
```

**KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

---

## BUG-10: reviewController thiếu purchase-gate — mọi user đăng nhập đều review được

**Phát hiện tại:** `Backend/test/reviewController.unit.test.js` RV-12 (test.skip)  
**Nguồn gốc:** Bước 4 — viết unit test mới cho reviewController  
**Ngày phát hiện:** 2026-05-15

### Triệu chứng

```
POST /review { rating: 5, review: "Sách hay" } (user chưa mua sách)
Actual:   201 { status: "success", data: { _id: "...", rating: 5 } }
Expected: 403 { status: "fail", message: "Bạn chưa mua sản phẩm này" }
```

### Phân tích

`reviewController.js` chỉ kiểm tra `checkLogin` (đã đăng nhập), không kiểm tra xem user đã mua sản phẩm chưa trước khi cho phép tạo review. Không có:
- Kiểm tra Order history để xác nhận user đã purchase
- Kiểm tra duplicate review (user không nên review cùng sản phẩm nhiều lần)

### Tác động

- Bất kỳ user đã đăng nhập đều có thể review bất kỳ sản phẩm nào, kể cả sản phẩm chưa mua
- Có thể bị lạm dụng để spam review fake
- Không có cơ chế chặn 1 user review cùng 1 sản phẩm nhiều lần

### Fix đề xuất (tầng code nguồn)

Thêm vào `POST /` handler:
1. Kiểm tra trong Order collection xem `userId` có order với trạng thái `completed` chứa `productId` không
2. Kiểm tra trong Review collection xem `userId` đã review `productId` này chưa
3. Trả 403 nếu chưa mua, 409 nếu đã review rồi

**KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

---

## BUG-11: revenueController GET không có .catch() → unhandled rejection khi DB lỗi

**Phát hiện tại:** `Backend/test/revenueController.unit.test.js` RE-03 (test.skip)  
**Nguồn gốc:** Bước 4 — viết unit test mới cho revenueController  
**Ngày phát hiện:** 2026-05-15

### Triệu chứng

```
GET /revenue (DB lỗi)
Actual:   Request treo mãi, không có response (timeout)
Expected: 500 { status: "error", message: "Server error" }
```

### Phân tích

`revenueController.js`:
```js
router.get('/', (req, res) => {
    Revenue.find({},{_id: 0}).then((data) => {
        res.status(200).send(data);
    });
    // Không có .catch() !
});
```

Khi `Revenue.find()` reject (DB lỗi), Promise bị rejected nhưng không có handler → Node.js `UnhandledPromiseRejectionWarning` → request không nhận được response → client timeout.

Đây là anti-pattern phổ biến khi dùng `.then()` mà quên `.catch()`. So sánh với tất cả controller khác trong project đều dùng `async/await + try/catch`.

### Tác động

- DB lỗi → tất cả request đến `GET /revenue` treo mãi
- Server không crash nhưng connection pool bị chiếm bởi request treo
- Không thể viết test cho path này (sẽ timeout Jest)
- Node.js sẽ emit `UnhandledPromiseRejectionWarning` → future Node versions có thể crash process

### Fix đề xuất (tầng code nguồn)

Chuyển sang `async/await` và thêm try/catch:

```js
router.get('/', async (req, res) => {
  try {
    const data = await Revenue.find({}, { _id: 0 });
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching revenue:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});
```

**KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

---

## BUG-12: revenueController GET không có authentication — bất kỳ ai cũng xem được doanh thu

**Phát hiện tại:** `Backend/test/revenueController.unit.test.js` RE-04 (test.skip)  
**Nguồn gốc:** Bước 4 — viết unit test mới cho revenueController  
**Ngày phát hiện:** 2026-05-15

### Triệu chứng

```
GET /revenue (không có Authorization header)
Actual:   200 [ { year: 2024, revenue: [...] } ]
Expected: 401 { status: "error", message: "Unauthorized" }
```

### Phân tích

`revenueController.js` không có bất kỳ middleware authentication/authorization nào. Endpoint này lộ dữ liệu doanh thu kinh doanh nhạy cảm (revenue by year) cho bất kỳ ai biết URL.

So sánh: `voucherController.js` và `productController.js` đều dùng `checkAdmin` cho các endpoint admin-sensitive.

### Tác động

- Dữ liệu doanh thu (thông tin kinh doanh nhạy cảm) có thể bị truy cập bởi bất kỳ user nào, kể cả chưa đăng nhập
- Vi phạm nguyên tắc least privilege

### Fix đề xuất (tầng code nguồn)

Thêm `checkAdmin` middleware:
```js
const { checkAdmin } = require('../services/verityService');

router.get('/', checkAdmin, async (req, res) => { ... });
```

**KHÔNG thực hiện ở phase này — để phase fix code nguồn.**

