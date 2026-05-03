import json
import os
from typing import List, Dict, Any


class VectorStore:
    def __init__(self, path: str):
        self.path = path
        self._items: List[Dict[str, Any]] = []
        self._ensure_dir()
        self._load()

    def _ensure_dir(self):
        folder = os.path.dirname(self.path)
        if folder:
            os.makedirs(folder, exist_ok=True)

    def _load(self):
        if not os.path.exists(self.path):
            self._items = []
            return
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                payload = json.load(f)
            self._items = payload.get("items", []) if isinstance(payload, dict) else []
        except Exception:
            self._items = []

    def _persist(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump({"items": self._items}, f, ensure_ascii=False)

    def reset(self):
        self._items = []
        self._persist()

    def upsert_many(self, records: List[Dict[str, Any]]):
        by_id = {str(item.get("productId")): item for item in self._items}
        for record in records:
            by_id[str(record.get("productId"))] = record
        self._items = list(by_id.values())
        self._persist()

    def all_items(self):
        return self._items
