# Assistant Chatbot Demo Guide

## API
- `POST /api/assistant/chat`
- Gateway route -> assistant-service `/chat`

Request:
```json
{
  "message": "Co sach React khong?",
  "currentProductId": "optional",
  "context": {
    "currentProductId": "optional",
    "lastProductId": "optional"
  }
}
```

## Required env
- `ASSISTANT_SERVICE_URL=http://localhost:4008` (gateway)
- `CATALOG_SERVICE_URL=http://localhost:4002` (assistant-service)
- `CATALOG_INTERNAL_API_KEY` must match between `catalog-service` and `assistant-service` when internal key auth is used.

## Manual test
1. `curl -X POST http://localhost:8080/api/assistant/chat -H "Content-Type: application/json" -H "x-tenant-id: public" -d "{\"message\":\"Co sach React khong?\"}"`
2. `curl -X POST http://localhost:8080/api/assistant/chat -H "Content-Type: application/json" -H "x-tenant-id: public" -d "{\"message\":\"Sach ve MongoDB\"}"`
3. `curl -X POST http://localhost:8080/api/assistant/chat -H "Content-Type: application/json" -H "x-tenant-id: public" -d "{\"message\":\"Cung tac gia\",\"currentProductId\":\"<productId>\"}"`
4. `curl -X POST http://localhost:8080/api/assistant/chat -H "Content-Type: application/json" -H "x-tenant-id: public" -d "{\"message\":\"Cung the loai\",\"currentProductId\":\"<productId>\"}"`
5. `curl -X POST http://localhost:8080/api/assistant/chat -H "Content-Type: application/json" -H "x-tenant-id: public" -d "{\"message\":\"Sach re hon\",\"currentProductId\":\"<productId>\"}"`
6. `curl -X POST http://localhost:8080/api/assistant/chat -H "Content-Type: application/json" -H "x-tenant-id: public" -d "{\"message\":\"Chinh sach van chuyen\"}"`
7. `curl -X POST http://localhost:8080/api/assistant/chat -H "Content-Type: application/json" -H "x-tenant-id: public" -d "{\"message\":\"Doi tra va hoan tien\"}"`

Expected: response contains `data.mainAnswer`, and product questions include `data.recommendations` from catalog-service.
