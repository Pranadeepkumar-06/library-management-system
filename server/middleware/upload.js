const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let cloudinary = null;
if (useCloudinary) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!useCloudinary && !fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '_').slice(0, 40);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`);
  },
});

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED.has(ext)) return cb(ApiError.badRequest('Only .jpg/.jpeg/.png/.webp allowed', 'INVALID_FILE_TYPE'));
  cb(null, true);
};

const upload = multer({
  storage: useCloudinary ? multer.memoryStorage() : diskStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

// After upload.single(field): pushes the buffer to Cloudinary when configured,
// otherwise keeps the local /uploads file. Either way sets req.fileUrl.
const pushToCloudinary = (req, res, next) => {
  if (!req.file) return next();
  if (!useCloudinary) {
    req.fileUrl = `/uploads/${req.file.filename}`;
    return next();
  }
  const ext = path.extname(req.file.originalname).toLowerCase().slice(1) || 'jpg';
  const stream = cloudinary.uploader.upload_stream(
    { folder: 'library', resource_type: 'image', format: ext },
    (err, result) => {
      if (err || !result) {
        logger.error(`Cloudinary upload failed: ${err ? err.message : 'no result'}`);
        return next(ApiError.badRequest('Image upload failed', 'UPLOAD_FAILED'));
      }
      req.fileUrl = result.secure_url;
      next();
    }
  );
  stream.end(req.file.buffer);
};

module.exports = { upload, pushToCloudinary };
module.exports.default = upload;
