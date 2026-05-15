# DE-MOCK AUDIT — Phân tích mock trong test suite

**Ngày thực hiện:** 2026-05-15  
**Phạm vi:** Read-only — không sửa bất kỳ file nào  
**Mục tiêu:** Xác định mock nào che giấu bug thực tế, mock nào hợp lệ về kỹ thuật

---

## 1. Tổng quan

| Chỉ số | Giá trị |
|--------|---------|
| Tổng file test được scan | **62** |
| File có ít nhất 1 mock | **20** |
| File không mock (pure functions / real DB) | **42** |
| Tổng mock điểm phát hiện | **~58** |

### Phân bố theo loại

| Loại | Số mock điểm | Số file | Hành động |
|------|--------------|---------|------------|
| **A** — Hợp lý, NÊN GIỮ | 46 | 14 | Không làm gì |
| **B** — Thay thế DB, NÊN GỠ | 10 | 6 | Thay bằng mongodb-memory-server |
| **C** — Security-sensitive, ĐỀ XUẤT GỠ | 2 | 1 | Thay bằng real HMAC + test config |
| **D** — Over-mock | 0 | 0 | N/A |

> **Kết luận tổng thể:** Test suite này nhìn chung có chất lượng mock tốt. Không có Type D. Vấn đề chính là 6 file dùng custom in-memory DB mock thay vì mongodb-memory-server — đây là khoản nợ kỹ thuật cần giải quyết để schema validation và query behavior được test thật.

---

## 2. Bảng phân loại từng file

| File | Mock điểm | A (giữ) | B (gỡ) | C (đề xuất gỡ) | D | Ghi chú |
|------|-----------|---------|--------|-----------------|---|---------|
| `Backend/test/authorizationService.unit.test.js` | 4 | 4 | 0 | 0 | 0 | req/res/next standard + 1 jwt.verify spy |
| `Backend/test/cartController.unit.test.js` | 4 | 4 | 0 | 0 | 0 | Error path spies only |
| `Backend/test/failureTests.unit.test.js` | 1 | 1 | 0 | 0 | 0 | DB error spy |
| `Backend/test/feedbackController.unit.test.js` | 3 | 3 | 0 | 0 | 0 | Error path spies |
| `Backend/test/orderController.unit.test.js` | 3 | 3 | 0 | 0 | 0 | Error path spies |
| `Backend/test/productController.unit.test.js` | 8 | 8 | 0 | 0 | 0 | Error path spies + chained mock |
| `Backend/test/reviewController.unit.test.js` | 3 | 3 | 0 | 0 | 0 | Error path spies |
| `Backend/test/revenueController.unit.test.js` | 0 | 0 | 0 | 0 | 0 | Không mock |
| `Backend/test/searchController.unit.test.js` | 4 | 4 | 0 | 0 | 0 | Error path spies + chained mock |
| `Backend/test/userProfile.unit.test.js` | 3 | 3 | 0 | 0 | 0 | Error path spies |
| `Backend/test/voucherController.unit.test.js` | 6 | 6 | 0 | 0 | 0 | Error path spies |
| `Backend/test/smoke/gateway.smoke.test.js` | 1 | 1 | 0 | 0 | 0 | Fake legacy Express server |
| `services/catalog-service/test/catalog.smoke.test.js` | 3 | 1 | 2 | 0 | 0 | **BUG-03** gây ra need cho custom DB mock |
| `services/catalog-service/test/reviewService.eligibility.test.js` | 3 | 1 | 2 | 0 | 0 | **BUG-03** gây ra need cho custom DB mock |
| `services/checkout-service/test/orderService.voucher.test.js` | 1 | 1 | 0 | 0 | 0 | voucherService là HTTP cross-service |
| `services/checkout-service/test/orderService.postDelivery.test.js` | 4 | 2 | 2 | 0 | 0 | Order + Cart mocked thay vì real DB |
| `services/checkout-service/test/functional.payment.unit.test.js` | 4 | 0 | 2 | 2 | 0 | DB mock + HMAC mock |
| `services/checkout-service/test/catalogClient.stockFallback.test.js` | 1 | 1 | 0 | 0 | 0 | `global.fetch` mock |
| `services/media-service/test/media.service.unit.test.js` | 2 | 2 | 0 | 0 | 0 | Cloudinary (external paid API) |
| `services/reporting-service/test/dashboard.service.test.js` | 2 | 1 | 1 | 0 | 0 | ReportCache mocked, internalServiceClient OK |
| `services/support-service/test/feedback.service.test.js` | 2 | 1 | 1 | 0 | 0 | Feedback model mocked, notificationClient OK |

