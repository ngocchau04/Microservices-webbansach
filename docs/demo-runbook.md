# Active stack — demo / thesis checklist

Target: `docker-compose.micro.yml` (gateway on **8080**, web on **5173**).

## 1. Bring the stack up

```bash
docker compose -f docker-compose.micro.yml up -d --build --remove-orphans
```

Wait until `book-api-gateway` and dependencies are healthy.

## 2. Automated smoke check (recommended)

From the repo root (Node 18+):

```bash
node scripts/demo-stack-check.js
```

Optional: run assistant reindex as part of the script (uses compose default dev key):

```bash
set ASSISTANT_REINDEX_API_KEY=dev_assistant_reindex_change_me
node scripts/demo-stack-check.js
```

(On PowerShell, use `$env:ASSISTANT_REINDEX_API_KEY="..."` instead of `set`.)

## 3. Manual spot checks (gateway-first)

- Gateway liveness: `GET http://localhost:8080/health`
- Gateway edge info: `GET http://localhost:8080/ready` (lists upstream base URLs; does not probe them)
- Mongo readiness (via gateway):
  - `GET http://localhost:8080/api/auth/ready`
  - `GET http://localhost:8080/api/catalog/ready`
  - `GET http://localhost:8080/api/checkout/ready`
  - `GET http://localhost:8080/api/reporting/ready`
  - `GET http://localhost:8080/api/support/ready`
  - `GET http://localhost:8080/api/assistant/ready`
- Assistant suggestions: `GET http://localhost:8080/api/assistant/suggestions`
- Assistant chat sample: `POST http://localhost:8080/api/assistant/chat` with JSON `{"message":"chinh sach van chuyen"}`

## 4. UI demo

Open `http://localhost:5173`, go to the home page, open the floating chat panel, send a short FAQ or product query.

## 5. If the gateway looks “stale”

Rebuild images so routing and env match the repo:

```bash
docker compose -f docker-compose.micro.yml up -d --build --remove-orphans
```
