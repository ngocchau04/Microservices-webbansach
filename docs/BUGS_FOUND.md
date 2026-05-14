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
