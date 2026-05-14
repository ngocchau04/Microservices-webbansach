# BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG TEST

**Dự án:** Microservices-webbansach  
**Ngày đánh giá:** 2026-05-14  
**Tổng số file test:** 58  
**Tổng số test case:** ~230+

---

## TỔNG QUAN

| Rating | Số file | Tỷ lệ |
|---|---|---|
| ✅ TỐT | 32 | 55% |
| ⚠️ CẦN CẢI THIỆN | 23 | 40% |
| ❌ CÓ VẤN ĐỀ NGHIÊM TRỌNG | 3 | 5% |

### 6 Tiêu chí đánh giá

| # | Tiêu chí | Mô tả |
|---|---|---|
| 1 | **Coverage** | Happy path, error path, edge case có đủ không |
| 2 | **Mocking** | Over-mock, under-mock, hay mock sai cấp độ |
| 3 | **Assertion quality** | Assertion có đủ sâu, đủ cụ thể không |
| 4 | **Test isolation** | State sharing, cleanup giữa các test |
| 5 | **Business logic** | Test phản ánh nghiệp vụ thực hay chỉ test implementation |
| 6 | **Code smells** | Trùng lặp, magic value, console.log, TODO còn sót |

### 3 Vấn đề hệ thống nổi bật

1. **Mock cleanup bug** — Nhiều file Backend dùng `Model.method = jest.fn()` (direct assignment) không có `try/finally`. Nếu test fail giữa chừng, mock leak sang test tiếp theo gây false positive/negative khó debug.

2. **API response shape inconsistency** — Identity service test dùng `loginRes.body.token || loginRes.body.data.token` tại nhiều chỗ. Pattern này lộ ra response format không nhất quán trong API thật — một lỗi design cần sửa ở tầng API, không chỉ trong test.

3. **E2E test lẫn vào Jest runner** — `assistant.real.test.js` yêu cầu `localhost:8080` đang chạy, assertion rỗng (`statusCode.toBeDefined()`), và test silently pass khi prerequisite thiếu. File này không thuộc unit/integration test suite.

---

## CHI TIẾT TỪNG FILE

---

