# Microservices Migration TODO

## Phase Assumption
- Current execution is locked to **Phase 9 - Admin Flow Refactor**.
- Strategy: strangler pattern, keep legacy backend alive while extracted domains are progressively routed through gateway.

## Completed In This Phase
- Refactored admin user flows to use `authApi` + `catalogApi` + `checkoutApi` instead of direct `axios/fetch`.
- Refactored admin product flows to use domain API modules without manual token/header injection.
- Added admin feedback management page and connected it to `supportApi` (support-service via gateway).
- Updated admin shell tab routing to include feedback management flow.
- Verified admin frontend compiles after refactor (`npm run build`).
- Confirmed no direct `axios/fetch/http` calls remain in `apps/web/src/pages/Admin/*`.

## Remaining TODO
- Phase 10: hardening, full infra, docs, and smoke/E2E pipeline.

## Temporary Assumptions Kept For Safety
- `/api/auth/favorites` and `/api/auth/users/:id/orders` stay proxied to legacy monolith until checkout/supporting domains are extracted.
- Legacy-compatible auth aliases are kept in identity-service (`/check-email`, `/resend-verification`, `/forgot-password`, `/profile/:field`, `/users/count`) to reduce immediate frontend churn.
- Legacy-compatible catalog aliases are kept in catalog-service (`/products/list`, `/products/similar/:type`, `/search/top24`, `/search/top10`, `/search/sale10`, `/search/topAuthors`, `/feedback/*`) to avoid breaking non-phase flows.
- Review create route accepts anonymous submissions in this phase because current active frontend flow did not enforce login for feedback posting.
- Forgot-password email remains temporarily handled by identity-service local sender; planned to move fully into notification-service in a later hardening pass.
