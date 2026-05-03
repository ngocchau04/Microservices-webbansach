**1. Tổng quan chatbot Bookie**
- Chatbot Bookie hiện là trợ lý tư vấn sách trong web bán sách: tìm sách theo từ khóa, gợi ý theo ngữ cảnh sản phẩm hiện tại, trả lời policy, và tìm sách theo ảnh.
- So với bản hard-code ban đầu, phiên bản hiện tại đã gọi dữ liệu thật từ `catalog-service` và có lớp graph traversal + image search service.
- Theo code thực tế, chatbot là hybrid:
- `rule-based` intent + fallback.
- `catalog chatbot` (query product API thật).
- `GraphRAG nhẹ` (graph entity/relation trong Mongo của assistant-service, traversal 1-2 hop logic).
- `image search chatbot` (CLIP/mock CLIP vector search).
- `hybrid text + image + graph`.
- Phần chạy thật theo code:
- Frontend gọi backend thật qua gateway.
- Assistant gọi catalog thật.
- Graph reindex/traversal có route và service thật.
- Image upload flow có thật.
- Phần mock/chưa chắc runtime:
- `image-search-service` có `MOCK_IMAGE_SEARCH=true` mặc định.
- CLIP thật chỉ chạy khi tắt mock và model load được.
- Có nhánh Gemini trong `chatService` nhưng phụ thuộc `GEMINI_API_KEY`; nếu không có key thì chạy heuristic/rule/graph.

**2. Kiến trúc tổng thể**
A. Text chat flow  
`User -> Web Chat UI -> API Gateway (/api/assistant/chat) -> assistant-service (/chat) -> intent detection -> graph traversal (nếu có currentProductId + graph intent) -> live catalog fallback / retrieval -> response builder -> Web UI`

B. GraphRAG flow  
`Catalog products -> POST /api/assistant/graph/reindex -> GraphEntity + GraphRelation (Mongo assistant DB) -> graphTraversalService -> recommendations`

C. Image search flow  
`User upload image -> Web Chat UI -> API Gateway (/api/assistant/chat/image) -> assistant-service imageChatService -> image-search-service (/search/image) -> CLIP/mock CLIP embedding -> vector_store -> productId matches -> assistant gọi catalog lấy chi tiết -> trả recommendations`

D. Hybrid flow  
`Image match top-1 anchor product -> parse text intent (same_author/same_category/cheaper) -> graphTraversalService(currentProductId=anchor) -> final recommendations`

**3. Cấu trúc thư mục và vai trò từng file**
A. `apps/web`
- UI chatbot: [index.jsx](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/apps/web/src/components/Chat/index.jsx)
- API client chatbot: [assistantApi.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/apps/web/src/services/assistantApi.js)
- Upload ảnh: xử lý trong `handleImageSelected` + `handleSendImage` ở `index.jsx`.
- Truyền `currentProductId`: lấy từ URL `/book/:id` bằng `getCurrentProductIdFromPath()` và gửi vào cả text/image request.

B. `apps/api-gateway`
- Rewrite route: [pathRewriteService.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/apps/api-gateway/src/services/pathRewriteService.js)
- Proxy controller: [proxyController.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/apps/api-gateway/src/controllers/proxyController.js)
- Route chatbot đi qua gateway:
- `/api/assistant/chat` -> assistant `/chat`
- `/api/assistant/chat/image` -> assistant `/chat/image`
- `/api/assistant/graph/reindex` -> assistant `/graph/reindex`
- `/api/assistant/*` nói chung -> assistant `/*`

C. `services/assistant-service`
- Controller: [assistantController.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/controllers/assistantController.js)
- Routes: [assistantRoutes.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/routes/assistantRoutes.js)
- `chatService`: [chatService.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/services/chatService.js)
- Orchestrate intent, graph first, live fallback, retrieval, optional Gemini.
- `liveCatalogFallbackService`: [liveCatalogFallbackService.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/services/liveCatalogFallbackService.js)
- Rule-based trả lời từ dữ liệu catalog thật + policy tĩnh.
- `graphIndexService`: [graphIndexService.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/services/graphIndexService.js)
- Build graph từ catalog products, tạo entity/relation, reindex Mongo.
- `graphTraversalService`: [graphTraversalService.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/services/graphTraversalService.js)
- Traverse cho same_author/same_category/cheaper/similar.
- `imageChatService`: [imageChatService.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/services/imageChatService.js)
- Gọi image-search-service, map product, hybrid với graph intent.
- Catalog client: [catalogClient.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/utils/catalogClient.js)
- Image search client: [imageSearchClient.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/utils/imageSearchClient.js)
- Graph models:
- [GraphEntity.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/models/GraphEntity.js)
- [GraphRelation.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/models/GraphRelation.js)
- Constants/helpers:
- [constants.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/graph/constants.js)
- [helpers.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/graph/helpers.js)
- Env config: [env.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/src/config/env.js)

