# media-service

## Purpose
Image upload/delete API with validation and Cloudinary wrapper.

## Routes
- `POST /images`
- `DELETE /images/:publicId`

## Run
```bash
npm install
npm run dev
```

## Health endpoint
- `GET /health`

## Env vars
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`
- `MAX_FILE_SIZE_MB`
- `ALLOWED_IMAGE_MIME_TYPES`

## Internal dependencies
- Cloudinary account credentials
- JWT auth for admin upload endpoints
