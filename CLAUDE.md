# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vietnamese book-selling website (`webbansach`) undergoing an active **strangler-fig migration** from a Node.js monolith to a microservices architecture. The migration is currently at **Phase 9** (Admin Flow Refactor complete). Phase 10 (hardening + full infra) is pending.

## Repository Layout

```
Backend/           Legacy monolith (Express + MongoDB, still live)
  gateway/         Phase-1 proxy gateway (thin, forwards all traffic to legacy)
  legacy/routes/   Consolidated route mounts for the monolith
  test/            Jest unit + integration tests for the monolith

apps/
  api-gateway/     New domain-aware gateway (port 8080, routes /api/* to services)
  web/             React + Vite frontend (migrated from FrontEnd/)

services/
  identity-service/     Auth + users (port 4001, DB: book_identity)
  catalog-service/      Products + search + reviews (port 4002, DB: book_catalog)
  checkout-service/     Cart + orders + payments (port 4003, DB: book_checkout)
  media-service/        Image upload via Cloudinary (port 4004)
  notification-service/ Transactional email (port 4005)
  reporting-service/    Admin dashboard analytics (port 4006, DB: book_reporting)
  support-service/      Feedback/support tickets (port 4007, DB: book_support)
  assistant-service/    AI chatbot via Gemini (port 4008, DB: book_assistant)
  image-search-service/ Python/FastAPI CLIP image search (port 4010)
```

## Commands

### Legacy monolith
```bash
cd Backend
npm start                          # legacy monolith on port 3001 (or LEGACY_SERVICE_PORT)
npm run start:migration-runtime    # monolith (3002) + Phase-1 gateway (3001) together
npm run start:gateway-legacy       # Phase-1 gateway only
npm test                           # all Jest tests (unit + integration), runs --runInBand
npm run test:smoke:gateway         # gateway smoke tests only
```

### New microservices (each service is independent)
```bash
cd services/<service-name>
npm run dev      # nodemon
npm run seed     # seed script (checkout, support services)
npm test         # Jest, runs --runInBand
```

### New API gateway
```bash
cd apps/api-gateway
npm run dev      # nodemon on port 8080
npm test
```

### Frontend
```bash
cd apps/web
npm run dev      # Vite dev server
npm run build    # production build
npm run lint     # ESLint
npm test         # Node test runner (voucher + productImage unit tests)
```

### Image search service (Python)
```bash
cd services/image-search-service
python -m venv .venv
.venv\Scripts\activate             # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 4010
```

## Architecture: Two Parallel Runtimes

**Runtime A — Migration shim** (used while strangling the monolith):
- `Backend/start.js` starts both the legacy monolith (3002) and the Phase-1 proxy gateway (3001)
- Phase-1 gateway (`Backend/gateway/`) simply proxies everything to the monolith; it has no routing intelligence

**Runtime B — Target microservices** (the end state):
- `apps/api-gateway` (port 8080) routes `/api/<domain>/*` to the matching service
- Route map: `/api/auth` → identity, `/api/catalog` → catalog, `/api/checkout` → checkout, `/api/media` → media, `/api/reporting` → reporting, `/api/support` → support, `/api/notify` → notification
- Each `services/*` runs independently with its own MongoDB logical database
- `assistant-service` (port 4008) is routed from the gateway and uses Gemini AI + a graph knowledge base

## Frontend API Layer

All frontend API calls route through `API_BASE_URL` (default `http://localhost:8080`). Domain modules in `apps/web/src/api/` wrap axios calls — never call axios/fetch directly from page components. JWT token is stored in `localStorage` under key `"token"` and injected globally via an axios interceptor in `main.jsx`.

## Environment Variables

### Legacy monolith (`Backend/.env`)
- `MONGO_URI`, `SECRET_KEY`, `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`, `EMAIL_USER`, `EMAIL_PASSWORD`
- `GATEWAY_PORT` (default 3001), `LEGACY_SERVICE_PORT` (default 3002)
- `GATEWAY_PROXY_TIMEOUT_MS` (default 15000)

### New services (each has its own `.env.example`)
- Each service reads `JWT_SECRET` (not `SECRET_KEY`)
- `IDENTITY_SERVICE_URL`, `CATALOG_SERVICE_URL`, etc. on the gateway
- `GEMINI_API_KEY` for assistant-service
- `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` for media-service

### Frontend (`apps/web/.env`)
- `VITE_API_BASE_URL` (defaults to `http://localhost:8080`)

## Data Model Notes

- **Product.type** enum (legacy + catalog): `V`=Văn học, `K`=Kinh tế, `G`=Giáo dục, `T`=Thiếu nhi, `A`=Kỹ năng sống, `N`=Nuôi dạy con, `C`=Chính trị, `I`=Điện ảnh/Âm nhạc, `Y`=Y học, `D`=Du lịch
- **User.role**: `"user"` | `"admin"`
- Passwords in the legacy monolith are stored and compared **in plaintext** — this is known technical debt, not a bug to silently fix
- Order status enum (checkout-service): `pending` → `confirmed` → `shipping` → `completed` | `returned` | `cancelled`

## Testing Approach

- Legacy tests use `mongodb-memory-server` for DB isolation (no real MongoDB needed)
- Unit tests mock at the controller level; `integration.only.test.js` builds a real Express app with MongoMemoryServer
- Gateway smoke tests (`test/smoke/gateway.smoke.test.js`) spin up a fake legacy server on a random port
- All Jest tests must run with `--runInBand` (sequential) due to shared MongoMemoryServer

## Migration Constraints (MIGRATION_TODO.md)

- `/api/auth/favorites` and `/api/auth/users/:id/orders` still proxy to the legacy monolith
- Legacy-compatible route aliases exist in identity-service and catalog-service — do not remove them
- Forgot-password email is temporarily handled by identity-service (not notification-service)
- Admin pages (`apps/web/src/pages/Admin/*`) must not contain direct axios/fetch calls — use domain API modules
