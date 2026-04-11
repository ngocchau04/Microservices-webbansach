# api-gateway

## Purpose
- Single backend entrypoint for frontend (`/api/*`).
- Routes requests to domain services by path prefix.

## Route map
- `/api/auth/*` -> `identity-service`
- `/api/catalog/*` -> `catalog-service`
- `/api/checkout/*` -> `checkout-service`
- `/api/media/*` -> `media-service`
- `/api/reporting/*` -> `reporting-service`
- `/api/support/*` -> `support-service`
- `/api/notify/*` -> `notification-service` (internal/debug)

## Run
```bash
npm install
npm run dev
```

## Health endpoint
- `GET /health`

## Env vars
- `PORT`
- `REQUEST_TIMEOUT_MS`
- `IDENTITY_SERVICE_URL`
- `CATALOG_SERVICE_URL`
- `CHECKOUT_SERVICE_URL`
- `MEDIA_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- `REPORTING_SERVICE_URL`
- `SUPPORT_SERVICE_URL`

## Internal dependencies
- All services listed above must be reachable by HTTP.
- Uses centralized request logging + not found + error middleware.
- No legacy monolith fallback is enabled in active runtime.
