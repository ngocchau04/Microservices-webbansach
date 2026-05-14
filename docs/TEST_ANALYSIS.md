# Báo cáo Phân tích Test — Microservices-webbansach

> Được tạo ngày: 2026-05-14  
> Phạm vi: Toàn bộ project (Backend/, services/*, apps/*)  
> Trạng thái: Chỉ đọc — không sửa bất kỳ file code hay test nào

---

## Phần 1: Tổng quan

Dự án có **57 file test thực sự** (bỏ qua node_modules), phân bổ trên toàn bộ monorepo. Cụ thể:

| Vị trí | Số file test | Ghi chú |
|---|---|---|
| Backend/ (legacy monolith) | 8 | 2 file rỗng |
| apps/api-gateway/ | 1 | Smoke test |
| apps/web/src/ | 3 | Dùng Node built-in test runner |
| services/identity-service/ | 5 | 2 unit + 1 smoke + 2 integration |
| services/catalog-service/ | 4 | 1 unit + 1 review + 1 smoke + 1 integration |
| services/checkout-service/ | 9 | 4 unit + 1 smoke + 4 integration |
| services/notification-service/ | 3 | 1 unit + 1 smoke + 1 integration |
| services/support-service/ | 4 | 2 unit + 1 smoke + 1 integration |
| services/reporting-service/ | 4 | 2 unit + 1 smoke + 1 integration |
| services/assistant-service/ | 13 | 6 unit + 3 integration + 1 smoke + 2 real/other |
| services/media-service/ | 2 | 1 unit + 1 smoke |

Ước tính **hơn 220 test case** trải đều trên toàn hệ thống.

---

## Phần 2: Từng service — hiện trạng test

### Backend (legacy monolith)

Backend là monolith Node/Express cũ, gồm 9 controller. Có 6 file test chứa nội dung thực:

#### `Backend/test/authorizationService.unit.test.js` — ~27 test case
- **Loại:** Unit + Integration
- **Test gì:** Middleware `checkLogin` và `checkAdmin` trong `verityService.js`
- **Test cases:**
  - `checkLogin`: token hợp lệ user/admin, không có token (401), sai format Bearer (401), thiếu token sau Bearer (401), token là "undefined"/"null" (401), token malformed (401), token expired (401), sai secret (401), server error nội bộ (500)
  - `checkAdmin`: admin hợp lệ (pass), user bị từ chối (403), thiếu role (403), role rỗng (403), role không hợp lệ (403), không có token (401), token invalid (401), token expired (401)
  - Integration flows: admin access workflow, user access workflow, user cố truy cập admin endpoint, consecutive middleware calls, token refresh scenario, validate nhiều role khác nhau
  - Edge cases: malicious payloads (XSS, null, undefined, long userId), header với extra spaces, case-sensitive Bearer

#### `Backend/test/cartController.unit.test.js` — ~26 test case
- **Loại:** Unit + Integration (MongoDB in-memory)
- **Test gì:** 4 endpoint giỏ hàng trong `userController.js`
- **Test cases:**
  - `POST /user/cart`: thêm sản phẩm mới vào giỏ trống, cập nhật quantity khi đã có, thêm nhiều sản phẩm khác nhau, 401 (no token), 401 (invalid token), 404 (user không tồn tại), 500 (DB error)
  - `GET /user/cart`: trả về cart với populated products, giỏ trống, 401, 404, 500
  - `DELETE /user/cart`: xóa 1 sản phẩm cụ thể, xóa sản phẩm cuối cùng, xóa sản phẩm không tồn tại (graceful), 401, 500
  - `DELETE /user/cart/list`: xóa nhiều sản phẩm, xóa tất cả, partial match, 404, 401, 500
  - Cart Integration: full flow add→get→update→remove, multiple users với separate carts, bulk remove 3/6 sản phẩm

#### `Backend/test/failureTests.unit.test.js` — **RỖNG** (file chỉ có 1 dòng trắng)

#### `Backend/test/integration.only.test.js` — 1 test case
- **Loại:** Integration (MongoDB in-memory)
- **Test cases:**
  - Login → Tạo sản phẩm (admin) → Thêm vào giỏ → Xem giỏ hàng (end-to-end)

#### `Backend/test/orderController.unit.test.js` — ~11 test case
- **Loại:** Unit (MongoDB in-memory)
- **Test gì:** `orderController.js`
- **Test cases:**
  - `POST /order`: tạo đơn hàng thành công, từ chối userId mismatch (403)
  - `GET /order/user`: trả về đơn của user
  - `GET /order`: admin lấy tất cả (200), non-admin bị từ chối (403)
  - `POST /order/:id`: cập nhật khi status pending (200), từ chối khi status completed (403)
  - `PUT /order/:id/status`: admin cập nhật status (200), non-admin bị từ chối (403)
  - `DELETE /order/:id`: admin hủy đơn (status→'cancel'), non-admin bị từ chối (403)

#### `Backend/test/searchController.unit.test.js` — ~19 test case
- **Loại:** Unit (MongoDB in-memory)
- **Test gì:** `searchController.js`
- **Test cases:**
  - `GET /`: trả về tất cả sản phẩm, mảng trống khi không có data, DB error (500)
  - `GET /top24`: trả về tối đa 24 sản phẩm từ 30
  - `GET /top10`: sắp xếp theo soldCount giảm dần, chỉ trả về sản phẩm có soldCount
  - `GET /sale10`: sắp xếp theo discount giảm dần, chỉ sản phẩm có discount
  - `POST /filter`: lọc theo type, lọc theo title (case-insensitive), lọc theo author, lọc theo price range, sort by price/rating/discount, pagination, kết hợp nhiều filter, không có kết quả, DB error
  - `GET /topAuthors`: trả về top 5 tác giả với book count và titles, sắp xếp theo count, DB error

#### `Backend/test/userProfile.unit.test.js` — **RỖNG** (file chỉ có 1 dòng trắng)

#### `Backend/test/smoke/gateway.smoke.test.js` — 3 test case
- **Loại:** Smoke (legacy gateway)
- **Test cases:**
  - `GET /health` trả về standardized success payload
  - `GET /search/top24` được proxied đến legacy service
  - `POST /echo` forward JSON body và Authorization header

---

### apps/api-gateway (microservice gateway mới)

#### `apps/api-gateway/test/gateway.smoke.test.js` — ~15 test case
- **Loại:** Smoke (proxyService mocked)
- **Test cases:**
  - `GET /health` trả về ok với upstreams list
  - `GET /ready` trả về edge-proxy payload
  - Route rewrites: `/api/auth/login` → identity `/login`, `/api/catalog/products` → catalog `/products`, `/api/checkout/orders` → checkout `/orders`, `/api/assistant/chat` → assistant `/chat`, `/api/assistant/suggestions` → assistant `/suggestions`, `/api/assistant/ready`, `/api/assistant/reindex` (validate tenant header), `/api/reporting/dashboard/summary` → reporting, `/api/catalog/ready` → catalog
  - **Bảo mật tenant:** JWT claim gắn đúng tenantId, từ chối spoofed tenant header (JWT tenant ≠ header tenant → 403), từ chối anonymous non-public tenant (403), từ chối reindex không có tenant header (400)
  - Route không tồn tại: `/api/unknown/feature` → 404 `GATEWAY_ROUTE_UNMAPPED`, unmapped auth path → 404 `GATEWAY_ROUTE_UNMAPPED`, non-api route → 404 `GATEWAY_ROUTE_NOT_FOUND`

---

### identity-service

#### `services/identity-service/test/authService.unit.test.js` — 6 test case (real DB)
- **Loại:** Unit (real MongoDB)
- **Test cases:**
  - `register` tạo user thực và normalize email (uppercase→lowercase)
  - `register` từ chối duplicate email với code `AUTH_EMAIL_EXISTS`
  - `login` trả về JWT thực có thể verify bởi tokenService
  - `refreshToken` tạo token mới hợp lệ cho user thực
  - Favorite flow: getFavorites → addFavorite → removeFavorite trên document thực
  - `updateUserStatus` deactivate user thực → login sau đó bị chặn (403, `AUTH_USER_INACTIVE`)

#### `services/identity-service/test/authService.admin.unit.test.js` — 3 test case (real DB)
- **Loại:** Unit admin (real MongoDB)
- **Test cases:**
  - `listUsers`/`countUsers` loại trừ admin accounts khỏi customer management
  - `updateUserByAdmin` cập nhật user thường, từ chối sửa admin (`AUTH_FORBIDDEN`)
  - `deleteUserByAdmin` xóa user thường, từ chối xóa admin (`AUTH_FORBIDDEN`)

#### `services/identity-service/test/identity.smoke.test.js` — 2 test case (mocked model)
- **Loại:** Smoke (in-memory mock)
- **Test cases:**
  - register → login → refresh → me (full flow)
  - Admin list users và update user status

#### `services/identity-service/test/functional.identity.integration.test.js` — 2 test case (real DB + HTTP)
- **Loại:** Integration
- **Test cases:**
  - register→login→refresh-token→me qua HTTP thực
  - Favorite endpoints: add → list → remove qua HTTP thực

#### `services/identity-service/test/functional.identity.admin.integration.test.js` — 1 test case (real DB + HTTP)
- **Loại:** Integration
- **Test cases:**
  - Admin: list customers, count customers, update status, update profile, delete user (toàn bộ trong 1 test)

**Chưa có test cho:** `changePassword`, `updateProfile` (tự cập nhật), `forgotPassword`/`resetPassword`, cart endpoints trong identity, `logout`/blacklist token.

---

### catalog-service

#### `services/catalog-service/test/productService.unit.test.js` — 7 test case (real DB)
- **Loại:** Unit (real MongoDB)
- **Test cases:**
  - `createProduct` lưu document và normalize numeric fields (string→number)
  - `getProductById` trả về lean query không crash toObject
  - `listProducts` lọc theo tenant và loại trừ hidden products mặc định
  - `listProducts` includeHidden + sort by price ascending
  - `updateProduct` persist thay đổi vào DB thực
  - `deleteProduct` xóa document thực
  - `listProductsByIds` chỉ trả về IDs được yêu cầu
  - `listSimilarProducts` trả về visible products cùng type

#### `services/catalog-service/test/reviewService.eligibility.test.js` — 2 test case (mocked)
- **Loại:** Unit (mocked models)
- **Test cases:**
  - Người chưa mua không thể tạo review (`NOT_PURCHASED`)
  - Người mua hợp lệ tạo được review, review xuất hiện trong list, `completeOrderAfterReview` được gọi

#### `services/catalog-service/test/catalog.smoke.test.js` — 5 test case (mocked model)
- **Loại:** Smoke (in-memory mock)
- **Test cases:**
  - Load product list, detail và search
  - Từ chối tenant header mismatch với JWT claim (403)
  - Internal API key cho reindex theo tenant
  - Sai internal API key bị từ chối (401)
  - Review flow qua HTTP
  - Admin CRUD product (create → update → delete)

#### `services/catalog-service/test/functional.catalog.integration.test.js` — 2 test case (real DB + HTTP)
- **Loại:** Integration
- **Test cases:**
  - Admin CRUD qua HTTP thực: create → read → update → delete → 404
  - List và search trả về đúng sản phẩm, loại trừ hidden

**Chưa có test cho:** `searchService` unit, `tenantContextService`, endpoint `/products/by-ids`, `/products/authors`, stock deduction khi checkout, `debugProductCleanup.test.js` (utility script).

---

### checkout-service

#### `services/checkout-service/test/orderService.voucher.test.js` — 4 test case (mocked)
- **Loại:** Unit
- **Test cases:**
  - Cho phép order khi không có voucher code
  - Áp dụng discount khi voucher resolve thành công
  - Từ chối voucher code không tìm thấy (`CHECKOUT_VOUCHER_NOT_FOUND`)
  - Từ chối voucher expired/exhausted (`CHECKOUT_VOUCHER_INACTIVE`)

#### `services/checkout-service/test/orderService.postDelivery.test.js` — 6 test case (mocked)
- **Loại:** Unit (business rules)
- **Test cases:**
  - Người chưa mua không thể review (`NOT_PURCHASED`)
  - Người mua chưa xác nhận nhận hàng không review (`RECEIPT_NOT_CONFIRMED`)
  - Người mua được review trong 14 ngày sau received
  - Hết hạn review sau 14 ngày (`REVIEW_WINDOW_EXPIRED`)
  - Hết hạn hoàn hàng sau 7 ngày từ received (`CHECKOUT_RETURN_WINDOW_EXPIRED`)
  - Order status completed là read-only với admin (`CHECKOUT_INVALID_ORDER_TRANSITION`)

#### `services/checkout-service/test/checkout.smoke.test.js` — 4 test case (mocked services)
- **Loại:** Smoke
- **Test cases:**
  - `GET /health` trả về ok
  - Cart flow: add item → update qty → remove item
  - Voucher + checkout flow: validate → apply → create order → list my orders
  - Admin order management: list → update status

#### `services/checkout-service/test/momoService.test.js` — 5 test case
- **Loại:** Unit (pure functions)
- **Test cases:**
  - `buildMomoOrderId` tạo ID dạng `MOMO-orderId-txnId`
  - `buildMomoRequestId` chứa transaction ID
  - `decodeExtraData` parse JSON base64
  - `decodeExtraData` hỗ trợ plain payment ID
  - `verifyCallback` chấp nhận chữ ký HMAC-SHA256 hợp lệ
  - `isSuccessResponse` chấp nhận errorCode=0 hoặc resultCode=0

#### `services/checkout-service/test/vnpayService.test.js` — 3 test case
- **Loại:** Unit (pure functions)
- **Test cases:**
  - `createPaymentUrl` trả về signed VNPay URL
  - `verifyCallback` chấp nhận params được signed bởi createPaymentUrl
  - `isSuccessResponse` chỉ chấp nhận vnp_ResponseCode=00 và vnp_TransactionStatus=00

#### `services/checkout-service/test/catalogClient.stockFallback.test.js` — 1 test case
- **Loại:** Unit
- **Test cases:**
  - `fetchProductSnapshot`: stock=0 cho legacy product được treat là unspecified (stockSnapshot=999999)

#### `services/checkout-service/test/admin.order.unit.test.js` — 3 test case (real DB)
- **Loại:** Unit (real MongoDB)
- **Test cases:**
  - `listAdminOrders` trả về tất cả đơn hàng thực
  - `updateAdminOrderStatus` di chuyển order qua valid transition (pending→confirmed)
  - `updateAdminOrderStatus` từ chối invalid transition (`CHECKOUT_INVALID_ORDER_TRANSITION`)

#### `services/checkout-service/test/functional.payment.unit.test.js` — 2 test case (mocked)
- **Loại:** Unit (payment logic)
- **Test cases:**
  - `createPayment` MoMo demo mode trả về checkoutUrl demo, không gọi MoMo API thực
  - `handleMomoDemoReturn` đánh dấu payment succeeded, order.paymentStatus='paid', trả về redirectUrl

#### `services/checkout-service/test/functional.payment.integration.test.js` — (real DB + HTTP)
- **Loại:** Integration
- **Test cases:**
  - POST /payments/create tạo pending MoMo payment và trả về demo checkout URL

#### `services/checkout-service/test/functional.admin.order.integration.test.js` — (real DB + HTTP)
- **Loại:** Integration
- **Test cases:**
  - Admin order management qua HTTP với real DB

**Chưa có test cho:** `cartService` unit tests riêng (chỉ qua smoke mock), `voucherService` CRUD (create/delete), VNPay callback/return HTTP flow, COD confirmation flow, return request processing, `notificationClient`.

---

### notification-service

#### `services/notification-service/test/notification.service.unit.test.js` — 2 test case
- **Loại:** Unit
- **Test cases:**
  - `sendVerificationEmail` trả về mocked delivery khi SMTP chưa cấu hình (allowMockEmail=true)
  - `sendVerificationEmail` deduplicate repeated idempotency key

#### `services/notification-service/test/notification.smoke.test.js` — 1 test case
- **Test cases:** `GET /health` trả về ok

#### `services/notification-service/test/functional.notification.integration.test.js` — 2 test case
- **Loại:** Integration (HTTP)
- **Test cases:**
  - POST `/send-verification-email` qua HTTP với idempotency (lần 2 trả về deduplicated)
  - POST `/send-support-email` validate required payload (400 khi thiếu field)

**Chưa có test cho:** `mailerService` (retry logic, SMTP error handling), `sendOrderEmail`, `sendOrderStatusEmail`, `sendSupportAckEmail`.

---

### support-service

#### `services/support-service/test/feedback.service.test.js` — 5 test case (mocked model)
- **Loại:** Unit (mocked)
- **Test cases:**
  - `createFeedback` tạo feedback item
  - `listMyFeedback` + `updateFeedbackStatus` (status→'in_progress')
  - `createOrOpenAssistantHandoff` tạo mới và reopen conversation
  - Assistant handoff stays tenant scoped (2 tenant tạo 2 conversation riêng)
  - `addConversationMessage` từ admin → handoffState chuyển sang 'human_active'

#### `services/support-service/test/feedback.service.unit.real.test.js` — 2 test case (real DB)
- **Loại:** Unit (real MongoDB)
- **Test cases:**
  - `createFeedback` lưu document thực với tenantId
  - `createOrOpenAssistantHandoff` tạo và reopen conversation tenant-scoped với real DB

#### `services/support-service/test/support.smoke.test.js` — 1 test case
- **Test cases:** `GET /health` trả về ok

#### `services/support-service/test/functional.support.integration.test.js` — (real DB + HTTP)
- **Loại:** Integration
- **Test cases:**
  - Feedback flow qua HTTP: submit → list → admin update status

**Chưa có test cho:** `notificationClient`, listing conversations/messages qua HTTP, admin ticket management (assign, bulk update), admin reply flow qua HTTP, conversation message history.

---

### reporting-service

#### `services/reporting-service/test/dashboard.service.test.js` — 3 test case (mocked)
- **Loại:** Unit (mocked internalServiceClient)
- **Test cases:**
  - `getDashboardSummary` trả về totalOrders, totalRevenue, customerAccountCount, topProducts
  - `getDashboardRevenue` trả về grouped points theo period
  - `getDashboardTopProducts` (sort by quantity) và `getDashboardOrderStatus`

#### `services/reporting-service/test/reporting.smoke.test.js` — 1 test case
- **Test cases:** `GET /health` trả về ok

#### `services/reporting-service/test/reporting.service.real.unit.test.js` — (real DB)
- **Loại:** Unit real (không đọc chi tiết)

#### `services/reporting-service/test/functional.reporting.integration.test.js` — (real DB + mock upstream)
- **Loại:** Integration (upstream servers được mock bằng http.createServer)
- **Test cases:** Dashboard summary, revenue, top products qua HTTP với admin/user token

**Chưa có test cho:** `internalServiceClient` direct unit tests, ReportCache TTL/invalidation logic, dashboard với edge case (không có order), date range filtering.

---

### assistant-service

#### `services/assistant-service/test/ranking.test.js` — 2 test case
- **Test cases:**
  - `rankCatalogHybrid` sắp xếp theo lexical + graph signals + popularity
  - `mergeByRefId` giữ nguyên thứ tự occurrence đầu tiên

#### `services/assistant-service/test/query.understanding.test.js` — 3 test case
- **Test cases:**
  - Normalize và expand casual frontend beginner query
  - Map ship/refund aliases → policy concepts
  - Capture backend + beginner intent từ natural sentence

#### `services/assistant-service/test/assistant.intents.test.js` — 10 test case
- **Test cases:**
  - detectIntent: same_author, same_category, explain, cheaper, related_next, recommend (beginner query), cheaper (casual paraphrase)
  - detectPolicyIntent: shipping (từ "ship"), returns (từ "đổi")
  - detectHumanSupportIntent: explicit human support request

#### `services/assistant-service/test/chat.handoff.test.js` — 2 test case (mocked)
- **Test cases:**
  - Trả về handoff payload khi detect explicit human support intent
  - Yêu cầu đăng nhập trước handoff nếu userId thiếu

#### `services/assistant-service/test/support.handoff.tenant.test.js` — 1 test case
- **Test cases:**
  - `createOrOpenSupportHandoff` gửi tenantId trong payload và header `x-tenant-id`

#### `services/assistant-service/test/tenant.isolation.test.js` — 3 test case (real DB)
- **Test cases:**
  - `retrieve` chỉ trả về documents trong tenant scope
  - Graph traversal ở trong tenant scope (không leak sang tenant khác)
  - Tenant-scoped reindex không xóa corpus của tenant khác

#### `services/assistant-service/test/adminCopilot.service.test.js` — 8 test case
- **Test cases:**
  - `isAdminCopilotContext` nhận biết đúng flags
  - `classifyFocus` ưu tiên stock khi đề cập inventory
  - `classifyFocus` ưu tiên support khi shipping/payment chiếm ưu thế
  - Stock-focused result có warnings và directions về tồn kho
  - Support-focused result nhấn mạnh order verification
  - Active conversation text được ưu tiên trong summary
  - Follow-up ngắn giữ stock focus khi memory là stock
  - Topic switch rõ ràng từ stock → support khi new question mạnh

#### `services/assistant-service/test/chatbot.intent.unit.test.js` — 3 test case
- **Test cases:**
  - `detectIntentDetailed` ưu tiên cheaper khi có product context
  - `detectIntentDetailed` nhận biết greeting là general intent
  - `defaultFollowUpChips` và `faqTopicChips` expose clean user-facing options

#### `services/assistant-service/test/chatbot.chat.integration.test.js` — (real DB + HTTP)
- **Loại:** Integration

#### `services/assistant-service/test/chatbot.handoff.integration.test.js` — (real DB + HTTP cross-service)
- **Loại:** Integration (assistant + support service cùng lúc)

#### `services/assistant-service/test/chatbot.admin.integration.test.js` — (real DB + HTTP)
- **Loại:** Integration (admin copilot)

**Chưa có test cho:** `geminiService` (external API — expected), `imageChatService`, `liveCatalogFallbackService`, `graphIndexService`, `graphTraversalService` độc lập, `adminCopilotRerank` trực tiếp.

---

### media-service

#### `services/media-service/test/media.service.unit.test.js` — 2 test case
- **Test cases:**
  - `uploadImage` từ chối khi không có file (`MEDIA_FILE_REQUIRED`)
  - `deleteImage` từ chối khi thiếu publicId (`MEDIA_PUBLIC_ID_REQUIRED`)

#### `services/media-service/test/media.smoke.test.js` — 1 test case
- **Test cases:** `GET /health` trả về ok

**Chưa có test cho:** upload thực với Cloudinary mock, delete với Cloudinary mock, functional integration test qua HTTP (`POST /upload`, `DELETE /images/:id`), xử lý file size quá lớn, loại file không hỗ trợ.

---

### apps/web (Frontend)

> Dùng Node built-in test runner (`node:test`), không phải Jest.

#### `apps/web/src/pages/Order/voucherCheckoutState.test.js` — 6 test case
- **Test cases:**
  - `normalizeVoucherCode` uppercase và trim
  - Input rỗng không block checkout
  - Input có giá trị nhưng chưa apply → block
  - Input khớp với applied voucher → không block
  - Input thay đổi sau apply → block
  - `VOUCHER_INVALID_MESSAGE` khớp đúng string

#### `apps/web/src/pages/Admin/AdminSupport/copilotUtils.test.js` — 3 test case
- **Test cases:**
  - `buildAdminCopilotContextPayload` mang đúng compact conversation và ops fields
  - `parseAdminCopilotSections` parse 4 sections (Tóm tắt, Hướng xử lý, Câu trả lời gợi ý, Cảnh báo liên quan)
  - `parseAdminCopilotSections` fallback khi response không có cấu trúc

#### `apps/web/src/utils/productImage.test.js` — 2 test case
- **Test cases:**
  - `resolveProductImageSrc` trả về placeholder khi input trống/undefined
  - `resolveProductImageSrc` giữ nguyên non-empty URLs

**Chưa có test cho:** bất kỳ React component nào, pages, hooks, Redux/state management, API client calls.

---

## Phần 3: Tổng kết những gì còn thiếu và gợi ý ưu tiên

### Thiếu nghiêm trọng (ảnh hưởng trực tiếp đến nghiệp vụ cốt lõi)

1. **Backend `productController`** — không có test nào cho create/update/delete/get product trong legacy. Rủi ro cao vì đây là tính năng cốt lõi.
2. **Backend `voucherController`** — không có test nào cho CRUD voucher legacy.
3. **Backend `reviewController`** và **`feedbackController`** — không có test.
4. **Backend `revenueController`** — không có test cho báo cáo doanh thu.
5. **`Backend/test/userProfile.unit.test.js`** — file tồn tại nhưng rỗng hoàn toàn, cần viết test cho update profile, change password, favorites.
6. **checkout-service `cartService`** — toàn bộ logic giỏ hàng microservice (upsert, update qty, remove, clear) chỉ được test qua smoke mock, không có unit test thực.
7. **checkout-service `voucherService`** — CRUD voucher (create, delete, list, validate) không có unit test riêng.
8. **media-service** — chỉ có 2 unit test negative case, không có integration test upload/delete qua HTTP.

### Thiếu ở mức trung bình

9. **catalog-service `searchService`** — filter/sort logic không có unit test riêng.
10. **notification-service `mailerService`** — logic retry, SMTP error handling không được test.
11. **reporting-service cache logic** — TTL cache, cache invalidation không được test.
12. **support-service admin HTTP flow** — admin reply ticket, list conversations qua HTTP.
13. **assistant-service `imageChatService`** và **`liveCatalogFallbackService`** — chưa có test.
14. **Frontend React components** — toàn bộ UI pages, hooks, Redux chưa có test.

### Gợi ý thứ tự ưu tiên bổ sung

| Ưu tiên | Mục tiêu | Lý do |
|---|---|---|
| 1 | Backend productController + voucherController | Core business, rủi ro cao khi refactor |
| 2 | Backend userProfile (fill empty file) | File placeholder đã tồn tại, chỉ cần điền vào |
| 3 | checkout-service cartService unit tests | Business-critical, hiện chỉ smoke |
| 4 | media-service integration tests | Upload là feature user-facing quan trọng |
| 5 | catalog-service searchService unit | Search là tính năng dùng nhiều |
| 6 | Backend reviewController + feedbackController | Ảnh hưởng UX |
| 7 | checkout-service VNPay callback integration | Payment là critical path |
| 8 | Frontend React component tests | UI regression risks |

---

## Phần 4: Đề xuất test case cần viết thêm

### Nhóm Unit Tests

| Test Case ID | Unit Under Test | Test Description | Test Data | Expected Result |
|---|---|---|---|---|
| BACKEND-TC001 | productController — POST /product | Admin tạo sản phẩm mới hợp lệ | `{title, author, price, type:'V', imgSrc}` + admin token | 201, `body.data._id` tồn tại |
| BACKEND-TC002 | productController — POST /product | Non-admin bị từ chối tạo sản phẩm | user token | 403, `status: 'error'` |
| BACKEND-TC003 | productController — GET /product/:id | Lấy sản phẩm theo ID hợp lệ | ID sản phẩm tồn tại | 200, `body.data.title` khớp |
| BACKEND-TC004 | productController — GET /product/:id | Lấy sản phẩm với ID không tồn tại | ObjectId giả | 404 |
| BACKEND-TC005 | productController — PUT /product/:id | Admin cập nhật thông tin sản phẩm | `{title:'Updated'}` + admin token | 200, `data.title = 'Updated'` |
| BACKEND-TC006 | productController — DELETE /product/:id | Admin xóa sản phẩm | valid ID + admin token | 200, product không còn trong DB |
| BACKEND-TC007 | productController — DELETE /product/:id | Non-admin không được xóa | user token | 403 |
| BACKEND-TC008 | voucherController — POST /voucher | Admin tạo voucher mới | `{code:'SAVE20', type:'percent', value:20}` | 201, `body.data.code = 'SAVE20'` |
| BACKEND-TC009 | voucherController — GET /voucher | Lấy danh sách voucher | — | 200, array |
| BACKEND-TC010 | voucherController — DELETE /voucher/:id | Admin xóa voucher | valid ID + admin token | 200 |
| BACKEND-TC011 | voucherController — POST /voucher/apply | Áp dụng voucher hợp lệ vào đơn hàng | `{code:'SAVE20', total:500000}` | 200, discount > 0 |
| BACKEND-TC012 | voucherController — POST /voucher/apply | Từ chối voucher đã hết hạn | expired voucher code | 400, error message |
| BACKEND-TC013 | voucherController — POST /voucher/apply | Từ chối voucher không tồn tại | random code | 404 |
| BACKEND-TC014 | userController — PUT /user/profile | User cập nhật tên và số điện thoại | `{name:'New Name', sdt:'0912345678'}` + user token | 200, user.name updated |
| BACKEND-TC015 | userController — PUT /user/password | User đổi mật khẩu thành công | `{oldPassword, newPassword}` + user token | 200 |
| BACKEND-TC016 | userController — PUT /user/password | Từ chối khi mật khẩu cũ sai | `{oldPassword:'wrong', newPassword:'new'}` | 400/401 |
| BACKEND-TC017 | userController — POST /user/favorite | User thêm sản phẩm vào yêu thích | valid productId + user token | 200, favorite list có product |
| BACKEND-TC018 | userController — DELETE /user/favorite | User xóa sản phẩm khỏi yêu thích | valid productId + user token | 200, product không còn trong list |
| BACKEND-TC019 | reviewController — POST /review | User có đơn đã hoàn thành tạo review | valid userId, productId + rating + comment | 201 |
| BACKEND-TC020 | reviewController — POST /review | User chưa mua không được review | user không có đơn hoàn thành | 403/400 |
| BACKEND-TC021 | reviewController — GET /review/:productId | Lấy danh sách review của sản phẩm | valid productId | 200, array |
| BACKEND-TC022 | feedbackController — POST /feedback | User gửi feedback hỗ trợ | `{subject, message, category}` + user token | 201 |
| BACKEND-TC023 | feedbackController — GET /feedback | Admin xem danh sách feedback | admin token | 200, array |
| BACKEND-TC024 | revenueController — GET /revenue | Admin xem báo cáo doanh thu | admin token | 200, revenue data |
| BACKEND-TC025 | revenueController — GET /revenue | Non-admin bị từ chối | user token | 403 |
| CHECKOUT-TC001 | cartService — upsertCartItem | Thêm item mới vào giỏ trống | `{userId, productId, quantity:2}` | `ok:true`, cart.items.length = 1 |
| CHECKOUT-TC002 | cartService — upsertCartItem | Cập nhật quantity khi item đã tồn tại | item đã có + quantity mới | `ok:true`, quantity updated |
| CHECKOUT-TC003 | cartService — updateCartItem | Cập nhật quantity của cart item | `{userId, itemId, quantity:5}` | `ok:true`, item.quantity = 5 |
| CHECKOUT-TC004 | cartService — removeCartItem | Xóa một item khỏi giỏ hàng | valid userId + itemId | `ok:true`, item không còn trong cart |
| CHECKOUT-TC005 | cartService — clearCart | Xóa toàn bộ giỏ hàng | valid userId | `ok:true`, cart.items empty |
| CHECKOUT-TC006 | cartService — applyVoucherToCart | Áp dụng voucher vào cart | `{userId, code:'SALE10'}` | `ok:true`, voucher gắn vào cart |
| CHECKOUT-TC007 | voucherService — createVoucher | Tạo voucher fixed discount | `{code:'FIXED5K', type:'fixed', value:5000}` | `ok:true`, statusCode:201 |
| CHECKOUT-TC008 | voucherService — validateVoucher | Validate voucher hợp lệ | valid code + subtotal đủ | `ok:true, valid:true` |
| CHECKOUT-TC009 | voucherService — validateVoucher | Từ chối voucher expired | expired code | `ok:false, CHECKOUT_VOUCHER_INACTIVE` |
| CHECKOUT-TC010 | voucherService — validateVoucher | Từ chối voucher đã hết lượt dùng | maxUsage exceeded | `ok:false, CHECKOUT_VOUCHER_EXHAUSTED` |
| CHECKOUT-TC011 | voucherService — deleteVoucher | Admin xóa voucher | valid voucherId | `ok:true` |
| CHECKOUT-TC012 | voucherService — listAvailableVouchers | Liệt kê voucher còn hiệu lực | — | `ok:true`, chỉ active vouchers |
| CATALOG-TC001 | searchService — filterProducts | Lọc theo type và khoảng giá | `{type:'K', minPrice:100000, maxPrice:300000}` | Chỉ sản phẩm type K trong khoảng giá |
| CATALOG-TC002 | searchService — filterProducts | Sort by soldCount descending | `{sortBy:'soldCount', sortOrder:'desc'}` | soldCount giảm dần |
| CATALOG-TC003 | searchService — filterProducts | Pagination trả về đúng page | `{page:2, limit:5}` với 12 sản phẩm | 5 sản phẩm page 2, total:12 |
| CATALOG-TC004 | searchService — filterProducts | Tìm kiếm title case-insensitive | `{title:'javascript'}` | Khớp cả 'JavaScript', 'JAVASCRIPT' |
| MEDIA-TC001 | mediaService — uploadImage | Upload thành công với mock Cloudinary | valid file buffer | `ok:true`, data.url tồn tại |
| MEDIA-TC002 | mediaService — uploadImage | Từ chối file vượt quá kích thước | file > maxSize | `ok:false, MEDIA_FILE_TOO_LARGE` |
| MEDIA-TC003 | mediaService — uploadImage | Từ chối loại file không hỗ trợ | .exe file | `ok:false, MEDIA_INVALID_FILE_TYPE` |
| MEDIA-TC004 | mediaService — deleteImage | Xóa thành công với mock Cloudinary | valid publicId | `ok:true`, statusCode:200 |
| MEDIA-TC005 | mediaService — deleteImage | Từ chối khi publicId không tồn tại trong Cloudinary | non-existent publicId | `ok:false, MEDIA_NOT_FOUND` |
| NOTIFICATION-TC001 | notificationService — sendOrderEmail | Gửi email thông báo đơn hàng (mock SMTP) | order data + user email | `ok:true, mocked:true` |
| NOTIFICATION-TC002 | notificationService — sendOrderStatusEmail | Gửi email khi trạng thái đơn thay đổi (mock) | order status + user email | `ok:true` |
| NOTIFICATION-TC003 | notificationService — sendSupportAckEmail | Gửi email xác nhận ticket hỗ trợ (mock) | ticket data + user email | `ok:true` |
| NOTIFICATION-TC004 | mailerService | Retry logic khi SMTP fail lần đầu | emailRetryAttempts:2, SMTP fail 1 lần | Thành công ở lần retry |
| REPORTING-TC001 | reportingService — cache logic | Lần gọi thứ 2 trong TTL trả về cache | getDashboardSummary gọi 2 lần | Lần 2 từ cache, không gọi upstream |
| REPORTING-TC002 | reportingService — getDashboardSummary | Trả về correctly khi không có đơn nào | orders = [] | totalOrders:0, totalRevenue:0 |
| REPORTING-TC003 | reportingService — getDashboardRevenue | Lọc theo date range | `{period:'week', startDate, endDate}` | Chỉ data trong range |
| ASSISTANT-TC001 | imageChatService — analyzeProductImage | Phân tích hình ảnh (mock Gemini) | base64 image data | `ok:true`, description string |
| ASSISTANT-TC002 | liveCatalogFallbackService | Fallback khi corpus rỗng nhưng catalog có data | empty corpus + mock catalog | `ok:true`, sản phẩm từ catalog |
| ASSISTANT-TC003 | graphIndexService — buildIndex | Build graph index từ corpus documents | 3 catalog docs với relations | graph nodes và edges đúng |

### Nhóm Integration Tests

| Test Case ID | Unit Under Test | Test Description | Test Data | Expected Result |
|---|---|---|---|---|
| BACKEND-IT001 | productController qua HTTP | Admin CRUD: create→read→update→delete | full payload + admin token | 201→200→200→200, data nhất quán |
| BACKEND-IT002 | voucherController qua HTTP | Admin tạo voucher → user apply khi checkout | create + apply to order | Discount áp dụng đúng |
| BACKEND-IT003 | reviewController qua HTTP | User review sản phẩm sau khi có đơn hoàn thành | create order → complete → submit review | 201, review xuất hiện trong list |
| BACKEND-IT004 | userController — profile flow | Đăng nhập → cập nhật profile → xem profile mới | login + update + GET /me | Profile mới được phản ánh |
| BACKEND-IT005 | revenueController + orderController | Admin tạo order → complete → xem revenue | create → status=completed → GET /revenue | Revenue tăng đúng giá trị |
| CHECKOUT-IT001 | cartService + orderService | Full checkout: add cart → order → received → review | step-by-step với real DB | Sau received, eligible:true |
| CHECKOUT-IT002 | voucherService race condition | 2 user dùng voucher limited 1 lần đồng thời | 2 concurrent requests cùng voucher | Chỉ 1 user thành công, user kia: VOUCHER_EXHAUSTED |
| CHECKOUT-IT003 | paymentService — VNPay callback | VNPay return callback với chữ ký hợp lệ | valid VNPay return params + signature | payment='succeeded', order.paymentStatus='paid' |
| CHECKOUT-IT004 | paymentService — VNPay callback | Từ chối callback với chữ ký sai | tampered params | 400/403, payment status không đổi |
| CHECKOUT-IT005 | orderService — full order lifecycle | pending → confirmed → processing → delivered → received | admin transitions + user confirm received | Mỗi bước transition hợp lệ |
| CATALOG-IT001 | productService + reviewService | Review flow qua HTTP với real DB | create product → submit review | Review lưu được, rating product cập nhật |
| CATALOG-IT002 | searchService qua HTTP | Complex filter qua /search | `GET /search?type=K&minPrice=100000&sortBy=soldCount` | Kết quả đúng, pagination chính xác |
| CATALOG-IT003 | catalog tenant isolation qua HTTP | Tenant A không thấy product của Tenant B | 2 tenants với products riêng | GET /products chỉ trả về của đúng tenant |
| MEDIA-IT001 | media HTTP routes | Upload → nhận URL → xóa (mock Cloudinary) | POST /upload + DELETE /images/:id | 201→200, publicId nhất quán |
| MEDIA-IT002 | media HTTP routes — auth | Upload không có token bị từ chối | POST /upload không có Authorization | 401 |
| SUPPORT-IT001 | supportRoutes — admin management | Admin list tickets → assign → reply → close | admin token + feedback workflow | Trạng thái chuyển đúng |
| SUPPORT-IT002 | supportRoutes — conversation messages | Admin reply → user thấy message mới | addConversationMessage + getConversation | Message xuất hiện trong history |
| REPORTING-IT001 | reporting dashboard qua HTTP | Admin xem dashboard với mock upstream | GET /dashboard/summary + admin token | 200, data.totalOrders đúng |
| REPORTING-IT002 | reporting — non-admin bị từ chối | User không xem được dashboard | GET /dashboard/summary + user token | 403 |
| NOTIFICATION-IT001 | notification routes — idempotency | Same idempotencyKey gửi 2 lần qua HTTP | POST /send-order-email ×2 cùng key | Lần 2: deduplicated:true, cùng messageId |
| ASSISTANT-IT001 | chatService — full session | Chat 3 lượt: gợi ý → follow-up → handoff | 3 messages liên tiếp với real DB | Mỗi lượt có intent đúng, lượt 3 có handoff |
| ASSISTANT-IT002 | chatbot cross-service handoff | Chat → handoff → support service tạo ticket | assistant + support service cùng DB | Conversation được tạo trong support-service |
| ASSISTANT-IT003 | admin copilot qua HTTP | Admin chat với copilot context stock | POST /chat + admin token + copilot context | Response có 4 sections (Tóm tắt/Hướng xử lý/...) |

---

*Tổng cộng đề xuất thêm: **33 Unit Test** và **23 Integration Test** = 56 test case mới*
