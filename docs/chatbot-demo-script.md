# Chatbot Demo Script

1. Start microservices stack
```bash
npm run compose:up
```

2. Start image-search-service
```bash
cd services/image-search-service
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 4010
```

3. Reindex graph
```bash
curl -X POST http://localhost:8080/api/assistant/graph/reindex -H "Authorization: Bearer <ASSISTANT_REINDEX_API_KEY>" -H "x-tenant-id: public"
```

4. Reindex image vectors
```bash
curl -X POST http://localhost:4010/reindex
```

5. Test text chat
- Có sách React không?
- Sách v? MongoDB
- Cùng tác gi? (? trang chi ti?t)
- Cùng th? lo?i
- Sách r? hon

6. Test image chat
```bash
curl -X POST http://localhost:8080/api/assistant/chat/image -F "message=Tim sach giong anh nay" -F "image=@sample.jpg" -H "x-tenant-id: public"
```

7. Test hybrid image + graph
```bash
curl -X POST http://localhost:8080/api/assistant/chat/image -F "message=Co cuon nao re hon khong" -F "image=@sample.jpg" -H "x-tenant-id: public"
```
