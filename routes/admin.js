const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { createProductValidator } = require('../validators/productValidators');
const { uploadProductImages, handleUploadError } = require('../middleware/upload');

router.use(isAdmin);

router.get('/', adminController.getDashboard);

router.get('/users', adminController.getUsers);
router.post('/users/:id/role', validateCsrf, adminController.updateUserRole);
router.post('/users/:id/status', validateCsrf, adminController.updateUserStatus);

router.get('/products', adminController.getProducts);
router.post('/products/:id/status', validateCsrf, adminController.toggleProductStatus);

router.get('/repairs', adminController.getRepairs);
router.post('/repairs/:id/assign', validateCsrf, adminController.assignTechnician);

router.get('/orders', adminController.getOrders);
router.post('/orders/:id/status', validateCsrf, adminController.updateOrderStatus);

router.get('/training', adminController.getCourses);
router.post('/training/add',
  validateCsrf,
  uploadProductImages.single('course_image'),
  handleUploadError,
  adminController.createCourse
);
router.post('/training/edit/:id', validateCsrf, adminController.updateCourse);
router.post('/training/delete/:id', validateCsrf, adminController.deleteCourse);

router.get('/inbox', adminController.getInbox);
router.post('/inbox/:id/read', validateCsrf, adminController.markAsRead);

router.get('/settings', adminController.getSettings);
router.post('/settings', validateCsrf, adminController.updateSettings);

module.exports = router;