D. `services/image-search-service`
- API app: [main.py](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/app/main.py)
- Config env: [config.py](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/app/config.py)
- Embedding: [clip_encoder.py](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/app/clip_encoder.py)
- Vector store JSON: [vector_store.py](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/app/vector_store.py)
- Index + search: [indexer.py](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/app/indexer.py)
- Fetch catalog products: [catalog_client.py](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/app/catalog_client.py)
- Request/response schema: [schemas.py](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/app/schemas.py)
- Dependency: [requirements.txt](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/requirements.txt)
- Env sample: [.env.example](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/.env.example)
- Mock mode: `MOCK_IMAGE_SEARCH=true` tạo vector giả deterministic từ bytes.

E. `services/catalog-service`
- Chatbot dùng:
- `GET /products`
- `GET /products/:id`
- `GET /search?mode=top10`
- Product schema: [Product.js](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/catalog-service/src/models/Product.js)

**4. Các API của chatbot**

| Method | Endpoint | Service | Mục đích | Input chính | Output chính |
|---|---|---|---|---|---|
| POST | `/api/assistant/chat` | assistant (qua gateway) | Chat text | `message`, `context`, `currentProductId` | `mainAnswer`, `recommendations`, `followUpChips`, `graphReasoningInfo` |
| POST | `/api/assistant/chat/image` | assistant (qua gateway) | Chat bằng ảnh | multipart `image`, `message`, `currentProductId` | image/graph recommendations |
| POST | `/api/assistant/graph/reindex` | assistant (qua gateway) | Rebuild graph index | header token + tenant | số `entities`, `relations` |
| GET | `/health` | image-search-service | Health image service | none | `status`, `mockMode`, `storedItems` |
| POST | `/reindex` | image-search-service | Reindex vector từ catalog | optional internal key | `indexed/skipped/errors` |
| POST | `/search/image` | image-search-service | Search theo file ảnh | multipart `image`, `topK` | `matches[]` |
| POST | `/search/image-url` | image-search-service | Search theo URL ảnh | `imageUrl`, `topK` | `matches[]` |
| POST | `/index` | image-search-service | Index trực tiếp list products | `products[]` | `indexed/skipped/errors` |

**5. Dữ liệu và schema**
A. Product data chatbot dùng
- Dùng chính: `_id`, `title`, `author`, `type` (category code), `price`, `stock`, `imgSrc`, `description`, `rating`, `reviewsCount`, `soldCount`.
- Bắt buộc theo schema catalog: `imgSrc`, `title`, `author`, `price`, `type`.
- Optional: `description`, `rating`, `reviewsCount`, `stock`, `publisher`...
- Thiếu `author`: giảm/không chạy tốt same_author.
- Thiếu `type`: giảm/không chạy tốt same_category, cheaper theo category.
- Thiếu `imgSrc`: không index image.

B. GraphEntity (thực tế code)
- Field: `tenantId`, `entityId`, `type`, `refId`, `name`, `normalizedName`, `metadata`, `confidence`, timestamps.
- Ví dụ Book: `entityId=book:<productId>`, `type=Book`, `refId=<productId>`, metadata có `price/stock/image/author/category/...`.
- Ví dụ Author: `entityId=author:<slug>`, `type=Author`.
- Ví dụ Category: `entityId=category:<slug>`, `type=Category`, metadata có `categoryCode`.

C. GraphRelation (thực tế code)
- Field: `tenantId`, `sourceId`, `targetId`, `type`, `metadata`, `confidence`, timestamps.
- Ví dụ:
- `book:x --written_by--> author:y`
- `book:x --belongs_to--> category:z`
- `book:x --similar_to--> book:w` (metadata score)
- `book:a --cheaper_than--> book:b` (A rẻ hơn B trong cùng category khi build index)

D. Image vector metadata
- Lưu trong `vectors.json` mỗi record gồm:
- `productId`, `title`, `author`, `category`, `price`, `image`, `vector`.
- Kết quả search trả thêm `score`.

**6. Cách chatbot xử lý từng loại câu hỏi**
1. “Có sách React không?”
- Flow: `chatService` -> thường vào `runLiveCatalogFallback` nhánh search.
- Gọi `catalogClient.searchProducts({ q: keyword })` -> `/products?q=react`.
- Rank đơn giản theo title/description match + rating + soldCount.
- Trả dựa trên dữ liệu catalog thật.

