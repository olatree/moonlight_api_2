// utils/uploadToCloudinary.js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - the file buffer from multer memoryStorage
 * @param {string} folder - subfolder inside school-app/
 * @returns {{ url: string, public_id: string }}
 */
const uploadToCloudinary = (fileBuffer, folder = "general") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: `school-app/${folder}`, resource_type: "image" },
        (error, result) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      )
      .end(fileBuffer);
  });
};

/**
 * Delete an image from Cloudinary by its public_id
 * Fire-and-forget safe — won't crash if deletion fails
 */
const deleteFromCloudinary = (public_id) => {
  return cloudinary.uploader
    .destroy(public_id, { invalidate: true })
    .catch((err) => console.warn("Cloudinary delete failed:", public_id, err.message));
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };