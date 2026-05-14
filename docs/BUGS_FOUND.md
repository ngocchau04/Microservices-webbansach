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
