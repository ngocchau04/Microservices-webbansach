# checkout-service

## Purpose
Cart, voucher, order lifecycle, payment orchestration (COD + mock online payment).

## Routes
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:itemId`
- `DELETE /cart/items/:itemId`
- `DELETE /cart`
- `POST /vouchers/validate`
- `POST /vouchers/apply`
- `GET /vouchers/available`
- `POST /orders`
- `GET /orders/me`
- `GET /orders/:id`
- `PATCH /orders/:id/cancel`
- `GET /admin/orders`
- `PATCH /admin/orders/:id/status`
- `POST /payments/create`
- `POST /payments/webhook`
- `GET /payments/:id`

## Run
```bash
npm install
npm run dev
npm run seed
```

## Health endpoint
- `GET /health`

## Env vars
- `PORT`
- `MONGO_URI`
- `CHECKOUT_DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CATALOG_SERVICE_URL`
- `CATALOG_REQUEST_TIMEOUT_MS`
- `NOTIFICATION_SERVICE_URL`
- `NOTIFICATION_REQUEST_TIMEOUT_MS`
- `MOCK_PAYMENT_PROVIDER`
- `PAYMENT_WEBHOOK_SECRET`
- `MOMO_DEMO_MODE`

## MoMo demo mode
- Set `MOMO_DEMO_MODE=true` to keep the MoMo option in the UI but complete payment through the internal demo-success flow instead of the external MoMo QR page.

## Internal dependencies
- MongoDB (`book_checkout` logical DB)
- `catalog-service` for stock/product snapshot validation
- `notification-service` for order emails

## Order status enum
- `pending`
- `confirmed`
- `shipping`
- `completed`
- `returned`
- `cancelled`
