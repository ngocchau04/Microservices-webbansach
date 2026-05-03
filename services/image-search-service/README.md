# image-search-service (CLIP MVP)

## Run
```bash
cd services/image-search-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 4010
```

## Health
```bash
curl http://localhost:4010/health
```

## Reindex from catalog
```bash
curl -X POST http://localhost:4010/reindex
```

## Search by image file
```bash
curl -X POST "http://localhost:4010/search/image" -F "image=@sample.jpg" -F "topK=5"
```

## Search by image URL
```bash
curl -X POST http://localhost:4010/search/image-url -H "Content-Type: application/json" -d "{\"imageUrl\":\"https://example.com/book.jpg\",\"topK\":5}"
```

## Notes
- `MOCK_IMAGE_SEARCH=true` (default): no heavy model dependency required.
- `MOCK_IMAGE_SEARCH=false`: service tries to use CLIP model from `sentence-transformers`.
- Vector store persisted in `data/vectors.json`.
