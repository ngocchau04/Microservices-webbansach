# GraphRAG nh? cho Bookie

## Entity types
- Book
- Author
- Category
- Tag
- Publisher
- Review (optional)
- User (optional)

## Relation types
- written_by
- belongs_to
- has_tag
- similar_to
- cheaper_than
- has_review
- purchased
- reviewed

## Data shape
Entity:
```json
{
  "entityId": "book:<productId>",
  "type": "Book",
  "refId": "<productId>",
  "name": "Ten sach",
  "normalizedName": "ten sach",
  "metadata": { "price": 100000, "stock": 5, "author": "...", "category": "..." },
  "confidence": 1.0
}
```

Relation:
```json
{
  "sourceId": "book:...",
  "targetId": "author:...",
  "type": "written_by",
  "metadata": {},
  "confidence": 1.0
}
```

## Reindex graph
```bash
curl -X POST http://localhost:8080/api/assistant/graph/reindex \
  -H "Authorization: Bearer <ASSISTANT_REINDEX_API_KEY>" \
  -H "x-tenant-id: public"
```

## Traversal intents
- same_author
- same_category
- cheaper
- product_relationship
- explain_recommendation

Fallback: n?u graph không có k?t qu?, assistant t? fallback v? catalog rule-based.