2. “Cùng tác giả”
- Cần `currentProductId` (hoặc `lastProductId` từ session context).
- Ưu tiên graph traversal nếu graph có.
- Path logic: Book -> Author -> Book.
- Nếu graph không có hoặc không đủ context: fallback catalog.

3. “Cùng thể loại”
- Tương tự, path: Book -> Category -> Book.
- Nếu thiếu context thì fallback báo mở trang detail trước.

4. “Sách rẻ hơn”
- Trong graphTraversal hiện lọc `price < current price` và cùng `type`.
- Live fallback cũng lọc cùng `type` + giá thấp hơn.

5. “Tại sao bạn gợi ý?”
- Có nhánh `explain`.
- Lý do lấy từ logic/rule/path/signal trong service, không phải LLM bắt buộc.
- Có thể đính `graphReasoningInfo.pathsUsed`.

6. “Chính sách vận chuyển”
- Nhánh `shipping_policy` ở `liveCatalogFallbackService`.
- Trả policy tĩnh trong code (`POLICY_SHIPPING`), không gọi catalog.

7. “Đổi trả và hoàn tiền”
- Nhánh `return_policy` ở `liveCatalogFallbackService`.
- Nội dung policy tĩnh mô tả logic đơn hàng hiện tại (7 ngày khi received, completed không trả...).

8. Upload ảnh bìa sách
- UI gửi multipart tới `/api/assistant/chat/image`.
- Assistant gọi image-search-service `/search/image`.
- CLIP thật hay mock phụ thuộc `MOCK_IMAGE_SEARCH`.
- Match trả `productId` -> assistant gọi catalog lấy product details -> trả recommendations.

9. Upload ảnh + “có cuốn nào rẻ hơn không?”
- Anchor = top match đầu tiên từ image search.
- Parse intent từ message (`cheaper/same_author/same_category`).
- Gọi graph traversal với `currentProductId=anchor`.

**7. GraphRAG nhẹ trong project này là gì**
- “Nhẹ” vì:
- Không dùng Neo4j/graph DB chuyên dụng.
- Dùng Mongo collections `assistant_graph_entities` + `assistant_graph_relations`.
- Traversal code-level trong Node service.
- Dùng rule-based response builder; không phụ thuộc LLM để sinh toàn bộ câu trả lời.
- Traversal thực tế chủ yếu 1-2 hop.
- Có `graphPath` trong recommendation của graphTraversal.
- Ưu điểm cho demo microservice bán sách:
- Dễ chạy local.
- Dễ reindex từ catalog.
- Dễ explain “cùng tác giả/cùng thể loại/rẻ hơn”.

**8. CLIP image search trong project này là gì**
- CLIP dùng để encode ảnh sang vector để tìm ảnh/sách tương tự.
- Mock mode:
- `MOCK_IMAGE_SEARCH=true` -> không cần model nặng; vector tạo pseudo-random deterministic từ bytes.
- CLIP thật:
- `MOCK_IMAGE_SEARCH=false` và load được `sentence-transformers/clip-ViT-B-32`.
- Vector store hiện tại: JSON local (`VECTOR_STORE_PATH`), không phải Qdrant/Chroma production-grade.
- Phù hợp web sách vì bìa sách là tín hiệu mạnh để tìm sách giống.
- Hạn chế:
- Chưa OCR.
- Chưa reranker mạnh.
- Chưa xác nhận CLIP thật nếu chưa test runtime đầy đủ.

**9. Environment variables**
Assistant service ([.env.example](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/assistant-service/.env.example))
- `ASSISTANT_REINDEX_API_KEY`: bảo vệ `/reindex` và `/graph/reindex`. Ví dụ `replace_with_strong_secret`. Bắt buộc nếu muốn bật reindex ngoài test.
- `CATALOG_SERVICE_URL`: base URL catalog nội bộ. Ví dụ `http://localhost:4002`. Bắt buộc cho fallback/graph/image enrich.
- `CATALOG_INTERNAL_API_KEY`: header nội bộ gọi catalog. Optional theo môi trường.
- `IMAGE_SEARCH_SERVICE_URL`: URL image-search-service. Ví dụ `http://localhost:4010`. Bắt buộc cho image chat.
- `IMAGE_SEARCH_INTERNAL_API_KEY`: key nội bộ gọi image service. Optional.
- `SUPPORT_SERVICE_URL`, `SUPPORT_INTERNAL_API_KEY`: cho handoff support.
- `GEMINI_API_KEY`: optional cho nhánh AI augment.

