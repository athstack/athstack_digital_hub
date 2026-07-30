const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { isCustomer } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { uploadProfileImage, withUpload } = require('../middleware/upload');

router.use(isCustomer);

router.get('/', customerController.getDashboard);
router.get('/orders', customerController.getOrders);
router.get('/orders/:id', customerController.getOrderDetail);
router.get('/repairs', customerController.getRepairs);
router.get('/repairs/:id', customerController.getRepairDetail);
router.get('/training', customerController.getTraining);
router.get('/profile', customerController.getProfile);
router.post('/profile',
  withUpload(uploadProfileImage.single('avatar')),
  validateCsrf,
  customerController.updateProfile
);
router.get('/wishlist', customerController.getWishlist);
router.post('/wishlist/add', validateCsrf, customerController.addToWishlist);
router.post('/wishlist/remove', validateCsrf, customerController.removeFromWishlist);
router.get('/reviews', customerController.getReviews);
router.post('/reviews/:id/delete', validateCsrf, customerController.deleteReview);
router.get('/messages', customerController.getMessages);

module.exports = router;
