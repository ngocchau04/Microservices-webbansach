# Bookstore Microservices

Đồ án xây dựng hệ thống bán sách theo kiến trúc microservices.

## Cấu trúc đồ án

```text
Microservices-webbansach/
|- apps/
|  |- web/                 # Frontend
|  \- api-gateway/         # Cổng backend chính
|- services/
|  |- identity-service/    # Đăng nhập, đăng ký, người dùng
|  |- catalog-service/     # Sản phẩm, tìm kiếm, đánh giá
|  |- checkout-service/    # Giỏ hàng, voucher, đơn hàng, thanh toán
|  |- media-service/       # Upload/xóa ảnh
|  |- notification-service/# Gửi email/thông báo
|  |- reporting-service/   # Thống kê, báo cáo
|  |- support-service/     # Hỗ trợ, phản hồi
|  \- assistant-service/   # Chatbot hỗ trợ
|- packages/               # Phần dùng chung
|- docs/                   # Tài liệu bổ sung
|- docker-compose.micro.yml
\- package.json
```

## Cách chạy

### Run With Docker Compose

```bash
npm run compose:up
```

`docker-compose.micro.yml` is the primary and only supported runtime stack.  
`docker-compose.yml` and `docker-compose.dev.yml` are legacy-disabled wrappers that print migration guidance.

Stop stack:

```bash
npm run compose:down
```

Follow logs:

```bash
npm run compose:logs
```

Test gateway first:

- `http://localhost:8080/health`

If OK then backend entrypoint on. README ghi gateway là backend entrypoint chính của stack.

Then open website:

- `http://localhost:5173`

Nếu web lên nhưng API lỗi, thường là một trong các service phía sau chưa lên đủ.

## Login

- `admin@bookstore.local / Admin@123`
- `user@bookstore.local / User@123`

## Các lệnh test

### Chạy nhanh theo service

```bash
npm run test:gateway
npm run test:identity
npm run test:catalog
npm run test:checkout
npm run test:media
npm run test:notify
npm run test:reporting
npm run test:support
npm run test:assistant
```

### Unit test

```bash
npx jest services/identity-service/test/authService.unit.real.test.js
npx jest services/identity-service/test/authService.admin.unit.test.js

npx jest services/catalog-service/test/productService.unit.test.js
npx jest services/catalog-service/test/reviewService.eligibility.test.js

npx jest services/checkout-service/test/admin.order.unit.test.js
npx jest services/checkout-service/test/functional.payment.unit.test.js
npx jest services/checkout-service/test/orderService.postDelivery.test.js
npx jest services/checkout-service/test/orderService.voucher.test.js
npx jest services/checkout-service/test/momoService.test.js
npx jest services/checkout-service/test/vnpayService.test.js
npx jest services/checkout-service/test/catalogClient.stockFallback.test.js

npx jest services/media-service/test/media.service.unit.test.js
npx jest services/notification-service/test/notification.service.unit.test.js
npx jest services/reporting-service/test/reporting.service.real.unit.test.js
npx jest services/support-service/test/feedback.service.unit.real.test.js
npx jest services/assistant-service/test/chatbot.intent.unit.test.js
```

### Integration test

Lưu ý: nên bật hệ thống bằng Docker trước khi chạy các test tích hợp cần service/database thật.

```bash
npx jest services/identity-service/test/functional.identity.integration.test.js
npx jest services/identity-service/test/functional.identity.admin.integration.test.js

npx jest services/catalog-service/test/functional.catalog.integration.test.js

npx jest services/checkout-service/test/functional.payment.integration.test.js
npx jest services/checkout-service/test/functional.admin.order.integration.test.js

npx jest services/media-service/test/functional.media.integration.test.js
npx jest services/notification-service/test/functional.notification.integration.test.js
npx jest services/reporting-service/test/functional.reporting.integration.test.js
npx jest services/support-service/test/functional.support.integration.test.js

npx jest services/assistant-service/test/chatbot.chat.integration.test.js
npx jest services/assistant-service/test/chatbot.admin.integration.test.js
npx jest services/assistant-service/test/chatbot.handoff.integration.test.js
```

### Smoke test

```bash
npx jest apps/api-gateway/test/gateway.smoke.test.js
npx jest services/identity-service/test/identity.smoke.test.js
npx jest services/catalog-service/test/catalog.smoke.test.js
npx jest services/checkout-service/test/checkout.smoke.test.js
npx jest services/media-service/test/media.smoke.test.js
npx jest services/notification-service/test/notification.smoke.test.js
npx jest services/reporting-service/test/reporting.smoke.test.js
npx jest services/support-service/test/support.smoke.test.js
npx jest services/assistant-service/test/assistant.smoke.test.js
```

### Assistant real e2e

```bash
npx jest services/assistant-service/test/assistant.real.e2e.js
```
