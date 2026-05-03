import io
import hashlib
import numpy as np
from PIL import Image
from typing import Optional
from .config import settings

_model = None
_processor = None


def _load_clip_if_needed():
    global _model, _processor
    if settings.mock_mode:
        return
    if _model is not None:
        return
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.clip_model_name)
    except Exception:
        # fallback to mock behavior if model cannot load
        _model = None


def _mock_vector_from_bytes(content: bytes, dim: int = 256):
    digest = hashlib.sha256(content).digest()
    seed = int.from_bytes(digest[:8], "little", signed=False)
    rng = np.random.default_rng(seed)
    vec = rng.normal(0, 1, size=(dim,)).astype(np.float32)
    norm = np.linalg.norm(vec) + 1e-9
    return (vec / norm).tolist()


def encode_image_bytes(image_bytes: bytes):
    if not image_bytes:
        raise ValueError("empty image bytes")

    if settings.mock_mode:
        return _mock_vector_from_bytes(image_bytes)

    _load_clip_if_needed()
    if _model is None:
        return _mock_vector_from_bytes(image_bytes)

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        vec = _model.encode(image, normalize_embeddings=True)
        return np.asarray(vec, dtype=np.float32).tolist()
    except Exception:
        return _mock_vector_from_bytes(image_bytes)


def cosine_similarity(vec_a, vec_b):
    a = np.asarray(vec_a, dtype=np.float32)
    b = np.asarray(vec_b, dtype=np.float32)
    if a.size == 0 or b.size == 0 or a.shape != b.shape:
        return 0.0
    den = float(np.linalg.norm(a) * np.linalg.norm(b)) + 1e-9
    return float(np.dot(a, b) / den)
