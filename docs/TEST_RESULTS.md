# TEST RESULTS — Báo cáo verify cuối cùng

**Ngày chạy:** 2026-05-15  
**Phạm vi:** Toàn bộ project (Backend/, services/*, apps/*, trừ image-search-service Python)  
**Chế độ:** Chỉ đọc — không sửa bất kỳ file code hay test nào

---

## 1. Tổng quan

| Chỉ số | Giá trị |
|--------|---------|
| Tổng file test | **63** |
| Test suites (Jest) | **60** (2 fail, 58 pass) |
| Test suites (node:test) | **N/A** — apps/web dùng Node built-in runner |
| **Tổng test case** | **398** |
| **Pass** | **373** (93.7%) |
| **Fail** | **10** (2.5%) — tất cả BUG-03 catalog-service |
| **Skip** | **15** (3.8%) — BUG-05 đến BUG-12 (Backend), 1 Gemini API |
| Coverage trung bình (Stmt) | ~65% (ước tính weighted) |

---

## 2. Kết quả từng service

| Service | Suites (pass/total) | Tests (pass/skip/fail) | Coverage Stmt% | Coverage Branch% | Ghi chú |
|---------|---------------------|------------------------|----------------|------------------|---------|
| **Backend** | 13/13 ✅ | 203/14/0 | **81.51%** | 71.15% | 14 skip do BUG-05 đến BUG-12 |
| **identity-service** | 5/5 ✅ | 17/0/0 | 68.24% | 42.17% | Clean |
| **catalog-service** | 3/5 ❌ | 12/0/10 | 67.93% | 46.52% | 10 fail = BUG-03 (text index) |
| **checkout-service** | 10/10 ✅ | 37/0/0 | 47.68% | 27.10% | Clean; coverage thấp do nhiều service path chưa có test |
| **notification-service** | 3/3 ✅ | 6/0/0 | 58.94% | 32.04% | Clean |
| **support-service** | 4/4 ✅ | 10/0/0 | 76.61% | 55.55% | Clean; de-mock B-06 done |
| **reporting-service** | 4/4 ✅ | 9/0/0 | **81.26%** | 53.67% | Clean; de-mock B-05 done |
| **assistant-service** | 12/12 ✅ | 46/1/0 | 49.67% | 32.45% | 1 skip cần Gemini API thật |
| **media-service** | 3/3 ✅ | 8/0/0 | 76.64% | 53.60% | Clean |
| **api-gateway** | 1/1 ✅ | 17/0/0 | 73.44% | 57.93% | Clean |
| **apps/web** | N/A (node:test) | 8/0/0 | N/A | N/A | node:test runner, 2 file |

**Tổng cộng Jest:** 58/60 suites pass · 373/398 tests pass · 15 skip · 10 fail

---

## 3. Test fail

Tất cả 10 test fail đều thuộc **catalog-service**, nguyên nhân duy nhất: **BUG-03**.

### BUG-03: MongoServerError: language override unsupported

| File | Tests fail | Lý do |
|------|-----------|-------|
| `catalog-service/test/productService.unit.test.js` | 8 | Product schema text index không có `default_language: "none"` → MongoMemoryServer từ chối tạo collection |
| `catalog-service/test/functional.catalog.integration.test.js` | 2 | Cùng nguyên nhân — `Product.create()` fail ngay từ đầu |

**Lỗi cụ thể:**
```
MongoServerError: language override unsupported:
  errorResponse: { code: 17262, errmsg: 'language override unsupported: ' }
```

**Fix một dòng** trong `catalog-service/src/models/Product.js`:
```js
// Thêm { default_language: "none" } vào text index
ProductSchema.index(
  { title: "text", author: "text", description: "text" },
  { default_language: "none" }
);
```

**Phân loại:** Pre-existing bug, phát hiện khi thêm real-DB tests. **Không phải regression.**

---

## 4. Test skipped — liên kết BUG

### Backend — 14 test.skip

| Test ID | File | Mô tả | BUG liên quan |
|---------|------|-------|---------------|
| FT-09 | `failureTests.unit.test.js` | POST /update-name không yêu cầu token → nên 401 nhưng trả 200 | [BUG-08](BUGS_FOUND.md) |
| FT-10 | `failureTests.unit.test.js` | POST /update-password không yêu cầu token → nên 401 nhưng trả 200 | [BUG-08](BUGS_FOUND.md) |
| TC-13 | `productController.unit.test.js` | POST thiếu required field (title) → nên 400 nhưng trả 500 | [BUG-05](BUGS_FOUND.md) |
| TC-14 | `productController.unit.test.js` | POST type ngoài enum → nên 400 nhưng trả 500 | [BUG-05](BUGS_FOUND.md) |
| RE-03 | `revenueController.unit.test.js` | GET /revenue DB lỗi → request treo mãi (không có .catch()) | [BUG-11](BUGS_FOUND.md) |
| RE-04 | `revenueController.unit.test.js` | GET /revenue không yêu cầu auth — ai cũng xem được doanh thu | [BUG-12](BUGS_FOUND.md) |
| RV-11 | `reviewController.unit.test.js` | GET reviews → DB có data nhưng luôn trả [] (query sai field) | [BUG-09](BUGS_FOUND.md) |
| RV-12 | `reviewController.unit.test.js` | POST review không có purchase-gate — ai cũng review được | [BUG-10](BUGS_FOUND.md) |
| RV-13 | `reviewController.unit.test.js` | Ownership check hỏng — user khác sửa được review của người khác | [BUG-09](BUGS_FOUND.md) |
| TC-06 | `voucherController.unit.test.js` | POST thiếu required field (voucherCode) → nên 400 nhưng trả 500 | [BUG-06](BUGS_FOUND.md) |
| TC-07 | `voucherController.unit.test.js` | POST code trùng (E11000) → nên 409 nhưng trả 500 | [BUG-06](BUGS_FOUND.md) |
| TC-08 | `voucherController.unit.test.js` | POST voucherExpiration quá khứ → nên 400 nhưng trả 201 | [BUG-06](BUGS_FOUND.md) |
| TC-16 | `voucherController.unit.test.js` | PUT invalid ObjectId → nên 400 nhưng trả 500 | [BUG-07](BUGS_FOUND.md) |
| TC-22 | `voucherController.unit.test.js` | DELETE invalid ObjectId → nên 400 nhưng trả 500 | [BUG-07](BUGS_FOUND.md) |

### assistant-service — 1 test.skip

| File | Mô tả | Lý do skip |
|------|-------|-----------|
| `chatbot.chat.integration.test.js` | POST /chat returns grounded FAQ answer from tenant corpus without mocking | Cần Gemini API key thật + corpus seeding — không available trong test env |

---

## 5. So sánh trước / sau cải tiến

| Chỉ số | Trước (TEST_ANALYSIS.md — 2026-05-14) | Sau (hôm nay — 2026-05-15) | Delta |
|--------|---------------------------------------|---------------------------|-------|
| File test | 57 | 63 | **+6** |
| Test case tổng | ~220 (ước tính) | **398** (đếm thật) | **+178** |
| Test PASS | ~210 (ước tính) | **373** | **+163** |
| Test SKIP | 0 | **15** | **+15** (mới phát hiện qua test) |
| Test FAIL | 10 (catalog BUG-03 pre-existing) | **10** | 0 (BUG-03 chưa fix) |
| Bug được document | 0 | **12** (BUG-01 đến BUG-12) | **+12** |
| Services 100% pass | 9/11 | **10/11** | +1 |
| Coverage (Stmt) | Không đo | **~65%** (weighted avg) | N/A → 65% |
| Mock điểm de-mock | — | 4 files, 6 điểm mock đã gỡ | — |

**6 file mới thêm trong chiến dịch test:**
1. `Backend/test/productController.unit.test.js` (+33 pass, 2 skip)
2. `Backend/test/voucherController.unit.test.js` (+25 pass, 5 skip)
3. `Backend/test/reviewController.unit.test.js` (+10 pass, 3 skip)
4. `Backend/test/feedbackController.unit.test.js` (+11 pass)
5. `Backend/test/revenueController.unit.test.js` (+2 pass, 2 skip)
6. `catalog-service/test/debugProductCleanup.test.js` (utility cleanup test)

---

## 6. Đánh giá tổng kết

Project hiện đang ở trạng thái **test coverage tốt cho microservices mới** (support, reporting, identity, media, api-gateway đều clean với coverage 68–81%) nhưng **Backend legacy monolith có 12 bug đã document cần fix trước khi go-live**. Điểm mạnh nhất là các test thực tế với `mongodb-memory-server` sau de-mock phase — 4 file test đã được nâng cấp để test với real MongoDB thay vì custom mock, tăng độ tin cậy đáng kể.

Điểm yếu chính gồm 3 phần: (1) `catalog-service` bị block hoàn toàn bởi BUG-03 (text index) — fix chỉ cần 1 dòng; (2) `checkout-service` có coverage thấp nhất (47.68%) do phần lớn business logic trong `orderService.js`, `voucherService.js`, `cartService.js` chưa có integration test; (3) `assistant-service` có coverage 49.67% và 1 test skip cần Gemini API thật để enable.

**Đề xuất bước tiếp theo (theo thứ tự ưu tiên):**

1. **Fix BUG-03** (1 dòng code, `catalog-service/src/models/Product.js`) → unblock 10 failing tests → sau đó de-mock B-01/B-02 (catalog custom mock)
2. **Fix BUG-08** (security: 3 endpoints update không có auth, `Backend/userController.js`) → unblock FT-09, FT-10
3. **Fix BUG-09** (critical: `reviewController.js` — GET query sai field + ownership check hỏng) → unblock RV-11, RV-13
4. **Fix BUG-11, BUG-12** (`revenueController.js` — thêm `.catch()` + `checkAdmin`) → unblock RE-03, RE-04
5. **Fix BUG-05, BUG-06, BUG-07** (error handling 500 thay vì 400) → unblock các TC-*
6. **Tăng checkout-service coverage** — thêm test cho `cartService`, `voucherService`, `orderService` các flow phức tạp

---

## 7. Coverage chi tiết

| Service | Statements | Branches | Functions | Lines |
|---------|-----------|----------|-----------|-------|
| Backend | 81.51% (644/790) | 71.15% (148/208) | 74.5% (76/102) | 81.41% (635/780) |
| identity-service | 68.24% (346/507) | 42.17% (124/294) | 69.33% (52/75) | 68.07% (339/498) |
| catalog-service | 67.93% (447/658) | 46.52% (194/417) | 62.22% (56/90) | 68.22% (438/642) |
| checkout-service | 47.68% (555/1164) | 27.10% (216/797) | 43.67% (76/174) | 47.92% (543/1133) |
| notification-service | 58.94% (178/302) | 32.04% (58/181) | 56.60% (30/53) | 58.64% (173/295) |
| support-service | 76.61% (285/372) | 55.55% (155/279) | 70.49% (43/61) | 77.74% (276/355) |
| reporting-service | 81.26% (295/363) | 53.67% (95/177) | 79.16% (57/72) | 83.04% (284/342) |
| assistant-service | 49.67% (1059/2132) | 32.45% (655/2018) | 46.78% (131/280) | 51.28% (1015/1979) |
| media-service | 76.64% (151/197) | 53.60% (52/97) | 71.05% (27/38) | 76.96% (147/191) |
| api-gateway | 73.44% (213/290) | 57.93% (84/145) | 42.85% (36/84) | 72.59% (204/281) |
| apps/web | N/A (node:test) | N/A | N/A | N/A |

**Ghi chú:** apps/web dùng Node built-in `--test` runner, không hỗ trợ Jest coverage. Coverage catalog-service bị ảnh hưởng bởi BUG-03 làm 10 tests không chạy được.
