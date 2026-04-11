# reporting-service

## Purpose
Dashboard and analytics aggregation for admin.

## Routes
- `GET /dashboard/summary`
- `GET /dashboard/revenue`
- `GET /dashboard/top-products`
- `GET /dashboard/order-status`

## Run
```bash
npm install
npm run dev
```

## Health endpoint
- `GET /health`

## Env vars
- `PORT`
- `MONGO_URI`
- `REPORTING_DB_NAME`
- `JWT_SECRET`
- `CHECKOUT_SERVICE_URL`
- `CHECKOUT_REQUEST_TIMEOUT_MS`
- `IDENTITY_SERVICE_URL`
- `IDENTITY_REQUEST_TIMEOUT_MS`
- `INTERNAL_SERVICE_USER_ID`
- `DASHBOARD_CACHE_TTL_SECONDS`

## Internal dependencies
- MongoDB (`book_reporting` logical DB)
- `checkout-service` and `identity-service` data APIs
