import requests
from typing import Dict, Any, List, Tuple
from .clip_encoder import encode_image_bytes, cosine_similarity
from .vector_store import VectorStore
from .catalog_client import fetch_catalog_products
from .config import settings


def _download_image(url: str) -> bytes:
    res = requests.get(url, timeout=20)
    res.raise_for_status()
    return res.content


def index_products(store: VectorStore, products: List[Dict[str, Any]]) -> Dict[str, int]:
    indexed = 0
    skipped = 0
    errors = 0
    records = []

    for p in products:
      try:
        pid = str(p.get("id") or p.get("_id") or "").strip()
        image_url = str(p.get("imageUrl") or p.get("imgSrc") or "").strip()
        if not pid or not image_url:
            skipped += 1
            continue
        # In mock mode we avoid external image downloads so local demo works without internet.
        image_bytes = image_url.encode("utf-8") if settings.mock_mode else _download_image(image_url)
        vector = encode_image_bytes(image_bytes)
        records.append({
            "productId": pid,
            "title": p.get("title", ""),
            "author": p.get("author", ""),
            "category": p.get("category") or p.get("type") or "",
            "price": float(p.get("price") or 0),
            "image": image_url,
            "vector": vector,
        })
        indexed += 1
      except Exception:
        errors += 1

    if records:
        store.upsert_many(records)

    return {"indexed": indexed, "skipped": skipped, "errors": errors}


def reindex_from_catalog(store: VectorStore) -> Dict[str, int]:
    products = fetch_catalog_products()
    return index_products(store, products)


def search_by_vector(store: VectorStore, query_vector, top_k: int = 5) -> List[Dict[str, Any]]:
    scored: List[Tuple[float, Dict[str, Any]]] = []
    for item in store.all_items():
        score = cosine_similarity(query_vector, item.get("vector") or [])
        scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    out = []
    for score, item in scored[: max(1, top_k)]:
        out.append({
            "productId": item.get("productId", ""),
            "score": round(float(score), 4),
            "title": item.get("title", ""),
            "image": item.get("image", ""),
            "author": item.get("author", ""),
            "category": item.get("category", ""),
            "price": item.get("price", 0),
        })
    return out
