# catalog-service

## Purpose
Product catalog, search/filter/sort/pagination, review/rating, admin product CRUD.

## Routes
- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `GET /search`
- `GET /products/:id/reviews`
- `POST /products/:id/reviews`
- `PUT /reviews/:id`
- `DELETE /reviews/:id`

## Run
```bash
npm install
npm run dev
```

## Health endpoint
- `GET /health`

## Env vars
- `PORT`
- `MONGO_URI`
- `CATALOG_DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

## Internal dependencies
- MongoDB (`book_catalog` logical DB)
- JWT verification for admin-protected endpoints
