const { cloudinary } = require("../config/cloudinary");

const uploadImageBuffer = ({ buffer, originalName, folder }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        filename_override: originalName,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      }
    );

    stream.end(buffer);
  });

const uploadImage = async ({ file, config }) => {
  if (!file) {
    return {
      ok: false,
      statusCode: 400,
      message: "No file uploaded",
      code: "MEDIA_FILE_REQUIRED",
      legacy: {
        message: "No file uploaded",
      },
    };
  }

  const uploaded = await uploadImageBuffer({
    buffer: file.buffer,
    originalName: file.originalname,
    folder: config.cloudinaryFolder,
  });

  return {
    ok: true,
    statusCode: 200,
    data: {
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
    },
    legacy: {
      imageUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
    },
  };
};

const deleteImage = async ({ publicId }) => {
  if (!publicId) {
    return {
      ok: false,
      statusCode: 400,
      message: "publicId is required",
      code: "MEDIA_PUBLIC_ID_REQUIRED",
    };
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: "image",
  });

  if (!result || result.result === "not found") {
    return {
      ok: false,
      statusCode: 404,
      message: "Image not found",
      code: "MEDIA_NOT_FOUND",
    };
  }

  return {
    ok: true,
    statusCode: 200,
    data: {
      publicId,
      deleted: true,
      result: result.result,
    },
    legacy: {
      message: "Image deleted successfully",
      publicId,
    },
  };
};

module.exports = {
  uploadImage,
  deleteImage,
};
