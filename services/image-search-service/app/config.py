import os
from dataclasses import dataclass

@dataclass
class Settings:
    host: str = os.getenv("IMAGE_SEARCH_HOST", "0.0.0.0")
    port: int = int(os.getenv("IMAGE_SEARCH_PORT", "4010"))
    mock_mode: bool = os.getenv("MOCK_IMAGE_SEARCH", "true").lower() == "true"
    catalog_service_url: str = os.getenv("CATALOG_SERVICE_URL", "http://localhost:4002").rstrip("/")
    tenant_id: str = os.getenv("DEFAULT_TENANT_ID", "public")
    internal_api_key: str = os.getenv("IMAGE_SEARCH_INTERNAL_API_KEY", "")
    vector_store_path: str = os.getenv("VECTOR_STORE_PATH", "data/vectors.json")
    clip_model_name: str = os.getenv("CLIP_MODEL_NAME", "sentence-transformers/clip-ViT-B-32")

settings = Settings()
