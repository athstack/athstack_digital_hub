const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');
const { isActive } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { createProductValidator } = require('../validators/productValidators');
const { uploadProductImages, withUpload } = require('../middleware/upload');

router.use(isAdmin);

router.get('/', adminController.getDashboard);

router.get('/users', adminController.getUsers);
router.get('/users/new', adminController.getCreateUser);
router.post('/users', validateCsrf, adminController.createUser);
router.get('/users/:id/edit', adminController.getEditUser);
router.post('/users/:id', validateCsrf, adminController.updateUser);
router.post('/users/:id/delete', validateCsrf, adminController.deleteUser);
router.post('/users/:id/role', validateCsrf, adminController.updateUserRole);
router.post('/users/:id/status', validateCsrf, adminController.updateUserStatus);

router.get('/products', adminController.getProducts);
router.get('/products/new', adminController.getAddProduct);
router.post('/products/new',
  withUpload(uploadProductImages.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 8 }
  ])),
  isActive,
  validateCsrf,
  adminController.createProduct
);
router.get('/products/edit/:id', adminController.getEditProduct);
router.post('/products/edit/:id',
  withUpload(uploadProductImages.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 8 }
  ])),
  isActive,
  validateCsrf,
  adminController.updateProduct
);
router.post('/products/delete/:id', isActive, validateCsrf, adminController.deleteProduct);
router.post('/products/:id/status', validateCsrf, adminController.toggleProductStatus);

router.get('/repairs', adminController.getRepairs);
router.post('/repairs/:id/assign', validateCsrf, adminController.assignTechnician);

router.get('/orders', adminController.getOrders);
router.post('/orders/:id/status', validateCsrf, adminController.updateOrderStatus);

router.get('/training', adminController.getCourses);
router.post('/training/add',
  withUpload(uploadProductImages.single('course_image')),
  validateCsrf,
  adminController.createCourse
);
router.post('/training/edit/:id', validateCsrf, adminController.updateCourse);
router.post('/training/delete/:id', validateCsrf, adminController.deleteCourse);

router.get('/inbox', adminController.getInbox);
router.post('/inbox/:id/read', validateCsrf, adminController.markAsRead);
router.post('/inbox/:id/delete', validateCsrf, adminController.deleteMessage);
router.post('/inbox/:id/reply', validateCsrf, adminController.replyToMessage);

router.get('/settings', adminController.getSettings);
router.post('/settings', validateCsrf, adminController.updateSettings);

router.get('/services', adminController.getServices);
router.post('/services/add', validateCsrf, adminController.createService);
router.post('/services/edit/:id', validateCsrf, adminController.updateService);
router.post('/services/delete/:id', validateCsrf, adminController.deleteService);

router.get('/analytics', adminController.getAnalytics);

router.get('/reviews', adminController.getReviews);
router.get('/reviews/:id/edit', adminController.getEditReview);
router.post('/reviews/:id/edit', validateCsrf, adminController.updateReview);
router.post('/reviews/add', validateCsrf, adminController.createReview);
router.post('/reviews/:id/approve', validateCsrf, adminController.approveReview);
router.post('/reviews/:id/reject', validateCsrf, adminController.rejectReview);
router.post('/reviews/:id/reply', validateCsrf, adminController.replyToReview);
router.post('/reviews/:id/hide', validateCsrf, adminController.toggleReviewHidden);
router.post('/reviews/:id/delete', validateCsrf, adminController.deleteReview);
router.post('/reports/:id/resolve', validateCsrf, adminController.resolveReviewReport);

module.exports = router;
