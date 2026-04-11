const mediaService = require("../services/mediaService");
const { sendServiceResult } = require("../utils/http");

const uploadImage = async (req, res) => {
  const result = await mediaService.uploadImage({
    file: req.file,
    config: req.app.locals.config,
  });

  return sendServiceResult(res, result);
};

const deleteImage = async (req, res) => {
  const result = await mediaService.deleteImage({
    publicId: decodeURIComponent(req.params.publicId),
  });

  return sendServiceResult(res, result);
};

module.exports = {
  uploadImage,
  deleteImage,
};
