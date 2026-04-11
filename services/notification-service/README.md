# notification-service

## Purpose
Centralized transactional email sending with basic idempotency/retry guard.

## Routes
- `POST /send-verification-email`
- `POST /send-order-email`
- `POST /send-order-status-email`
- `POST /send-support-email`

## Run
```bash
npm install
npm run dev
```

## Health endpoint
- `GET /health`

## Env vars
- `PORT`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SERVICE`
- `EMAIL_RETRY_ATTEMPTS`
- `EMAIL_RETRY_DELAY_MS`
- `IDEMPOTENCY_TTL_MS`
- `ALLOW_MOCK_EMAIL`

## Internal dependencies
- SMTP provider (or mock mode enabled)
- Called by identity/checkout/support services
