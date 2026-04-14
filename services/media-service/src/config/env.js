const DEFAULT_PORT = 4004;
const DEFAULT_MAX_FILE_SIZE_MB = 5;
const DEFAULT_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_CLOUDINARY_FOLDER = "bookstore/uploads";

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const toMimeTypes = (value) => {
  if (!value || typeof value !== "string") {
    return DEFAULT_ALLOWED_MIME_TYPES;
  }

  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length ? parsed : DEFAULT_ALLOWED_MIME_TYPES;
};

const getEnvConfig = () => ({
  port: toPositiveNumber(process.env.PORT, DEFAULT_PORT),
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET_KEY || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || DEFAULT_CLOUDINARY_FOLDER,
  maxFileSizeMb: toPositiveNumber(process.env.MAX_FILE_SIZE_MB, DEFAULT_MAX_FILE_SIZE_MB),
  allowedImageMimeTypes: toMimeTypes(process.env.ALLOWED_IMAGE_MIME_TYPES),
});

module.exports = {
  getEnvConfig,
};
