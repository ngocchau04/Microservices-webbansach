# Bookstore Microservices Monorepo

Production-like microservices refactor of the original bookstore monolith using a strangler migration strategy.

## Overview

This repository now runs as a microservices monorepo with one frontend entrypoint and one backend gateway entrypoint:
- Frontend: `apps/web`
- Backend entrypoint: `apps/api-gateway` (`http://localhost:8080`)
- Domain services: `identity`, `catalog`, `checkout`, `media`, `notification`, `reporting`, `support`

Frontend does not call service ports directly.

## Repository Structure

```text
repo-root/
|- apps/
|  |- web/
|  \- api-gateway/
|- services/
|  |- identity-service/
|  |- catalog-service/
|  |- checkout-service/
|  |- media-service/
|  |- notification-service/
|  |- reporting-service/
|  \- support-service/
|- packages/
|  |- shared-config/
|  |- shared-utils/
|  \- shared-middleware/
|- infra/
|  |- docker/
|  \- scripts/
|- docs/
|- docker-compose.micro.yml
\- package.json
```

## Service Boundaries

- `identity-service`: register/login/refresh/verify/google-login/profile/admin-users
- `catalog-service`: product listing/detail/search/filter/review/admin-product-crud
- `checkout-service`: cart/voucher/order/payment orchestration/admin-order-management
- `media-service`: image upload/delete + Cloudinary wrapper
- `notification-service`: verification/order/support emails
- `reporting-service`: dashboard summary/revenue/top products/order status analytics
- `support-service`: feedback/ticket management

## API Gateway Route Prefixes

- `/api/auth/*` -> identity
- `/api/catalog/*` -> catalog
- `/api/checkout/*` -> checkout
- `/api/media/*` -> media
- `/api/reporting/*` -> reporting
- `/api/support/*` -> support
- `/api/notify/*` -> notification (internal/debug)

## Ports

- `web`: `5173 -> 80`
- `api-gateway`: `8080 -> 8080`
- `identity-service`: `4001 -> 4001`
- `catalog-service`: `4002 -> 4002`
- `checkout-service`: `4003 -> 4003`
- `media-service`: `4004 -> 4004`
- `notification-service`: `4005 -> 4005`
- `reporting-service`: `4006 -> 4006`
- `support-service`: `4007 -> 4007`
- `mongo`: `27017 -> 27017`

## Database Separation

Single Mongo instance, logical DB per service:
- `book_identity`
- `book_catalog`
- `book_checkout`
- `book_reporting`
- `book_support`

## Environment Setup

Copy each `.env.example` to `.env` when running outside Docker:
- `apps/web/.env.example`
- `apps/api-gateway/.env.example`
- `services/*/.env.example`

Minimum required variables per service are documented in each service README.

## Run Locally Without Docker

1. Install dependencies per app/service:
```bash
npm install
npm --prefix apps/web install
npm --prefix apps/api-gateway install
npm --prefix services/identity-service install
npm --prefix services/catalog-service install
npm --prefix services/checkout-service install
npm --prefix services/media-service install
npm --prefix services/notification-service install
npm --prefix services/reporting-service install
npm --prefix services/support-service install
```

2. Start MongoDB locally (`mongodb://localhost:27017`).

3. Start services, gateway, web (different terminals):
```bash
npm run dev:identity
npm run dev:catalog
npm run dev:checkout
npm run dev:media
npm run dev:notify
npm run dev:reporting
npm run dev:support
npm run dev:gateway
npm run dev:web
```

## Run With Docker Compose

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

## Service Dependencies

- `api-gateway` depends on all domain services.
- `checkout-service` depends on `catalog-service` (stock/product snapshot) and `notification-service`.
- `reporting-service` depends on `checkout-service` and `identity-service`.
- `identity-service` and `support-service` can call `notification-service`.

## Core End-to-End Flow

1. Login/Register (`identity-service`)
2. Browse/Search product (`catalog-service`)
3. Add to cart + apply voucher + checkout (`checkout-service`)
4. Admin updates order status (`checkout-service`)
5. Dashboard reflects order data (`reporting-service`)

Detailed manual checklist: `docs/e2e-manual-checklist.md`

## Test Commands

```bash
npm run test:identity
npm run test:catalog
npm run test:checkout
npm run test:smoke
```

## Seed Commands

```bash
npm run seed:identity
npm run seed:catalog
npm run seed:checkout
npm run seed:support
npm run seed:all
```

Smoke coverage includes:
- auth flow (register/verify/login/refresh/me + admin users)
- catalog flow (list/detail/search/review/admin CRUD)
- checkout flow (cart/voucher/checkout/admin status update)

## Health Endpoints

- Gateway: `GET /health`
- Each service: `GET /health`

## Legacy Code Cleanup Policy

- `Backend/` and `FrontEnd/` are retained as legacy references during strangler migration.
- Active stack for handover is `apps/* + services/* + docker-compose.micro.yml`.
- New work should not add runtime dependencies from `apps/web` to legacy monolith ports.
- Active gateway routing is microservices-only and does not fallback to monolith runtime targets.

## Member:
- 3122411020: Đàm Thị Ngọc Châu (Leader)
- 3122411049: Lê Gia Hân
- 3122411141: Phan Thị Hồng Nhiên
- 3122411173: Võ Hoàng Kim Quyên
- 3122411243: Phan Thị Hải Vân