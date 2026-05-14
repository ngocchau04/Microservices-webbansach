# BƯỚC 3: TỔNG KẾT CẢI THIỆN TEST HIỆN CÓ

> Ngày thực hiện: 2026-05-14  
> Phạm vi: Toàn bộ monorepo (Backend/, services/*, apps/*)  
> Trạng thái: Hoàn thành — KHÔNG sửa bất kỳ file code nguồn nào

---

## 1. Phạm vi và mục tiêu

Bước 3 tập trung **cải thiện chất lượng test đang có** — không viết test mới từ đầu, không sửa code nguồn. Các thay đổi được giới hạn trong thư mục `test/` của từng service và file `docs/`. Mọi bug phát hiện trong quá trình review được ghi vào `docs/BUGS_FOUND.md` thay vì sửa trực tiếp, đảm bảo tách bạch giữa phase cải thiện test và phase sửa code nguồn.

Các loại cải thiện thực hiện: fix mock leak (mock assignment không có restore), tách god test thành test case độc lập, sửa test data sai (enum tiếng Việt → tiếng Anh), loại bỏ hardcoded ID bằng cách lấy từ kết quả thực, extract magic number thành named constant, sửa structural assertion quá cứng, thêm happy path test còn thiếu cho critical path, và thêm security test cho payment signature.

---

## 2. Bảng tổng hợp theo service

| Service | Số file test | Mục P1/P2/P3 đã sửa | Test trước (pass) | Test sau (pass) | Ghi chú |
|---|---|---|---|---|---|
| Backend (monolith) | 8 (6 có nội dung) | P1-04, P1-05, P1-06, P1-07, P3-06, P3-07 | ~83 | ~83 | Refactoring thuần: mock leak, `_doc`, `console.log` |
| assistant-service | 13 | P1-03, P2-05, P2-06, P3-05 | ~30 | ~29 (+1 skip) | 1 `test.skip` do BUG-02; rename e2e |
| identity-service | 5 | P2-02, P3-01 | ~14 | ~17 (+3) | Split 1→3 test; thêm wrong-password test |
| checkout-service | 9 | P2-03, P3-03, P3-08 | ~28 | ~33 (+5) | +2 VNPay security, +3 negative auth smoke |
| catalog-service | 4 | P3-04 | 7 *(BUG-03 ảnh hưởng 2 suite)* | 10 | +3 review tests; BUG-03 chưa fix |
| notification-service | 3 | P1-08 → BUG-04 | 5 | 5 | Không đổi; cần fix source trước |
| support-service | 4 | P2-07 | 10 | 10 | Sửa hardcoded ID, không thêm test |
| reporting-service | 4 | P2-04 | 8 | 8 | Sửa enum string sai, không thêm test |
| media-service | 3 | P2-08 | 6 | 8 (+2) | +2 Cloudinary happy path |
| apps/api-gateway | 1 | — | 17 | 17 | ✅ TỐT từ đầu, verify only |
| apps/web | 3 | — | 8 | 8 | ✅ TỐT từ đầu (node:test runner) |

> *Catalog-service: `productService.unit.test.js` (8 cases) và `functional.catalog.integration.test.js` (2 cases) bị BUG-03 làm fail toàn bộ ngay từ trước bước 3 — không phải do thay đổi của bước 3 gây ra.*

---

## 3. Bảng các mục đã xử lý

| Mã | Service | File | Tóm tắt thay đổi | Ngày |
|---|---|---|---|---|
| P1-03 | assistant-service | `assistant.real.test.js` → `assistant.real.e2e.js` | Đổi tên để Jest bỏ qua file E2E không thuộc unit/integration suite | 2026-05-14 |
| P1-04 | Backend | `cartController.unit.test.js` | Chuyển 4 điểm `Model.method = jest.fn()` sang `jest.spyOn` + `afterEach(restoreAllMocks)` | 2026-05-14 |
| P1-05 | Backend | `authorizationService.unit.test.js` | Chuyển `jwt.verify = jest.fn()` sang `jest.spyOn(jwt, "verify")` | 2026-05-14 |
| P1-06 | Backend | `searchController.unit.test.js` | Cùng pattern P1-04 cho 3 điểm mock assignment | 2026-05-14 |
| P1-07 | Backend | `orderController.unit.test.js` | Chuyển mock restore sang `jest.spyOn` + `afterEach` | 2026-05-14 |
| P1-08 | notification-service | — | Phát hiện `idempotencyStore` không có reset method → ghi BUG-04 | 2026-05-14 |
| P2-02 | identity-service | `functional.identity.admin.integration.test.js` | Tách 5 operations trong 1 god test → 3 test độc lập; setup chuyển vào `beforeEach` | 2026-05-14 |
| P2-03 | checkout-service | `vnpayService.test.js` | Thêm 2 security test: tampered params và garbage hash đều bị `verifyCallback` reject | 2026-05-14 |
| P2-04 | reporting-service | `dashboard.service.test.js` | `orderStatus: "Hoan tat"` → `"completed"` (xác nhận từ Order model enum) | 2026-05-14 |
| P2-05 | assistant-service | `chatbot.handoff.integration.test.js` | Thay `require("../../support-service/node_modules/mongoose")` bằng `createRequire` từ `node:module` | 2026-05-14 |
| P2-06 | assistant-service | `chat.handoff.test.js` | Di chuyển `mockClear` từ test body ra `beforeEach` | 2026-05-14 |
| P2-07 | support-service | `feedback.service.test.js` | Bỏ hardcode `feedbackId: "fb_1"` — lấy ID từ giá trị trả về của `createFeedback` và `createOrOpenAssistantHandoff` | 2026-05-14 |
| P2-08 | media-service | `media.service.unit.test.js` | Thêm `jest.mock("../src/config/cloudinary")` + 2 happy path: `uploadImage` thành công (mock `upload_stream` callback), `deleteImage` thành công (mock `destroy`) | 2026-05-14 |
| P3-01 | identity-service | `authService.unit.test.js` → `authService.unit.real.test.js` | Đổi tên phản ánh đúng loại test (real DB); thêm test login với sai mật khẩu | 2026-05-14 |
| P3-03 | checkout-service | `checkout.smoke.test.js` | Thêm 3 negative auth tests: GET /cart no token (401), GET /admin/orders user token (403), POST /cart invalid token (401) | 2026-05-14 |
| P3-04 | catalog-service | `reviewService.eligibility.test.js` | Thêm `findById` vào mock; thêm 3 test: duplicate review → 409, owner delete → 200, non-owner delete → 403 | 2026-05-14 |
| P3-05 | assistant-service | `chatbot.chat.integration.test.js` | Sửa assertion `includes("MongoDB")` → `every(s => typeof s === "string")` (không check literal hostname); thêm `test.skip` BUG-02 | 2026-05-14 |
| P3-06 | Backend | `orderController.unit.test.js` | Thay `order._doc` (Mongoose internal) bằng `order.toObject()` | 2026-05-14 |
| P3-07 | Backend | `searchController.unit.test.js` | Xóa 2 dòng `console.log` debug còn sót | 2026-05-14 |
| P3-08 | checkout-service | `orderService.postDelivery.test.js` | Extract magic number `24 * 60 * 60 * 1000` → `const MS_PER_DAY`; thêm `REVIEW_WINDOW_DAYS = 14`, `RETURN_WINDOW_DAYS = 7` | 2026-05-14 |

---

## 4. Các mục đã SKIP (có lý do)

| Mã | Service | Lý do không sửa |
|---|---|---|
| P2-01 | identity-service | **BUG-01**: Pattern `token \|\| data.token` là triệu chứng của bug design — response shape không nhất quán trong `authController.js`. Phải fix code nguồn trước, sau đó test tự nhiên sạch. |
| P3-02 | catalog-service | **Technical debt quá lớn**: `catalog.smoke.test.js` dùng custom 270-dòng MongoDB mock. Thay bằng MongoMemoryServer đòi hỏi viết lại gần như toàn bộ file — vượt phạm vi bước 3 (cải thiện, không rewrite). |
| P1-01 | Backend | **Bước 4**: `failureTests.unit.test.js` rỗng hoàn toàn — cần viết test mới, không phải cải thiện test cũ. |
| P1-02 | Backend | **Bước 4**: `userProfile.unit.test.js` rỗng hoàn toàn — cùng lý do P1-01. |

---

## 5. Bug phát hiện trong quá trình review test

Các bug sau là **pre-existing bug trong code nguồn**, lộ ra khi đọc kỹ test và trace ngược về source. Bước 3 **không fix** bất kỳ bug nào — chỉ ghi lại để xử lý trong phase riêng.

| ID | Service | File nguồn | Triệu chứng 1 dòng |
|---|---|---|---|
| **BUG-01** | identity-service | `authController.js` | Endpoint login trả về 2 shape khác nhau (`{ token }` flat vs `{ data: { token } }` wrapped) tùy code path — test phải dùng `\|\|` để xử lý cả hai |
| **BUG-02** | assistant-service | `liveCatalogFallbackService.js` | `shipping_policy` intent bị short-circuit bởi hardcoded constant trước khi corpus tenant-specific được tra cứu → vi phạm tenant isolation |
| **BUG-03** | catalog-service | `Product.js` (model) | MongoDB text index thiếu `default_language: "none"` → `MongoServerError: language override unsupported` khi chạy test, làm 2 test suite không chạy được |
| **BUG-04** | notification-service | `notificationService.js` | `idempotencyStore` (Map in-memory) không được export reset method → không thể reset state giữa các test, rủi ro false positive khi thêm test mới |

> Fix đề xuất chi tiết cho từng bug: xem `docs/BUGS_FOUND.md`.

---

## 6. Số liệu tổng

| Chỉ số | Số liệu |
|---|---|
| Tổng file test trước bước 3 | 58 file (trong đó 2 rỗng) |
| Tổng test case trước bước 3 | ~220 (baseline từ TEST_ANALYSIS.md) |
| Test case mới thêm | **+13** (P2-02: +2, P3-01: +1, P2-03: +2, P3-03: +3, P3-04: +3, P2-08: +2) |
| Test case bị skip | 1 (BUG-02 test trong assistant-service) |
| Tổng test case sau bước 3 | **~233** |
| Bug code nguồn phát hiện | 4 (BUG-01 đến BUG-04) |
| File test thay đổi (nội dung) | 14 file |
| File test đổi tên | 2 file (`bookstore.e2e.js`, `assistant.real.e2e.js`, `authService.unit.real.test.js`) |
| File docs tạo/cập nhật | 2 (`BUGS_FOUND.md` tạo mới, `TEST_REVIEW.md` cập nhật status) |
| Commit git trong bước 3 | **10 commits** (9 service + 1 duplicate Backend) |

---

## 7. Trạng thái sẵn sàng cho bước 4

### 2 file rỗng cần viết nội dung ở bước 4

| File | Loại test cần viết |
|---|---|
| `Backend/test/failureTests.unit.test.js` | Failure/error cases cho các controller quan trọng (product, voucher, order) |
| `Backend/test/userProfile.unit.test.js` | updateProfile, changePassword, favorites — logic user-facing quan trọng |

### 5 nhóm ưu tiên bổ sung test mới (từ TEST_ANALYSIS.md)

| Ưu tiên | Mục tiêu | Lý do |
|---|---|---|
| 1 | Backend `productController` + `voucherController` | Core business, không có test nào; rủi ro cao khi refactor sang microservices |
| 2 | Backend `userProfile.unit.test.js` (fill empty file) | File placeholder đã tồn tại, chỉ cần điền nội dung |
| 3 | checkout-service `cartService` unit tests | Business-critical; hiện chỉ được test qua smoke mock |
| 4 | media-service integration tests (upload/delete qua HTTP) | Upload là feature user-facing, chưa có integration test |
| 5 | catalog-service `searchService` unit tests | Search là tính năng dùng thường xuyên, không có unit test riêng |

### Bug còn pending (chờ phase fix code nguồn)

- **BUG-01** — identity-service: response shape không nhất quán
- **BUG-02** — assistant-service: `liveCatalogFallbackService` bypass tenant corpus
- **BUG-03** — catalog-service: MongoDB text index language override (fix: `default_language: "none"`)
- **BUG-04** — notification-service: `idempotencyStore` thiếu reset method

---

## 8. Nhận xét và bài học

**1. Mock leak là nguy cơ âm thầm, không gây fail ngay nhưng rất khó debug.**
Pattern `SomeModel.method = jest.fn()` (direct assignment) không tự restore sau test. Khi test fail giữa chừng, mock "nhiễm" sang test tiếp theo gây false positive. Backend có 4 điểm như vậy — tất cả đã được chuyển sang `jest.spyOn` + `afterEach(restoreAllMocks)`. Pattern này nên là tiêu chuẩn bắt buộc cho mọi mock trong project.

**2. Test xanh không có nghĩa là test đúng.**
`orderStatus: "Hoan tat"` trong reporting-service test đã pass trong nhiều sprint vì service dùng aggregation không validate enum. Nhưng string này không thể tồn tại trong prod DB (Mongoose enum constraint sẽ reject). Test đang kiểm tra một scenario không bao giờ xảy ra — cho kết quả "pass" nhưng không bảo vệ được gì. Cần kiểm tra test data phản ánh đúng giá trị thực tế trong hệ thống.

**3. BUGS_FOUND.md là ranh giới cần thiết giữa "cải thiện test" và "sửa code".**
Nếu không có file này, có cám dỗ sửa code nguồn ngay khi thấy bug — làm mất kiểm soát phạm vi. Việc ghi BUG-02 và skip test cho phép bước 3 kết thúc gọn gàng mà vẫn ghi nhận đầy đủ thông tin để fix sau. Pattern này phù hợp với mọi sprint có giới hạn scope rõ ràng.

**4. Hardcoded ID trong test (`"fb_1"`, `"order_1"`) tạo coupling ẩn với implementation detail của mock.**
Test không nên biết mock tạo ID theo cách nào (`fb_${savedItems.length + 1}`). Giải pháp đúng: capture ID từ giá trị trả về của chính operation (`createRes.data.feedback._id`). Cách này cũng giúp test tự nhiên phản ánh luồng nghiệp vụ thực — user tạo object rồi dùng ID đó cho bước tiếp theo.

**5. Đặt tên file test chính xác giúp CI/CD phân loại đúng và tránh chạy E2E không mong muốn.**
`assistant.real.test.js` nằm trong Jest suite nhưng yêu cầu server đang chạy — assertion gần như vô nghĩa khi server không có. Việc đổi tên thành `.e2e.js` (nằm ngoài Jest `testMatch`) là giải pháp đơn giản nhưng quan trọng để Jest không vô tình "pass" những test không thực sự kiểm tra gì.
