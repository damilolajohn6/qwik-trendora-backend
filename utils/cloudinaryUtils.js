const isValidCloudinaryUrl = (url) => {
  if (typeof url !== "string" || !url) return false;
  const cloudinaryPattern =
    /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9-]+\/image\/upload\/v\d+\/.+$/;
  return cloudinaryPattern.test(url);
};

module.exports = { isValidCloudinaryUrl };
