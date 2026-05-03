from pydantic import BaseModel, Field
from typing import List, Optional

class ProductIndexItem(BaseModel):
    id: str
    title: str
    imageUrl: str
    author: Optional[str] = ""
    category: Optional[str] = ""
    price: Optional[float] = 0

class IndexRequest(BaseModel):
    products: List[ProductIndexItem] = Field(default_factory=list)

class ImageUrlSearchRequest(BaseModel):
    imageUrl: str
    topK: int = 5

class MatchItem(BaseModel):
    productId: str
    score: float
    title: str
    image: str
    author: Optional[str] = ""
    category: Optional[str] = ""
    price: Optional[float] = 0

class SearchResponse(BaseModel):
    matches: List[MatchItem]
