# web app

## Purpose
- React/Vite storefront and admin UI.
- Calls only `apps/api-gateway` via `VITE_API_BASE_URL`.

## API entrypoint
- `VITE_API_BASE_URL=http://localhost:8080`
- Nginx `/api` reverse proxy (container runtime) targets `api-gateway:8080`.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Internal dependencies
- `api-gateway` for all backend communication.
- No direct calls to service ports.
