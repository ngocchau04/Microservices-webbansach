# support-service

## Purpose
Feedback/support ticket APIs, foundation for future live chat.

## Routes
- `POST /feedback`
- `GET /feedback/me`
- `GET /admin/feedback`
- `PATCH /admin/feedback/:id/status`

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
- `SUPPORT_DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `NOTIFICATION_SERVICE_URL`
- `NOTIFICATION_REQUEST_TIMEOUT_MS`
- `NOTIFICATION_REQUIRED`

## Internal dependencies
- MongoDB (`book_support` logical DB)
- `notification-service` for support acknowledgement email