**Files không có mock (không liệt kê ở trên):** Tất cả assistant-service pure function tests, checkout-service momoService/vnpayService/admin.order.unit/functional tests, catalog-service productService.unit/functional, identity-service tất cả, notification-service tất cả, support-service functional, reporting-service functional và service.real.unit, media-service smoke/functional, apps/web 3 test files.

---

## 3. Chi tiết các điểm CÓ THỂ GỠ (Loại B và C)

---

### B-01: catalog.smoke.test.js — mockProductModel + mockReviewModel

**File:** `services/catalog-service/test/catalog.smoke.test.js`  
**Lines:** 11–257 (custom mock definition), 256–257 (jest.mock calls)

**Mock hiện tại làm gì:**

```js
// ~85 dòng định nghĩa custom in-memory mock thay thế MongoDB:
const products = [];   // mảng JavaScript thay thế collection
const reviews = [];

const mockProductModel = {
  find: jest.fn((query) => createFindQuery(products, query, ...)),
  findById: jest.fn(async (id) => products.find(...)),
  create: jest.fn(async (payload) => { products.push(...); return product; }),
  findByIdAndUpdate: jest.fn(async (id, updates) => { Object.assign(found, updates); }),
  aggregate: jest.fn(async (pipeline) => { /* hardcoded group-by-author logic */ }),
  countDocuments: jest.fn(async (query) => products.filter(...).length),
};
const mockReviewModel = { find, findOne, findById, create }; // tương tự

jest.mock("../src/models/Product", () => mockProductModel);
jest.mock("../src/models/Review", () => mockReviewModel);
```

**Đề xuất thay thế:** Thêm `mongodb-memory-server` vào `catalog-service`, xóa toàn bộ mock custom, dùng real `MongoMemoryServer.create()` như pattern trong Backend tests.

**Rủi ro nếu gỡ:** Test có thể FAIL do BUG-03 (text index `language override unsupported`). Phải fix BUG-03 trước bằng cách thêm `{ default_language: "none" }` vào Product schema text index. Sau khi fix, test sẽ PASS và phản ánh thực tế schema hơn.

**Hậu quả tốt khi gỡ:** Schema validation, index behavior, ObjectId casting — tất cả sẽ được test thật thay vì thông qua custom mock có thể che giấu lỗi.

**Effort:** Trung bình — cần fix BUG-03, thêm `mongodb-memory-server` vào package.json, refactor setup.

---

### B-02: reviewService.eligibility.test.js — mockProductModel + mockReviewModel

**File:** `services/catalog-service/test/reviewService.eligibility.test.js`  
**Lines:** 1–61

**Mock hiện tại làm gì:**

```js
// ~61 dòng custom mock
const mockProductModel = {
  findById: jest.fn(async (id) => products.get(String(id)) || null),
  findByIdAndUpdate: jest.fn(async () => null),
};
const mockReviewModel = {
  find: jest.fn((query) => ({ sort: async () => reviews.filter(...) })),
  findOne: jest.fn(async (query) => reviews.find(...)),
  findById: jest.fn(async (id) => reviews.find(...)),
  create: jest.fn(async (payload) => { reviews.push(...); return review; }),
};
jest.mock("../src/models/Product", () => mockProductModel);
jest.mock("../src/models/Review", () => mockReviewModel);
```

**Đề xuất thay thế:** Tương tự B-01 — mongodb-memory-server sau khi fix BUG-03.

**Rủi ro:** Phụ thuộc BUG-03. Ngoài ra, custom mock ở đây dùng `query.productId` thay vì field thật trong schema — nếu schema dùng field khác, test hiện tại pass nhưng code thực tế có thể không tìm được data (bug tương tự BUG-09 trong Backend).

**Effort:** Trung bình (như B-01).

---

### B-03: orderService.postDelivery.test.js — mockOrderModel + Cart mock

**File:** `services/checkout-service/test/orderService.postDelivery.test.js`  
**Lines:** 1–48

