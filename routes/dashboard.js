const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { isCustomer } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateCsrf } = require('../middleware/csrf');
const { uploadProfileImage, uploadProductImages, withUpload } = require('../middleware/upload');

router.use(isCustomer);

router.get('/', requirePermission('view_dashboard'), customerController.getDashboard);
router.get('/orders', requirePermission('view_own_orders'), customerController.getOrders);
router.get('/orders/:id', requirePermission('view_own_orders'), customerController.getOrderDetail);
router.get('/repairs', requirePermission('view_own_repairs'), customerController.getRepairs);
router.get('/repairs/:id', requirePermission('view_own_repairs'), customerController.getRepairDetail);
router.get('/training', requirePermission('buy_products'), customerController.getTraining);
router.get('/profile', requirePermission('manage_profile'), customerController.getProfile);
router.post('/profile',
  requirePermission('manage_profile'),
  withUpload(uploadProfileImage.single('avatar')),
  validateCsrf,
  customerController.updateProfile
);
router.get('/wishlist', requirePermission('buy_products'), customerController.getWishlist);
router.post('/wishlist/add', requirePermission('buy_products'), validateCsrf, customerController.addToWishlist);
router.post('/wishlist/remove', requirePermission('buy_products'), validateCsrf, customerController.removeFromWishlist);
router.get('/reviews', requirePermission('manage_reviews'), customerController.getReviews);
router.get('/reviews/:id/edit', requirePermission('manage_reviews'), customerController.getEditReview);
router.post('/reviews/:id/edit',
  requirePermission('manage_reviews'),
  withUpload(uploadProductImages.array('images', 5)),
  validateCsrf,
  customerController.updateReview
);
router.post('/reviews/:id/delete', requirePermission('manage_reviews'), validateCsrf, customerController.deleteReview);
router.get('/messages', requirePermission('manage_messages'), customerController.getMessages);

module.exports = router;