Image-search-service ([.env.example](d:/CongNgheLapTrinhHienDai/Microservices-webbansach/services/image-search-service/.env.example))
- `IMAGE_SEARCH_PORT`: port service. Ví dụ `4010`. Bắt buộc runtime.
- `MOCK_IMAGE_SEARCH`: bật mock embedding. Ví dụ `true`. Không bắt buộc nhưng mặc định true.
- `CATALOG_SERVICE_URL`: lấy products reindex. Ví dụ `http://localhost:4002`.
- `VECTOR_STORE_PATH`: file lưu vector. Ví dụ `data/vectors.json`.
- `CLIP_MODEL_NAME`: model CLIP khi mock=false. Ví dụ `sentence-transformers/clip-ViT-B-32`.
- `IMAGE_SEARCH_INTERNAL_API_KEY`: optional auth nội bộ.

**10. Cách chạy và test**
A. Chạy services
- `npm run compose:up` cho stack chính.
- Chạy image service riêng:
- `cd services/image-search-service`
- `pip install -r requirements.txt`
- `uvicorn app.main:app --host 0.0.0.0 --port 4010`

B. Reindex graph
- Theo code middleware, hợp lệ với `x-assistant-reindex-token` hoặc Bearer.
- Ví dụ:
```bash
curl -X POST http://localhost:8080/api/assistant/graph/reindex ^
  -H "x-assistant-reindex-token: <ASSISTANT_REINDEX_API_KEY>" ^
  -H "x-tenant-id: public"
```

C. Reindex image
```bash
curl -X POST http://localhost:4010/reindex
```

D. Test text chatbot
- “Có sách React không?”
- “Sách về MongoDB”
- Ở trang detail: “Cùng tác giả”, “Cùng thể loại”, “Sách rẻ hơn”

E. Test image chatbot
- Upload ảnh bìa.
- Upload ảnh + “có cuốn nào rẻ hơn không?”

F. Test fallback
- Tắt image-search-service:
- Kỳ vọng: assistant trả message thân thiện “tính năng ảnh chưa sẵn sàng”, UI không crash.
- Tắt catalog-service:
- Kỳ vọng: chatbot fallback/error message, không crash frontend; recommendation rỗng.

**11. Đánh giá mức độ hoàn thành**
A. Đã hoàn thành
- UI chat text + suggestion chips + upload ảnh.
- Gateway proxy `/api/assistant/*`.
- Assistant text orchestration + live catalog fallback.
- Graph reindex + graph traversal.
- Image search service API + mock mode + reindex/search.
- Hybrid ảnh + graph intent.

B. Cần chạy để xác nhận
- E2E CLIP thật (mock=false, model load/download).
- E2E đầy đủ tất cả intent tiếng Việt có dấu trong môi trường hiện tại.
- Reindex/auth header thực tế giữa docs và runtime config.

C. Chưa hoàn thiện / hạn chế
- Chưa production-ready graph DB (Neo4j/Qdrant không dùng).
- Image vector store là file JSON local.
- Chưa OCR.
- Reranker đơn giản.
- Test tự động chuyên sâu cho image/graph hybrid chưa đầy đủ.
- Docs có chỗ chưa đồng bộ hoàn toàn với runtime auth header.

Kết luận:
- Có thể gọi là **MVP đã hoàn thành** cho demo microservices chatbot đa chế độ.
- Chưa thể gọi **production-ready**.
- Trước demo: chạy lại E2E checklist, reindex graph/image, xác nhận fallback khi service down.

**12. Tóm tắt ngắn để trình bày với mentor**
Bookie hiện là chatbot hybrid chạy trên kiến trúc microservices, frontend gọi qua API Gateway vào assistant-service. Ở nhánh text, chatbot dùng intent rule-based và gọi catalog-service thật để tìm/gợi ý sách, không còn hard-code danh sách sản phẩm. Ở nhánh GraphRAG nhẹ, assistant build graph từ dữ liệu sản phẩm vào Mongo bằng entity/relation và dùng traversal để trả lời các câu như cùng tác giả, cùng thể loại, rẻ hơn. Vì không dùng Neo4j hay graph engine chuyên dụng nên gọi là GraphRAG nhẹ. Ở nhánh ảnh, web upload ảnh bìa lên assistant, assistant gọi image-search-service để lấy match theo vector rồi enrich bằng dữ liệu catalog thật. Service ảnh hỗ trợ cả CLIP thật và mock CLIP để demo local ổn định. Khi có ảnh + câu hỏi quan hệ (như rẻ hơn), assistant lấy top match làm anchor và chạy graph traversal tiếp. Các phần chính đã có code và route đầy đủ, nhưng CLIP thật và vài case cần E2E runtime để xác nhận chắc chắn. Vì vậy hệ thống đạt mức MVP demo tốt, chưa ở mức production-ready.