**Mock hiện tại làm gì:**

```js
const orderStore = new Map();

const mockOrderModel = {
  findById: jest.fn(async (id) => orderStore.get(String(id)) || null),
  find: jest.fn((query) => ({
    sort: async () => Array.from(orderStore.values()).filter(...),
  })),
};

jest.mock("../src/models/Order", () => mockOrderModel);
jest.mock("../src/models/Cart", () => ({ findOne: jest.fn() }));
jest.mock("../src/services/voucherService", () => ({}));
jest.mock("../src/services/catalogClient", () => ({}));
jest.mock("../src/services/notificationClient", () => ({
  sendOrderEmail: jest.fn(async () => {}),
  sendOrderStatusEmail: jest.fn(async () => {}),
}));
```

**Đề xuất thay thế:** Thêm `mongodb-memory-server` vào checkout-service (hoặc kết hợp với infrastructure của `admin.order.unit.test.js` đã có real MongoDB). Giữ `notificationClient` mock (Type A). Thay mockOrderModel + Cart bằng real documents.

**Rủi ro nếu gỡ:** Custom mock `mockOrderModel.find` hardcodes sort order trong JavaScript. Real MongoDB sort có thể trả khác trong edge cases. Test có thể fail nếu code dựa vào sort behavior của MongoDB cụ thể.

**Effort:** Trung bình — cần thêm mongodb-memory-server hoặc reuse existing real DB setup.

---

### B-04: functional.payment.unit.test.js — PaymentTransaction + Order model mocks

**File:** `services/checkout-service/test/functional.payment.unit.test.js`  
**Lines:** 1–10

**Mock hiện tại làm gì:**

```js
jest.mock("../src/models/PaymentTransaction", () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../src/models/Order", () => ({
  findById: jest.fn(),
}));
```

Các test sau đó gán return value thủ công:
```js
Order.findById.mockResolvedValue(order);
PaymentTransaction.create.mockResolvedValue(transaction);
```

**Đề xuất thay thế:** Dùng mongodb-memory-server. Tạo real Order và PaymentTransaction documents trong beforeEach.

**Rủi ro nếu gỡ:** Phụ thuộc B-05 (vnpay/momo mock). Nếu gỡ B-04 trước B-05, test vẫn chạy được vì logic payment flow không cần real signature. Nhưng nếu gỡ cả B-04 lẫn B-05 cùng lúc cần setup HMAC test keys.

**Effort:** Dễ (chỉ cần mongodb-memory-server setup, không cần refactor logic test).

---

### B-05: dashboard.service.test.js — ReportCache mock

**File:** `services/reporting-service/test/dashboard.service.test.js`  
**Lines:** 21–25

**Mock hiện tại làm gì:**

```js
jest.mock("../src/models/ReportCache", () => ({
  findOne: jest.fn(async () => null),        // luôn cache miss
  deleteOne: jest.fn(async () => null),
  findOneAndUpdate: jest.fn(async () => null),
}));
```

Mock này buộc cache luôn miss — test chỉ test "fresh computation" path, không bao giờ test "cache hit" path.

**Đề xuất thay thế:** Dùng mongodb-memory-server cho ReportCache. Thêm test case cho "cache hit" path (trả kết quả từ cache mà không gọi internalServiceClient).

**Rủi ro nếu gỡ:** Test sẽ phản ánh cả cache hit/miss behavior. Có thể lộ bug nếu cache invalidation logic có vấn đề.

**Effort:** Dễ — chỉ cần thêm mongodb-memory-server, `internalServiceClient` mock (Type A) vẫn giữ nguyên.

---

### B-06: feedback.service.test.js — Feedback model mock

**File:** `services/support-service/test/feedback.service.test.js`  
**Lines:** 10–41

**Mock hiện tại làm gì:**

```js
jest.mock("../src/models/Feedback", () => ({
  create: jest.fn(async (payload) => {
    const item = { _id: `fb_${savedItems.length + 1}`, ...payload };
    savedItems.push(item);
    return item;
  }),
  find: jest.fn((query) => ({
    sort: jest.fn(async () => savedItems.filter(...)),
  })),
  findById: jest.fn(async (id) => savedItems.find(...)),
  findOne: jest.fn((query) => ({
    sort: jest.fn(async () => savedItems.find(...)),
  })),
}));
```

