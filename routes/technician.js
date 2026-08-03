const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const { isTechnician, isActive } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateCsrf } = require('../middleware/csrf');
const { uploadProductImages, withUpload, uploadProfileImage } = require('../middleware/upload');

router.use(isTechnician);

// Products (viewing/creating/editing own products)
const productModulePermission = requirePermission('create_products', 'edit_own_products', 'delete_own_products');

router.get('/', requirePermission('view_dashboard'), technicianController.getDashboard);
router.get('/products', productModulePermission, technicianController.getProducts);
router.get('/products/add', requirePermission('create_products'), technicianController.getAddProduct);
router.post('/products/add',
  requirePermission('create_products'),
  withUpload(uploadProductImages.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 8 }
  ])),
  isActive,
  validateCsrf,
  technicianController.createProduct
);
router.get('/products/edit/:id', requirePermission('edit_own_products'), technicianController.getEditProduct);
router.post('/products/edit/:id',
  requirePermission('edit_own_products'),
  withUpload(uploadProductImages.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 8 }
  ])),
  isActive,
  validateCsrf,
  technicianController.updateProduct
);
router.post('/products/delete/:id', requirePermission('delete_own_products'), isActive, validateCsrf, technicianController.deleteProduct);
router.post('/products/:id/status', requirePermission('edit_own_products'), validateCsrf, technicianController.toggleProductStatus);

// Repairs (scoped to repairs assigned to the technician)
router.get('/repairs', requirePermission('manage_repairs'), technicianController.getRepairs);
router.get('/appointments', requirePermission('manage_repairs'), technicianController.getRepairs);
router.get('/repair-history', requirePermission('manage_repairs'), technicianController.getRepairHistory);
router.post('/repairs/:id/status', requirePermission('manage_repairs'), validateCsrf, technicianController.updateRepairStatus);

// Orders (own sales)
router.get('/orders', requirePermission('view_own_orders'), technicianController.getOrders);

// Reports (own sales/performance)
router.get('/reports', requirePermission('view_own_orders'), technicianController.getReports);

// Messages
router.get('/messages', requirePermission('manage_messages'), technicianController.getMessages);
router.post('/messages/:id/read', requirePermission('manage_messages'), validateCsrf, technicianController.markMessageRead);

// Profile
router.get('/profile', requirePermission('manage_profile'), technicianController.getProfile);
router.post('/profile',
  requirePermission('manage_profile'),
  withUpload(uploadProfileImage.single('avatar')),
  validateCsrf,
  technicianController.updateProfile
);

module.exports = router;
