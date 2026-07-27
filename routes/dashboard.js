const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { isAuthenticated } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { uploadProfileImage, handleUploadError } = require('../middleware/upload');

router.use(isAuthenticated);

router.get('/', customerController.getDashboard);
router.get('/orders', customerController.getOrders);
router.get('/repairs', customerController.getRepairs);
router.get('/training', customerController.getTraining);
router.get('/profile', customerController.getProfile);
router.post('/profile',
  validateCsrf,
  uploadProfileImage.single('avatar'),
  handleUploadError,
  customerController.updateProfile
);
router.get('/wishlist', customerController.getWishlist);

module.exports = router;
