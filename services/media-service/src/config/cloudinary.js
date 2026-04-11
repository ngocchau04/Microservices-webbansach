const cloudinary = require("cloudinary").v2;

const configureCloudinary = (config) => {
  if (
    !config.cloudinaryCloudName ||
    !config.cloudinaryApiKey ||
    !config.cloudinaryApiSecret
  ) {
    console.warn(
      "[media-service] cloudinary credentials are missing; upload/delete will fail until configured."
    );
  }

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });
};

module.exports = {
  cloudinary,
  configureCloudinary,
};
