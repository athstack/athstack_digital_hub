const multer = require('multer');
const path = require('path');

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Create multer storage for a given subdirectory
 * @param {string} subdirectory - Folder name under public/uploads/
 * @returns {multer.StorageEngine}
 */
function createStorage(subdirectory) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '..', 'public', 'uploads', subdirectory));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${subdirectory}-${uniqueSuffix}${ext}`);
    }
  });
}

/**
 * File filter that only allows image types
 * @param {Object} req
 * @param {Object} file
 * @param {Function} cb
 */
function imageFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, jpeg, png, webp, gif)'), false);
  }
}

const productStorage = createStorage('products');
const serviceStorage = createStorage('services');
const profileStorage = createStorage('profiles');

const uploadProductImages = multer({
  storage: productStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

const uploadServiceImages = multer({
  storage: serviceStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

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

module.exports = {
  uploadProductImages,
  uploadServiceImages,
  uploadProfileImage,
  handleUploadError,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};