~32 dòng custom in-memory implementation.

**Đề xuất thay thế:** Dùng mongodb-memory-server. Giữ `notificationClient` mock (Type A).

**Rủi ro nếu gỡ:** Custom mock dùng ID tự tạo (`fb_1`, `fb_2`) thay vì ObjectId thật. Nếu code nguồn có logic phụ thuộc ObjectId format, test hiện tại không phát hiện được. Sau khi gỡ mock, real ObjectId sẽ được dùng — có thể lộ bug tiềm ẩn.

**Effort:** Dễ — `support-service` đã có pattern real DB trong `feedback.service.unit.real.test.js`.

---

### C-01: functional.payment.unit.test.js — vnpayService + momoService mocks (HMAC verification)

**File:** `services/checkout-service/test/functional.payment.unit.test.js`  
**Lines:** 11–22

**Mock hiện tại làm gì:**

```js
jest.mock("../src/services/vnpayService", () => ({
  createPaymentUrl: jest.fn(),
  verifyCallback: jest.fn(),      // ← Mock HMAC signature verification
  isSuccessResponse: jest.fn(),
}));

jest.mock("../src/services/momoService", () => ({
  createPaymentUrl: jest.fn(),
  decodeExtraData: jest.fn(() => null),
  verifyCallback: jest.fn(),      // ← Mock HMAC signature verification
  isSuccessResponse: jest.fn(),
}));
```

**Vấn đề bảo mật:** `verifyCallback` trong cả hai service thực hiện HMAC-SHA256 verification của payment gateway callback. Mocking nó có nghĩa là `paymentService` không bao giờ được test với một signature thật:
- Nếu `paymentService` có lỗi trong cách gọi `verifyCallback` (sai tham số, bỏ qua return value), test hiện tại không phát hiện
- Nếu ai đó xóa lời gọi `verifyCallback` khỏi `paymentService`, test vẫn pass

**Ghi chú:** Có file riêng `momoService.test.js` và `vnpayService.test.js` test real HMAC crypto (đúng, không có mock). Nhưng `paymentService` là điểm tích hợp — nơi kết quả verify được consume — lại không được test end-to-end.

**Đề xuất thay thế:** Giữ real vnpayService và momoService (không mock), cung cấp test HMAC keys, tạo sample callback payloads với signature đúng/sai bằng cùng key. Loại bỏ `jest.mock` của hai service này; vẫn giữ DB mocks (hoặc thay bằng B-04 solution).

**Rủi ro nếu gỡ:** Test sẽ cần valid HMAC test payloads. Cần đọc source của momoService và vnpayService để biết format payload. Có thể lộ ra `paymentService` không xử lý HMAC failure đúng (→ BUG mới).

**Effort:** Trung bình — cần tạo helper để generate valid/invalid payment callbacks với test keys.

---

## 4. Khuyến nghị thứ tự gỡ

### Ưu tiên 1 — DB Mock (Loại B, high value, có infrastructure sẵn)

| Thứ tự | File | Prerequisite | Effort | Giá trị |
|--------|------|-------------|--------|---------|
| 1 | `B-06` support-service/feedback.service.test.js | None (mongodb-memory-server pattern sẵn trong service) | **Dễ** | Cao |
| 2 | `B-05` reporting-service/dashboard.service.test.js | None | **Dễ** | Cao + thêm cache-hit test |
| 3 | `B-04` checkout-service/functional.payment.unit.test.js | None | **Dễ** | Trung bình |
| 4 | `B-03` checkout-service/orderService.postDelivery.test.js | None | **Trung bình** | Cao |
| 5 | `B-01` + `B-02` catalog-service tests | **Fix BUG-03 trước** (add `default_language: "none"` to Product text index) | **Trung bình** | Rất cao |

### Ưu tiên 2 — Security Mock (Loại C)

| Thứ tự | File | Prerequisite | Effort |
|--------|------|-------------|--------|
| 6 | `C-01` checkout-service/functional.payment.unit.test.js | B-04 done | **Trung bình** |

### Không gỡ (Loại A — KEEP)

