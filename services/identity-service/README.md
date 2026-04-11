# identity-service

## Purpose
Authentication and user domain.

## Routes
- `POST /register`
- `POST /login`
- `POST /refresh-token`
- `POST /verify-account`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /google-login`
- `GET /me`
- `PUT /me`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id/status`

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
- `IDENTITY_DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GOOGLE_CLIENT_ID`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`
- `NOTIFICATION_SERVICE_URL`
- `NOTIFICATION_REQUEST_TIMEOUT_MS`
- `NOTIFICATION_REQUIRED`

## Internal dependencies
- MongoDB (`book_identity` logical DB)
- `notification-service` for verification/transactional emails
