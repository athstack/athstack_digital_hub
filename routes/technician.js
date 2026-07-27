const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const { isTechnician } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { uploadProductImages, handleUploadError } = require('../middleware/upload');

router.use(isTechnician);

router.get('/', technicianController.getDashboard);
router.get('/products', technicianController.getProducts);
router.get('/products/add', technicianController.getAddProduct);
router.post('/products/add',
  validateCsrf,
  uploadProductImages.single('product_image'),
  handleUploadError,
  technicianController.createProduct
);
router.get('/products/edit/:id', technicianController.getEditProduct);
router.post('/products/edit/:id',
  validateCsrf,
  uploadProductImages.single('product_image'),
  handleUploadError,
  technicianController.updateProduct
);
router.post('/products/delete/:id', validateCsrf, technicianController.deleteProduct);
router.get('/repairs', technicianController.getRepairs);
router.post('/repairs/:id/status', validateCsrf, technicianController.updateRepairStatus);
router.get('/orders', technicianController.getOrders);

module.exports = router;
