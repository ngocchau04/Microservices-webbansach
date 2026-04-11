# Phase 1 Foundation Notes

## Scope
- Restructure monorepo foundation only.
- Keep legacy backend behavior unchanged.
- Frontend now targets API Gateway only via `VITE_API_BASE_URL`.

## Assumptions
- Legacy backend continues to run from `Backend` during Phase 1.
- Existing backend API contracts are preserved through gateway path rewrite.
- Old `FrontEnd` directory could not be deleted completely because locked `node_modules` binaries were in use on Windows; source code has been moved to `apps/web`.

## Run Flow
1. Start legacy backend (`Backend`).
2. Start gateway (`apps/api-gateway`) on port `8080`.
3. Start frontend (`apps/web`) with `VITE_API_BASE_URL=http://localhost:8080`.