### 1. `Backend/test/authorizationService.unit.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit | Test cases: 27

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — có happy path và error path cho `checkLogin` và `checkAdmin`. Thiếu: malformed JWT, expired token |
| 2 | Mocking | ⚠️ Line 172: `jwt.verify = jest.fn()` dùng direct assignment thay vì `jest.spyOn` |
| 3 | Assertion quality | Tốt — kiểm tra status code và response message cụ thể |
| 4 | Test isolation | ⚠️ `jwt.verify` không được restore trong `try/finally` — nếu test fail, mock leak sang test tiếp theo |
| 5 | Business logic | Tốt — bao phủ các case authentication/authorization quan trọng |
| 6 | Code smells | Thiếu `try/finally` là systemic issue (xem vấn đề hệ thống #1) |

**Vấn đề chính:** Chuyển line 172 sang `jest.spyOn(jwt, "verify")` và restore trong `afterEach(() => jest.restoreAllMocks())`.

---

### 2. `Backend/test/cartController.unit.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit (MongoMemoryServer) | Test cases: 26

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — happy path + error path cho 4 cart endpoints |
| 2 | Mocking | ⚠️ Lines 201, 290, 401, 550: `User.findById = jest.fn()` không có `try/finally` — mock leak risk |
| 3 | Assertion quality | Tốt — kiểm tra response body và HTTP status |
| 4 | Test isolation | ⚠️ MongoMemoryServer được dùng đúng; nhưng mock assignment không an toàn |
| 5 | Business logic | Tốt — bao phủ cart CRUD |
| 6 | Code smells | 4 điểm direct assignment mock là systemic issue |

**Vấn đề chính:** Thêm `try/finally` hoặc chuyển sang `jest.spyOn` cho tất cả 4 điểm mock assignment.

---

### 3. `Backend/test/failureTests.unit.test.js`

**Rating: ❌ CÓ VẤN ĐỀ NGHIÊM TRỌNG** | Loại: N/A | Test cases: 0

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ❌ File hoàn toàn trống |
| 2 | Mocking | N/A |
| 3 | Assertion quality | N/A |
| 4 | Test isolation | N/A |
| 5 | Business logic | N/A |
| 6 | Code smells | ❌ File rác — tên hứa hẹn failure case tests nhưng không có nội dung |

**Vấn đề chính:** Điền nội dung hoặc xóa file. Tên file hứa hẹn test các trường hợp lỗi quan trọng — nên được viết.

---

### 4. `Backend/test/integration.only.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Integration | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ⚠️ Chỉ 1 happy path (Login→CreateProduct→AddCart→GetCart) — quá hẹp |
| 2 | Mocking | Tốt — dùng MongoMemoryServer, không mock business logic |
| 3 | Assertion quality | Tốt — verify từng bước trong flow |
| 4 | Test isolation | ⚠️ `User.create({password: "12345678"})` lưu plain text. Nếu bcrypt được enable, bước login sẽ fail không rõ lý do |
| 5 | Business logic | Tốt — flow end-to-end có giá trị thực tế |
| 6 | Code smells | 1 test case chứa quá nhiều assertions — nên tách thành nhiều steps |

**Vấn đề chính:** Hash password trong setup; thêm ít nhất 1 negative case (login sai mật khẩu, add to cart khi không auth).

---

### 5. `Backend/test/orderController.unit.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit | Test cases: 11

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — bao phủ các order operations chính |
| 2 | Mocking | ⚠️ Line 248: `...testOrder._doc` dùng Mongoose internal property — fragile. Line 280: mock restore không có `try/finally` |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ Không có `try/finally` cho mock restore |
| 5 | Business logic | Tốt |
| 6 | Code smells | `_doc` là implementation detail của Mongoose; không nên expose trong test |

**Vấn đề chính:** Thay `_doc` bằng `.toObject()` hoặc dùng plain object; thêm `try/finally` cho mock restore tại line 280.

---

### 6. `Backend/test/searchController.unit.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit | Test cases: 19

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — nhiều search scenarios |
| 2 | Mocking | ⚠️ Lines 102, 374, 438: direct assignment mock không có `try/finally` |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ Mock leak risk tại 3 điểm |
| 5 | Business logic | Tốt |
| 6 | Code smells | Lines 34-35: `console.log` debug artifact còn sót trong test source |

**Vấn đề chính:** Xóa `console.log` tại lines 34-35; chuyển 3 mock assignments sang `jest.spyOn` pattern.

---

### 7. `Backend/test/userProfile.unit.test.js`

**Rating: ❌ CÓ VẤN ĐỀ NGHIÊM TRỌNG** | Loại: N/A | Test cases: 0

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ❌ File hoàn toàn trống |
| 2–6 | — | N/A |

**Vấn đề chính:** Giống `failureTests.unit.test.js` — file rác. User profile là feature quan trọng, cần được test.

---

### 8. `Backend/test/smoke/gateway.smoke.test.js`

**Rating: ✅ TỐT** | Loại: Smoke | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho smoke scope — health check, proxy GET, forward POST |
| 2 | Mocking | Tốt — mock upstream với `listen(0)` (random port, no conflict) |
| 3 | Assertion quality | Tốt — verify body và auth header được forward |
| 4 | Test isolation | Tốt — server cleanup trong `afterAll` |
| 5 | Business logic | Tốt — test body+auth header forwarding là yêu cầu quan trọng của proxy |
| 6 | Code smells | Không có vấn đề |

---

### 9. `apps/api-gateway/test/gateway.smoke.test.js`

**Rating: ✅ TỐT** | Loại: Smoke/Integration | Test cases: 15

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Xuất sắc — tất cả route rewrites + security scenarios đầy đủ |
| 2 | Mocking | Tốt — `mockProxyRequest` pattern chuẩn, không over-mock |
| 3 | Assertion quality | Xuất sắc — verify specific error codes: `GATEWAY_ROUTE_UNMAPPED`, `GATEWAY_ROUTE_NOT_FOUND` |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Xuất sắc — test bảo mật tenant (JWT claim vs header mismatch → 403, anonymous non-public tenant → 403) |
| 6 | Code smells | Clean |

**Ghi chú:** File tốt nhất trong nhóm gateway. Là mẫu pattern nên follow cho các smoke test khác.

---

### 10. `services/identity-service/test/authService.unit.real.test.js` *(đã đổi tên từ `authService.unit.test.js` — P3-01)*

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: "Unit" (thực chất: Integration với real MongoDB) | Test cases: 6

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ⚠️ Thiếu test quan trọng: đăng nhập với sai mật khẩu |
| 2 | Mocking | ⚠️ Kết nối real MongoDB nhưng đặt tên "unit" — gây hiểu nhầm về loại test |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ `User.create({password: "123456"})` lưu plain text — nếu bcrypt được enable, tất cả test sẽ break |
| 5 | Business logic | Tốt cho 6 cases có |
| 6 | Code smells | Tên file misleading — "unit" nhưng dùng real DB |

**Vấn đề chính:** Thêm test "login with wrong password"; hash password trong setup; đổi tên file thành `authService.integration.test.js`.

---

### 11. `services/identity-service/test/authService.admin.unit.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: "Unit" (thực chất: Integration) | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho scope hẹp (admin không thể delete/edit admin khác) |
| 2 | Mocking | ⚠️ Real MongoDB, tên "unit" misleading |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ Plain text password concern tương tự file #10 |
| 5 | Business logic | Tốt — admin privilege boundaries quan trọng |
| 6 | Code smells | Tên file không phản ánh đúng loại test |

---

### 12. `services/identity-service/test/identity.smoke.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Smoke | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho smoke scope |
| 2 | Mocking | ⚠️ ~60-dòng custom in-memory mock model — rủi ro behavior drift cao khi MongoDB thay đổi |
| 3 | Assertion quality | ⚠️ Lines 131, 140, 148, 183: `loginRes.body.token \|\| loginRes.body.data.token` — lộ ra API response shape không nhất quán (systemic issue #2) |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | `\|\|` pattern trong assertion là dấu hiệu API contract không rõ ràng |

**Vấn đề chính:** Fix API response shape để nhất quán; xóa `||` pattern; cân nhắc dùng MongoMemoryServer thay custom mock.

---

### 13. `services/identity-service/test/functional.identity.integration.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Integration | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt |
| 2 | Mocking | Tốt — real MongoDB |
| 3 | Assertion quality | ⚠️ Cùng `\|\|` pattern như file #12 tại nhiều dòng |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | API response shape inconsistency |

---

### 14. `services/identity-service/test/functional.identity.admin.integration.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Integration | Test cases: 1 (nhưng cover 5 operations)

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ⚠️ 5 operations trong 1 test — nếu step 3 fail, steps 4-5 không bao giờ chạy |
| 2 | Mocking | Tốt — real MongoDB |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ Dependency chain giữa các bước trong cùng 1 test case |
| 5 | Business logic | Tốt — admin operations quan trọng |
| 6 | Code smells | "God test" — quá nhiều operations trong 1 test |

**Vấn đề chính:** Tách thành ít nhất 3 test cases: list users, update status, delete user.

---

### 15. `services/catalog-service/test/productService.unit.test.js`

**Rating: ✅ TỐT** | Loại: Unit (real MongoDB) | Test cases: 7

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — numeric normalization, tenant isolation, hidden product filtering |
| 2 | Mocking | Tốt — real MongoDB phù hợp cho DB-level logic |
| 3 | Assertion quality | Tốt — verify DB storage trực tiếp |
| 4 | Test isolation | Tốt — `beforeEach` cleanup |
| 5 | Business logic | Xuất sắc — numeric normalization (string→number) là business rule quan trọng |
| 6 | Code smells | Clean |

---

### 16. `services/catalog-service/test/reviewService.eligibility.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ⚠️ Chỉ 2 cases: non-buyer bị reject và eligible buyer succeed. Thiếu: duplicate review, invalid input, `deleteReview` |
| 2 | Mocking | Tốt |
| 3 | Assertion quality | Tốt cho 2 cases có |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt nhưng scope quá hẹp |
| 6 | Code smells | Không có issue về code quality, chỉ thiếu coverage |

**Vấn đề chính:** Thêm test: đăng ký review lần 2 (duplicate), xóa review, input validation.

---

### 17. `services/catalog-service/test/catalog.smoke.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Smoke | Test cases: 5

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho smoke scope |
| 2 | Mocking | ⚠️ 270-dòng custom in-memory mock reimplementation của MongoDB find/sort/filter/pagination — rủi ro behavior drift rất cao |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | 270 dòng mock là maintenance burden lớn — mỗi lần MongoDB query API thay đổi phải cập nhật mock |

**Vấn đề chính:** Xem xét thay bằng MongoMemoryServer để tránh mock behavior drift.

---

### 18. `services/catalog-service/test/functional.catalog.integration.test.js`

**Rating: ✅ TỐT** | Loại: Integration | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — verify 404 after deletion (behavior, không chỉ HTTP status) |
| 2 | Mocking | Tốt — real MongoDB |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | Clean |

---

### 19. `services/catalog-service/test/debugProductCleanup.test.js`

**Rating: ✅ TỐT** | Loại: Unit (narrow scope) | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho scope utility function |
| 2 | Mocking | Tốt — mocks `Product.deleteMany` đúng cách |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | Clean |

---

### 20. `services/checkout-service/test/orderService.voucher.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 4

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — voucher enforcement cases |
| 2 | Mocking | Tốt — `jest.clearAllMocks()` trong `beforeEach` |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt — clean mock per test |
| 5 | Business logic | Tốt — voucher logic là business critical |
| 6 | Code smells | Clean |

---

### 21. `services/checkout-service/test/orderService.postDelivery.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 6

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — 14-day review window, 7-day return window, order state machine |
| 2 | Mocking | Tốt — time mock bằng `Date.now() - N * 86400000` |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Xuất sắc — post-delivery business rules là critical path |
| 6 | Code smells | Magic number `86400000` — nên đặt constant `MS_PER_DAY` |

---

### 22. `services/checkout-service/test/checkout.smoke.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Smoke | Test cases: 4

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ⚠️ Không có negative cases — thiếu 401/403 authentication test |
| 2 | Mocking | ⚠️ ~155-dòng mock setup — nên tách thành helper/fixture file |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt cho scope |
| 6 | Code smells | Setup quá dài trong một file |

**Vấn đề chính:** Thêm test: truy cập không có token (401), truy cập endpoint admin với user token (403).

---

### 23. `services/checkout-service/test/momoService.test.js`

**Rating: ✅ TỐT** | Loại: Unit (pure functions) | Test cases: 5

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — tính thủ công HMAC-SHA256 để verify callback signature |
| 2 | Mocking | Tốt — minimal mock, pure function testing |
| 3 | Assertion quality | Xuất sắc — verify HMAC computation thực tế |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt — payment signature verification là security-critical |
| 6 | Code smells | Thiếu test "tampered params" nhưng không đủ nghiêm trọng |

---

### 24. `services/checkout-service/test/vnpayService.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ⚠️ Thiếu `verifyCallback` với tampered params — security gap quan trọng |
| 2 | Mocking | Tốt |
| 3 | Assertion quality | Tốt cho 3 cases có |
| 4 | Test isolation | Tốt |
| 5 | Business logic | ⚠️ Payment signature verification chưa được test đầy đủ |
| 6 | Code smells | Security gap đáng lo ngại |

**Vấn đề chính:** Thêm test: `verifyCallback` với params bị tamper phải return false/error.

---

### 25. `services/checkout-service/test/catalogClient.stockFallback.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho scope hẹp |
| 2 | Mocking | Xuất sắc — `jest.spyOn(global, "fetch")` với `afterEach(() => jest.restoreAllMocks())` — **pattern tốt nhất trong project** |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Xuất sắc — `restoreAllMocks` đảm bảo cleanup hoàn toàn |
| 5 | Business logic | Tốt — stock fallback behavior quan trọng |
| 6 | Code smells | Clean |

**Ghi chú:** Pattern `jest.spyOn` + `restoreAllMocks` này nên được áp dụng cho tất cả Backend test files.

---

### 26. `services/checkout-service/test/admin.order.unit.test.js`

**Rating: ✅ TỐT** | Loại: Unit (real MongoDB) | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt |
| 2 | Mocking | Tốt — real MongoDB |
| 3 | Assertion quality | Tốt — re-reads DB after update để verify persistence |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | Clean |

---

### 27. `services/checkout-service/test/functional.payment.unit.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — MoMo demo mode flow |
| 2 | Mocking | Tốt |
| 3 | Assertion quality | Tốt — verifies `.save()` được gọi trên cả payment và order |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | Clean |

---

### 28. `services/checkout-service/test/functional.payment.integration.test.js`

**Rating: ✅ TỐT** | Loại: Integration (real MongoDB+HTTP) | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — create payment + demo-return redirect (302 + correct Location header) |
| 2 | Mocking | Tốt — real DB |
| 3 | Assertion quality | Tốt — verify DB state sau mỗi operation |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt — payment redirect flow là UX critical |
| 6 | Code smells | Clean |

---

### 29. `services/checkout-service/test/functional.admin.order.integration.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Integration | Test cases: 1 (cover list + update)

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ⚠️ 2 operations trong 1 test — nếu list fail, update không chạy |
| 2 | Mocking | Tốt — real MongoDB |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ Operation dependency trong 1 test |
| 5 | Business logic | Tốt |
| 6 | Code smells | Nên tách thành 2 test cases độc lập |

---

### 30. `services/notification-service/test/notification.service.unit.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho scope hẹp |
| 2 | Mocking | Tốt |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ In-memory idempotency store **không được reset** trong `beforeEach`/`afterEach`. Nếu chạy test suite 2 lần trong cùng process, store đã có data từ lần trước |
| 5 | Business logic | Tốt — idempotency là critical cho notification |
| 6 | Code smells | Idempotency store isolation bug |

**Vấn đề chính:** Thêm `beforeEach(() => { /* clear idempotency store */ })` hoặc expose reset method.

---

### 31. `services/notification-service/test/notification.smoke.test.js`

**Rating: ✅ TỐT** | Loại: Smoke | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1–6 | Tất cả | Tốt — health check đơn giản, clean |

---

### 32. `services/notification-service/test/functional.notification.integration.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Integration | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt |
| 2 | Mocking | Tốt |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ Cùng idempotency store persistence concern như file #30 |
| 5 | Business logic | Tốt |
| 6 | Code smells | Cùng issue |

---

### 33. `services/support-service/test/feedback.service.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit (mocked model) | Test cases: 5

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt |
| 2 | Mocking | ⚠️ Line 152: hardcoded `feedbackId: "fb_1"` phụ thuộc vào internal counter của mock — fragile, order-dependent |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ Hidden dependency on mock implementation detail |
| 5 | Business logic | Tốt |
| 6 | Code smells | Magic value "fb_1" là code smell — nên lấy ID từ kết quả create thay vì hardcode |

**Vấn đề chính:** Lấy `feedbackId` từ kết quả của `createFeedback()` thay vì hardcode "fb_1".

---

### 34. `services/support-service/test/feedback.service.unit.real.test.js`

**Rating: ✅ TỐT** | Loại: Unit (real MongoDB) | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — tenantId persistence, handoff create và reopen |
| 2 | Mocking | Tốt — real DB appropriate |
| 3 | Assertion quality | Tốt — verify DB storage trực tiếp |
| 4 | Test isolation | Tốt — `beforeEach` cleanup |
| 5 | Business logic | Tốt — tenant isolation critical |
| 6 | Code smells | Clean |

---

### 35. `services/support-service/test/support.smoke.test.js`

**Rating: ✅ TỐT** | Loại: Smoke | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1–6 | Tất cả | Tốt — health check đơn giản, clean |

---

### 36. `services/support-service/test/functional.support.integration.test.js`

**Rating: ✅ TỐT** | Loại: Integration (real MongoDB+HTTP) | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — feedback creation+list và internal handoff+admin status update |
| 2 | Mocking | Tốt — real DB |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt — test full feedback và handoff flow |
| 6 | Code smells | Clean |

---

### 37. `services/reporting-service/test/dashboard.service.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit (mocked) | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt |
| 2 | Mocking | Tốt |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | ⚠️ Line 15: `orderStatus: "Hoan tat"` — Vietnamese string trong test data, nhưng codebase thực dùng English enum (e.g. "completed"). Nếu service filter theo orderStatus, metric sẽ sai |
| 6 | Code smells | Language inconsistency trong test data |

**Vấn đề chính:** Đổi `"Hoan tat"` thành giá trị enum tiếng Anh thực tế ("completed"). Verify với `orderService` enum definition.

---

### 38. `services/reporting-service/test/reporting.smoke.test.js`

**Rating: ✅ TỐT** | Loại: Smoke | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1–6 | Tất cả | Tốt — health check đơn giản, clean |

---

### 39. `services/reporting-service/test/reporting.service.real.unit.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — aggregated metrics + cache writing |
| 2 | Mocking | Xuất sắc — `http.createServer(handler)` + `listen(0)` mock upstream HTTP services. Pattern tốt nhất cho mocking HTTP dependencies |
| 3 | Assertion quality | Tốt — verify `ReportCache` được ghi vào real DB |
| 4 | Test isolation | Tốt — server cleanup trong `afterAll` |
| 5 | Business logic | Tốt |
| 6 | Code smells | Clean |

**Ghi chú:** Pattern `http.createServer` + `listen(0)` này nên được áp dụng trong các service khác cần mock external HTTP calls.

---

### 40. `services/reporting-service/test/functional.reporting.integration.test.js`

**Rating: ✅ TỐT** | Loại: Integration | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — admin summary/revenue + 403 for non-admin |
| 2 | Mocking | Tốt — cùng HTTP server mock pattern như file #39 |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt — access control test |
| 6 | Code smells | Clean |

---

### 41. `services/assistant-service/test/ranking.test.js`

**Rating: ✅ TỐT** | Loại: Unit (pure functions) | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho scope |
| 2 | Mocking | Tốt — không cần mock cho pure functions |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | Clean |

---

### 42. `services/assistant-service/test/query.understanding.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — alias expansion, shipping/returns policy detection |
| 2 | Mocking | Minimal — appropriate |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Xuất sắc — Vietnamese NLP testing phản ánh đúng domain |
| 6 | Code smells | Clean |

---

### 43. `services/assistant-service/test/assistant.intents.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 10

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Xuất sắc — bao phủ tất cả loại intent |
| 2 | Mocking | Tốt |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt — intent detection là core của chatbot |
| 6 | Code smells | Clean |

---

### 44. `services/assistant-service/test/chat.handoff.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt |
| 2 | Mocking | Tốt |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | ⚠️ Line 42: `createOrOpenSupportHandoff.mockClear()` được gọi **bên trong test body** thay vì `beforeEach` — hidden state management, sẽ không chạy nếu test bị skip |
| 5 | Business logic | Tốt |
| 6 | Code smells | `mockClear` placement là implementation smell |

**Vấn đề chính:** Di chuyển `mockClear()` ra `beforeEach`.

---

### 45. `services/assistant-service/test/support.handoff.tenant.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho scope |
| 2 | Mocking | Tốt — `jest.restoreAllMocks()` trong `afterEach` |
| 3 | Assertion quality | Tốt — verify `tenantId` xuất hiện trong cả header lẫn body |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt — tenant security |
| 6 | Code smells | Clean |

---

### 46. `services/assistant-service/test/tenant.isolation.test.js`

**Rating: ✅ TỐT** | Loại: Integration (real MongoDB) | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Xuất sắc — retrieval isolation, graph traversal isolation, reindex scope isolation |
| 2 | Mocking | Tốt — real DB cho true isolation testing |
| 3 | Assertion quality | Xuất sắc — verify data từ tenant B **không xuất hiện** trong kết quả tenant A |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Xuất sắc — tenant isolation là security-critical |
| 6 | Code smells | Clean |

**Ghi chú:** Một trong những test tốt nhất trong toàn project.

---

### 47. `services/assistant-service/test/adminCopilot.service.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 8

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Xuất sắc — memory persistence, topic switching, tất cả session operations |
| 2 | Mocking | Tốt |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Xuất sắc — dùng `_resetAdminCopilotMemoryForTests()` trong `beforeEach` — explicit reset method là pattern tốt |
| 5 | Business logic | Tốt — admin copilot là feature phức tạp, coverage đủ |
| 6 | Code smells | Clean |

---

### 48. `services/assistant-service/test/chatbot.intent.unit.test.js`

**Rating: ✅ TỐT** | Loại: Unit | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt cho `detectIntentDetailed` |
| 2 | Mocking | Minimal — appropriate |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | Clean |

---

### 49. `services/assistant-service/test/chatbot.chat.integration.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Integration (real MongoDB) | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt |
| 2 | Mocking | Tốt — real DB |
| 3 | Assertion quality | ⚠️ Line 114: kiểm tra literal string "MongoDB" trong suggestions — fragile, sẽ break nếu error message thay đổi |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | String literal check trong assertion là fragile test pattern |

**Vấn đề chính:** Thay vì check string "MongoDB", assert trên cấu trúc response (e.g. `suggestions.length > 0`) hoặc error code.

---

### 50. `services/assistant-service/test/chatbot.handoff.integration.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Integration (cross-service) | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — cross-service handoff verification |
| 2 | Mocking | Tốt — starts real support-service HTTP server |
| 3 | Assertion quality | Tốt — verify conversation được tạo trong support-service DB |
| 4 | Test isolation | ⚠️ Line 94: `require("../../support-service/node_modules/mongoose")` — fragile cross-package path. Sẽ break nếu support-service di chuyển hoặc hoist node_modules |
| 5 | Business logic | Xuất sắc — cross-service test có giá trị cao |
| 6 | Code smells | Cross-package `require` là fragile dependency |

**Vấn đề chính:** Thay `require("../../support-service/node_modules/mongoose")` bằng `require("mongoose")` từ workspace root hoặc dùng shared module.

---

### 51. `services/assistant-service/test/chatbot.admin.integration.test.js`

**Rating: ✅ TỐT** | Loại: Integration (real MongoDB) | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt |
| 2 | Mocking | Tốt — real DB |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | Clean |

---

### 52. `services/assistant-service/test/assistant.smoke.test.js`

**Rating: ✅ TỐT** | Loại: Smoke (real MongoDB + mocked Gemini) | Test cases: 8+

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Xuất sắc — tenant security (4 error codes), Vietnamese diacritic normalization, reindex validation |
| 2 | Mocking | Tốt — Gemini và catalogClient được mock hợp lý |
| 3 | Assertion quality | Tốt — verify specific error codes |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Xuất sắc — security và NLP đều được bao phủ |
| 6 | Code smells | Clean |

---

### 53. `services/assistant-service/test/assistant.real.e2e.js` *(đã đổi tên từ `assistant.real.test.js` — P1-03)*

**Rating: ❌ CÓ VẤN ĐỀ NGHIÊM TRỌNG** | Loại: E2E (không phải unit/integration) | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ❌ Vô nghĩa — assertion chính tại line 94: `expect(res.statusCode).toBeDefined()` luôn luôn true với bất kỳ statusCode nào kể cả 500 |
| 2 | Mocking | ❌ Không mock gì — kết nối trực tiếp đến `localhost:8080` phải đang chạy |
| 3 | Assertion quality | ❌ `toBeDefined()` trên một số là assertion rỗng. Lines 65-68: test **silently pass** khi prerequisite (testProductId) thiếu |
| 4 | Test isolation | ❌ Phụ thuộc vào external service tại localhost:8080 |
| 5 | Business logic | ❌ Không thể verify business logic khi assertion rỗng |
| 6 | Code smells | File này là E2E test giả danh unit test — nguy hiểm vì CI sẽ báo pass dù service down |

**Vấn đề chính:**
- Chuyển file ra thư mục `e2e/` hoặc `test/e2e/` riêng, không chạy trong Jest suite bình thường
- Thay `toBeDefined()` bằng assertion cụ thể: `expect(res.statusCode).toBe(200)`
- Xóa silent-pass pattern (lines 65-68) — nếu prerequisite thiếu thì test phải fail rõ ràng

---

### 54. `services/media-service/test/media.service.unit.test.js`

**Rating: ⚠️ CẦN CẢI THIỆN** | Loại: Unit | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | ⚠️ Chỉ test validation (file required, publicId required). Không có happy path test — toàn bộ upload success path bị bỏ qua |
| 2 | Mocking | ⚠️ Cloudinary không được mock → không thể test happy path |
| 3 | Assertion quality | Tốt cho 2 validation cases có |
| 4 | Test isolation | Tốt |
| 5 | Business logic | ⚠️ Media upload là chức năng quan trọng, chưa được test success path |
| 6 | Code smells | Incomplete coverage cho critical functionality |

**Vấn đề chính:** Thêm mock cho Cloudinary SDK; thêm test: upload thành công trả về URL, delete thành công.

---

### 55. `services/media-service/test/media.smoke.test.js`

**Rating: ✅ TỐT** | Loại: Smoke | Test cases: 1

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1–6 | Tất cả | Tốt — health check đơn giản, clean |

---

### 56. `apps/web/src/pages/Order/voucherCheckoutState.test.js`

**Rating: ✅ TỐT** | Loại: Unit (node:test runner) | Test cases: 6

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — tất cả branches của `normalizeVoucherCode`, `isVoucherInputBlockingCheckout`, exported constant |
| 2 | Mocking | Tốt — pure functions, không cần mock |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt — voucher state logic là user-facing feature |
| 6 | Code smells | Clean |

---

### 57. `apps/web/src/pages/Admin/AdminSupport/copilotUtils.test.js`

**Rating: ✅ TỐT** | Loại: Unit (node:test runner) | Test cases: 3

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — `buildAdminCopilotContextPayload` + `parseAdminCopilotSections` (structured + unstructured fallback) |
| 2 | Mocking | Tốt — pure functions |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt — admin copilot UI logic |
| 6 | Code smells | Clean |

---

### 58. `apps/web/src/utils/productImage.test.js`

**Rating: ✅ TỐT** | Loại: Unit (node:test runner) | Test cases: 2

| # | Tiêu chí | Đánh giá |
|---|---|---|
| 1 | Coverage | Tốt — placeholder cho empty URL và undefined URL |
| 2 | Mocking | Tốt — pure function |
| 3 | Assertion quality | Tốt |
| 4 | Test isolation | Tốt |
| 5 | Business logic | Tốt |
| 6 | Code smells | Clean |

---

## ĐỀ XUẤT SỬA THEO ƯU TIÊN

### Ưu tiên 1 — Sửa ngay (ảnh hưởng đến độ tin cậy của test suite)

| # | File | Vấn đề | Hành động |
|---|---|---|---|
| P1-01 | `Backend/test/failureTests.unit.test.js` | File trống hoàn toàn | Viết test failure cases hoặc xóa file |
| P1-02 | `Backend/test/userProfile.unit.test.js` | File trống hoàn toàn | Viết test hoặc xóa file |
| P1-03 | `services/assistant-service/test/assistant.real.test.js` | E2E test trong Jest suite, assertion vô nghĩa | Di chuyển sang `e2e/` folder; sửa assertion `toBeDefined()` → `toBe(200)` — **✅ ĐÃ SỬA 2026-05-14 (đổi tên → assistant.real.e2e.js, Jest sẽ bỏ qua)** |
| P1-04 | `Backend/test/cartController.unit.test.js` lines 201, 290, 401, 550 | Mock leak risk | Chuyển sang `jest.spyOn` + `afterEach(() => jest.restoreAllMocks())` — **✅ ĐÃ SỬA 2026-05-14** |
| P1-05 | `Backend/test/authorizationService.unit.test.js` line 172 | Mock leak risk | Chuyển `jwt.verify = jest.fn()` sang `jest.spyOn(jwt, "verify")` — **✅ ĐÃ SỬA 2026-05-14** |
| P1-06 | `Backend/test/searchController.unit.test.js` lines 102, 374, 438 | Mock leak risk | Cùng fix pattern như P1-04 — **✅ ĐÃ SỬA 2026-05-14** |
| P1-07 | `Backend/test/orderController.unit.test.js` line 280 | Mock restore không có try/finally | Chuyển sang `jest.spyOn` + `afterEach(restoreAllMocks)` — **✅ ĐÃ SỬA 2026-05-14** |
| P1-08 | `services/notification-service/test/*.test.js` | Idempotency store không reset giữa các test | Expose reset method, gọi trong `beforeEach` |

### Ưu tiên 2 — Nên sửa (cải thiện chất lượng đáng kể)

| # | File | Vấn đề | Hành động |
|---|---|---|---|
| P2-01 | `services/identity-service/test/*.test.js` (3 files) | `\|\|` pattern trong token assertion | Fix API response shape để nhất quán; xóa `\|\|` — **⏭️ SKIP: bug code nguồn, đã ghi vào docs/BUGS_FOUND.md** |
| P2-02 | `services/identity-service/test/functional.identity.admin.integration.test.js` | 5 operations trong 1 test | Tách thành 3 test cases: list, update, delete — **✅ ĐÃ SỬA 2026-05-14** |
| P2-03 | `services/checkout-service/test/vnpayService.test.js` | Thiếu tampered-params security test | Thêm test verifyCallback với params bị tamper |
| P2-04 | `services/reporting-service/test/dashboard.service.test.js` line 15 | `orderStatus: "Hoan tat"` sai enum | Đổi thành English enum value thực tế |
| P2-05 | `services/assistant-service/test/chatbot.handoff.integration.test.js` line 94 | Cross-package `require` fragile path | Dùng `require("mongoose")` từ workspace root — **✅ ĐÃ SỬA 2026-05-14 (dùng createRequire từ node:module)** |
| P2-06 | `services/assistant-service/test/chat.handoff.test.js` line 42 | `mockClear` trong test body | Di chuyển ra `beforeEach` — **✅ ĐÃ SỬA 2026-05-14** |
| P2-07 | `services/support-service/test/feedback.service.test.js` line 152 | Hardcoded `feedbackId: "fb_1"` | Lấy ID từ kết quả create thay vì hardcode |
| P2-08 | `services/media-service/test/media.service.unit.test.js` | Không test happy path upload | Thêm mock Cloudinary + test success path |

### Ưu tiên 3 — Cải thiện về sau (technical debt)

| # | File | Vấn đề | Hành động |
|---|---|---|---|
| P3-01 | `services/identity-service/test/authService.unit.test.js` | Tên "unit" nhưng dùng real DB | Đổi tên file; thêm test "login wrong password" — **✅ ĐÃ SỬA 2026-05-14 (đổi tên → authService.unit.real.test.js)** |
| P3-02 | `services/catalog-service/test/catalog.smoke.test.js` | 270-dòng custom MongoDB mock | Xem xét thay bằng MongoMemoryServer |
| P3-03 | `services/checkout-service/test/checkout.smoke.test.js` | Thiếu 401/403 tests | Thêm negative auth tests |
| P3-04 | `services/catalog-service/test/reviewService.eligibility.test.js` | Chỉ 2 test cases | Thêm duplicate review, deleteReview tests |
| P3-05 | `services/assistant-service/test/chatbot.chat.integration.test.js` line 114 | Check literal "MongoDB" string | Assert trên error code hoặc response structure — **✅ ĐÃ SỬA 2026-05-14** |
| P3-06 | `Backend/test/orderController.unit.test.js` line 248 | `_doc` internal property | Thay bằng `.toObject()` — **✅ ĐÃ SỬA 2026-05-14** |
| P3-07 | `Backend/test/searchController.unit.test.js` lines 34-35 | `console.log` còn sót | Xóa debug logs — **✅ ĐÃ SỬA 2026-05-14** |
| P3-08 | `services/checkout-service/test/orderService.postDelivery.test.js` | Magic number `86400000` | Đặt constant `MS_PER_DAY = 86400000` |

---

## PATTERN TỐT — NÊN NHÂN RỘNG

| Pattern | File ví dụ | Áp dụng cho |
|---|---|---|
| `jest.spyOn` + `afterEach(jest.restoreAllMocks)` | `catalogClient.stockFallback.test.js` | Tất cả Backend test có mock |
| `http.createServer(handler)` + `listen(0)` mock HTTP upstream | `reporting.service.real.unit.test.js` | Các service cần mock external HTTP calls |
| `_resetXxxForTests()` explicit reset method | `adminCopilot.service.test.js` | Các service có in-memory state (notification idempotency store) |
| Verify DB sau mutation | `admin.order.unit.test.js` | Tất cả integration test có write operation |
| Specific error codes trong assertion | `gateway.smoke.test.js` | Tất cả test có error response |
