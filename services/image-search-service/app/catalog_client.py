import requests
from typing import List, Dict, Any
from .config import settings


def fetch_catalog_products() -> List[Dict[str, Any]]:
    products: List[Dict[str, Any]] = []
    page = 1
    limit = 100
    headers = {"x-tenant-id": settings.tenant_id}
    while page <= 200:
        url = f"{settings.catalog_service_url}/products?page={page}&limit={limit}"
        res = requests.get(url, timeout=20, headers=headers)
        if res.status_code != 200:
            break
        payload = res.json()
        items = payload.get("data", {}).get("items") or payload.get("data") or []
        if not isinstance(items, list) or not items:
            break
        products.extend(items)
        if len(items) < limit:
            break
        page += 1
    return products