- Tất cả `mockRejectedValueOnce` / `mockImplementationOnce` trong Backend tests — bắt buộc để test error path
- Cloudinary mock trong media-service — external paid API, không thể test thật trong CI
- `global.fetch` mock trong catalogClient.stockFallback.test.js — HTTP isolation
- `voucherService`, `checkoutClient`, `notificationClient`, `internalServiceClient` mocks — cross-service HTTP
- req/res/next mocks trong authorizationService.unit.test.js — Express middleware testing standard
- `jwt.verify` spy (1 instance) trong authorizationService.unit.test.js — test 500-fallback path
- Fake legacy server trong gateway.smoke.test.js — smoke test infrastructure

---

## 5. Dự đoán hậu quả khi gỡ

### Mock loại nào sẽ lộ bug nhiều nhất?

**B-01/B-02 (catalog-service custom mock) — Dự đoán cao nhất:**

Lý do:
1. Custom mock trong `reviewService.eligibility.test.js` dùng `query.productId` nhưng catalog-service Review schema có thể dùng field khác (cần kiểm tra) — tương tự BUG-09 trong Backend
2. `mockProductModel.aggregate` hardcodes group-by-author logic, không test real MongoDB aggregation pipeline
3. Custom sort trong `createFindQuery` có thể không khớp MongoDB sort behavior với missing fields
4. `findByIdAndUpdate` trong custom mock không test `runValidators`, `new: true` option

→ Dự đoán: lộ ra **BUG-13** (catalog-service field mismatch trong review query) và/hoặc **BUG-14** (aggregation pipeline behavior khác).

**B-06 (support-service feedback mock) — Dự đoán trung bình:**

Custom mock dùng string ID (`fb_1`) thay vì ObjectId. Nếu có code check `typeof id === 'object'` hoặc dùng `.equals()` của Mongoose, có thể lộ bug.

→ Dự đoán: **BUG-15** tiềm ẩn liên quan ID comparison.

**C-01 (payment HMAC mock) — Dự đoán có thể cao:**

Nếu `paymentService` không thực sự check kết quả `verifyCallback` (ví dụ không check `if (!isValid) return error`), test hiện tại luôn pass nhưng production sẽ accept callback với signature sai.

→ Dự đoán: **BUG-16** (paymentService bypass HMAC verification, security vulnerability).

**B-03/B-04/B-05 — Dự đoán thấp đến trung bình:**

Các file này mock đơn giản hơn và service logic ít phụ thuộc vào MongoDB-specific behavior. Ít khả năng lộ bug mới, nhưng sẽ test thật hơn.

### Tests "pre-existing PASS" dự đoán sẽ chuyển thành FAIL

Per yêu cầu: "Cái nào fail thì để fail" — đây là điều mong muốn.

| Test | Lý do dự đoán FAIL khi gỡ mock |
|------|-------------------------------|
| catalog.smoke.test.js (khi gỡ B-01) | BUG-03 text index issue — phải fix trước |
| reviewService.eligibility.test.js (khi gỡ B-02) | BUG-03 và/hoặc field mismatch trong Review query |
| functional.payment.unit.test.js (khi gỡ C-01) | paymentService có thể không validate HMAC failure correctly |

---

## 6. Phụ lục — Files không có mock (tham khảo)

Các file này đang làm đúng, không cần gỡ gì:

| File | Pattern | Ghi chú |
|------|---------|---------|
| Backend/test/*.unit.test.js (11 files) | mongodb-memory-server + spyOn error path | Best practice |
| services/checkout-service/test/momoService.test.js | Không mock, test real HMAC crypto | Correct |
| services/checkout-service/test/vnpayService.test.js | Không mock, test real HMAC crypto | Correct |
| services/checkout-service/test/admin.order.unit.test.js | Real MongoDB connection | Correct |
| services/identity-service/test/*.test.js (4 files) | Real MongoDB connection | Correct |
| services/assistant-service/test/adminCopilot.service.test.js | Pure functions, _resetMemory() | Correct |
| services/assistant-service/test/ranking/intents/query tests | Pure functions, no mock | Correct |
| services/reporting-service/test/functional.reporting.integration.test.js | Real MongoDB + fake HTTP servers | Correct |
| services/support-service/test/feedback.service.unit.real.test.js | Real MongoDB | Correct |
| apps/web/src/**/*.test.js (3 files) | Pure functions, Node test runner | Correct |
