const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const { isTechnician } = require('../middleware/auth');
const { isActive } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { uploadProductImages, withUpload } = require('../middleware/upload');

router.use(isTechnician);

router.get('/', technicianController.getDashboard);
router.get('/products', technicianController.getProducts);
router.get('/products/add', technicianController.getAddProduct);
router.post('/products/add',
  withUpload(uploadProductImages.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 8 }
  ])),
  isActive,
  validateCsrf,
  technicianController.createProduct
);
router.get('/products/edit/:id', technicianController.getEditProduct);
router.post('/products/edit/:id',
  withUpload(uploadProductImages.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 8 }
  ])),
  isActive,
  validateCsrf,
  technicianController.updateProduct
);
router.post('/products/delete/:id', isActive, validateCsrf, technicianController.deleteProduct);
router.post('/products/:id/status', validateCsrf, technicianController.toggleProductStatus);
router.get('/repairs', technicianController.getRepairs);
router.post('/repairs/:id/status', validateCsrf, technicianController.updateRepairStatus);
router.get('/orders', technicianController.getOrders);

module.exports = router;
