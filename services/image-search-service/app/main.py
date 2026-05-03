from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.responses import JSONResponse
import requests
from typing import Optional
from .config import settings
from .schemas import IndexRequest, ImageUrlSearchRequest
from .vector_store import VectorStore
from .clip_encoder import encode_image_bytes
from .indexer import index_products, reindex_from_catalog, search_by_vector

app = FastAPI(title="image-search-service", version="0.1.0")
store = VectorStore(settings.vector_store_path)


def _check_internal_key(header_key: Optional[str]):
    if settings.internal_api_key and header_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid internal api key")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "mockMode": settings.mock_mode,
        "storedItems": len(store.all_items()),
    }


@app.post("/index")
def index(request: IndexRequest, x_internal_api_key: Optional[str] = Header(default=None)):
    _check_internal_key(x_internal_api_key)
    stats = index_products(store, [item.model_dump() for item in request.products])
    return {"success": True, **stats}


@app.post("/reindex")
def reindex(x_internal_api_key: Optional[str] = Header(default=None)):
    _check_internal_key(x_internal_api_key)
    stats = reindex_from_catalog(store)
    return {"success": True, **stats}


@app.post("/search/image")
async def search_image(
    image: UploadFile = File(...),
    topK: int = Form(default=5),
    x_internal_api_key: Optional[str] = Header(default=None),
):
    _check_internal_key(x_internal_api_key)
    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="empty image")
    try:
        query_vector = encode_image_bytes(content)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"cannot encode image: {error}")
    matches = search_by_vector(store, query_vector, topK)
    return {"matches": matches}


@app.post("/search/image-url")
def search_image_url(payload: ImageUrlSearchRequest, x_internal_api_key: Optional[str] = Header(default=None)):
    _check_internal_key(x_internal_api_key)
    try:
        res = requests.get(payload.imageUrl, timeout=20)
        res.raise_for_status()
        query_vector = encode_image_bytes(res.content)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"cannot load image url: {error}")
    matches = search_by_vector(store, query_vector, payload.topK)
    return {"matches": matches}


@app.exception_handler(Exception)
async def on_error(_, exc: Exception):
    return JSONResponse(status_code=500, content={"success": False, "message": str(exc)})
