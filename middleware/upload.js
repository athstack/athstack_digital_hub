const multer = require('multer');

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function imageFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, jpeg, png, webp, gif)'), false);
  }
}

const storage = multer.memoryStorage();

const uploadProductImages = multer({ storage, fileFilter: imageFilter, limits: { fileSize: MAX_FILE_SIZE } });
const uploadServiceImages = multer({ storage, fileFilter: imageFilter, limits: { fileSize: MAX_FILE_SIZE } });
const uploadProfileImage = multer({ storage, fileFilter: imageFilter, limits: { fileSize: MAX_FILE_SIZE } });

/**
 * Multer error handler middleware
 * @param {Object} err
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error', 'File is too large. Maximum size is 5MB.');
      return res.redirect('back');
    }
    req.flash('error', 'File upload error: ' + err.message);
    return res.redirect('back');
  }
  if (err.message && err.message.includes('image files')) {
    req.flash('error', err.message);
    return res.redirect('back');
  }
  next(err);
}

/**
 * Wrap a multer upload middleware to catch errors inline
 * @param {Function} uploadMiddleware - multer upload middleware (e.g. upload.single('field'))
 * @returns {Function} Express middleware
 */
function withUpload(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  };
}

module.exports = {
  uploadProductImages,
  uploadServiceImages,
  uploadProfileImage,
  handleUploadError,
  withUpload,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};
