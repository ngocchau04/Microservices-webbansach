const multer = require("multer");

const createUploadMiddleware = (config) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.maxFileSizeMb * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
      const isAllowed = config.allowedImageMimeTypes.includes(file.mimetype);

      if (!isAllowed) {
        const error = new Error(
          `Unsupported file type. Allowed: ${config.allowedImageMimeTypes.join(", ")}`
        );
        error.statusCode = 400;
        error.code = "MEDIA_INVALID_FILE_TYPE";
        return callback(error);
      }

      return callback(null, true);
    },
  });

  const singleImage = upload.single("imageUrl");

  return (req, res, next) => {
    singleImage(req, res, (error) => {
      if (error) {
        if (error.code === "LIMIT_FILE_SIZE") {
          error.statusCode = 400;
          error.code = "MEDIA_FILE_TOO_LARGE";
          error.message = `Image exceeds ${config.maxFileSizeMb}MB`;
        }
        return next(error);
      }

      return next();
    });
  };
};

module.exports = {
  createUploadMiddleware,
};
