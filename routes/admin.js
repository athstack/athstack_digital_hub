const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin, isActive } = require('../middleware/auth');
const { requirePermission, requireAllPermissions } = require('../middleware/rbac');
const { validateCsrf } = require('../middleware/csrf');
const { createProductValidator } = require('../validators/productValidators');
const { uploadProductImages, withUpload } = require('../middleware/upload');

// Namespace guard: only admin / super_admin reach /admin/*. Every individual
// route below is additionally authorized with requirePermission(...).
router.use(isAdmin);

// -- Dashboard ---------------------------------------------------------------
router.get('/', requirePermission('view_dashboard'), adminController.getDashboard);

// -- User management ----------------------------------------------------------
router.get('/users', requirePermission('manage_users'), adminController.getUsers);
router.get('/users/new', requirePermission('manage_users'), adminController.getCreateUser);
router.post('/users', requirePermission('manage_users'), validateCsrf, adminController.createUser);
router.get('/users/:id/edit', requirePermission('manage_users'), adminController.getEditUser);
router.get('/users/:id', requirePermission('manage_users'), adminController.getEditUser);
router.post('/users/:id', requirePermission('manage_users'), validateCsrf, adminController.updateUser);
router.post('/users/:id/delete', requirePermission('manage_users'), validateCsrf, adminController.deleteUser);
// Role assignment requires role management rights (super admin only).
router.post('/users/:id/role', requirePermission('manage_roles'), validateCsrf, adminController.updateUserRole);
router.post('/users/:id/status', requirePermission('manage_users'), validateCsrf, adminController.updateUserStatus);

// -- Products -----------------------------------------------------------------
router.get('/products', requirePermission('manage_products'), adminController.getProducts);
router.get('/products/new', requirePermission('manage_products'), adminController.getAddProduct);
router.post('/products/new',
  requirePermission('manage_products'),
  withUpload(uploadProductImages.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 8 }
  ])),
  isActive,
  validateCsrf,
  adminController.createProduct
);
router.get('/products/edit/:id', requirePermission('manage_products'), adminController.getEditProduct);
router.get('/products/:id', requirePermission('manage_products'), adminController.getEditProduct);
router.post('/products/edit/:id',
  requirePermission('manage_products'),
  withUpload(uploadProductImages.fields([
    { name: 'product_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 8 }
  ])),
  isActive,
  validateCsrf,
  adminController.updateProduct
);
router.post('/products/delete/:id', requirePermission('manage_products'), isActive, validateCsrf, adminController.deleteProduct);
router.post('/products/:id/status', requirePermission('manage_products'), validateCsrf, adminController.toggleProductStatus);

// -- Repairs -------------------------------------------------------------------
router.get('/repairs', requirePermission('manage_repairs'), adminController.getRepairs);
router.get('/repairs/:id', requirePermission('manage_repairs'), adminController.getRepairDetail);
router.post('/repairs/:id/assign', requirePermission('assign_repairs'), validateCsrf, adminController.assignTechnician);

// -- Orders ---------------------------------------------------------------------
router.get('/orders', requirePermission('manage_orders'), adminController.getOrders);
router.get('/orders/:id', requirePermission('manage_orders'), adminController.getOrderDetail);
router.post('/orders/:id/status', requirePermission('manage_orders'), validateCsrf, adminController.updateOrderStatus);

// -- Training ---------------------------------------------------------------------
router.get('/training', requirePermission('manage_training'), adminController.getCourses);
router.get('/training/:id', requirePermission('manage_training'), adminController.getCourseDetail);
router.post('/training/:id/status', requirePermission('manage_training'), validateCsrf, adminController.updateCourseStatus);
router.post('/training/add',
  requirePermission('manage_training'),
  withUpload(uploadProductImages.single('course_image')),
  validateCsrf,
  adminController.createCourse
);
router.post('/training/edit/:id',
  requirePermission('manage_training'),
  withUpload(uploadProductImages.single('course_image')),
  validateCsrf,
  adminController.updateCourse);
router.post('/training/delete/:id', requirePermission('manage_training'), validateCsrf, adminController.deleteCourse);

// -- Support inbox ---------------------------------------------------------------
router.get('/inbox', requirePermission('manage_support'), adminController.getInbox);
router.post('/inbox/:id/read', requirePermission('manage_support'), validateCsrf, adminController.markAsRead);
router.post('/inbox/:id/delete', requirePermission('manage_support'), validateCsrf, adminController.deleteMessage);
router.post('/inbox/:id/reply', requirePermission('manage_support'), validateCsrf, adminController.replyToMessage);

// -- Settings --------------------------------------------------------------------
router.get('/settings', requirePermission('manage_settings'), adminController.getSettings);
router.post('/settings', requirePermission('manage_settings'), validateCsrf, adminController.updateSettings);

// -- Services ---------------------------------------------------------------------
router.get('/services', requirePermission('manage_services'), adminController.getServices);
router.post('/services/add', requirePermission('manage_services'), validateCsrf, adminController.createService);
router.post('/services/edit/:id', requirePermission('manage_services'), validateCsrf, adminController.updateService);
router.post('/services/delete/:id', requirePermission('manage_services'), validateCsrf, adminController.deleteService);

// -- Analytics & reports ------------------------------------------------------------
router.get('/analytics', requirePermission('view_business_reports'), adminController.getAnalytics);

// -- Reviews -------------------------------------------------------------------------
router.get('/reviews', requirePermission('manage_reviews'), adminController.getReviews);
router.get('/reviews/:id/edit', requirePermission('manage_reviews'), adminController.getEditReview);
router.post('/reviews/:id/edit', requirePermission('manage_reviews'), validateCsrf, adminController.updateReview);
router.post('/reviews/add', requirePermission('manage_reviews'), validateCsrf, adminController.createReview);
router.post('/reviews/:id/approve', requirePermission('manage_reviews'), validateCsrf, adminController.approveReview);
router.post('/reviews/:id/reject', requirePermission('manage_reviews'), validateCsrf, adminController.rejectReview);
router.post('/reviews/:id/reply', requirePermission('manage_reviews'), validateCsrf, adminController.replyToReview);
router.post('/reviews/:id/hide', requirePermission('manage_reviews'), validateCsrf, adminController.toggleReviewHidden);
router.post('/reviews/:id/delete', requirePermission('manage_reviews'), validateCsrf, adminController.deleteReview);
router.post('/reports/:id/resolve', requirePermission('manage_reviews'), validateCsrf, adminController.resolveReviewReport);

// -- Marketing officer management (super admin only: role + permission mgmt) ------------
router.get('/marketing-officers', requireAllPermissions('manage_roles', 'manage_permissions'), adminController.getMarketingOfficers);
router.get('/marketing-officers/new', requireAllPermissions('manage_roles', 'manage_permissions'), adminController.getCreateMarketingOfficer);
router.post('/marketing-officers', requireAllPermissions('manage_roles', 'manage_permissions'), validateCsrf, adminController.createMarketingOfficer);
router.get('/marketing-officers/:id/edit', requireAllPermissions('manage_roles', 'manage_permissions'), adminController.getEditMarketingOfficer);
router.post('/marketing-officers/:id', requireAllPermissions('manage_roles', 'manage_permissions'), validateCsrf, adminController.updateMarketingOfficer);
router.post('/marketing-officers/:id/status', requireAllPermissions('manage_roles', 'manage_permissions'), validateCsrf, adminController.updateMarketingOfficerStatus);
router.post('/marketing-officers/:id/reset-password', requireAllPermissions('manage_roles', 'manage_permissions'), validateCsrf, adminController.resetMarketingOfficerPassword);
router.get('/marketing-officers/:id/permissions', requireAllPermissions('manage_roles', 'manage_permissions'), adminController.getMarketingOfficerPermissions);
router.post('/marketing-officers/:id/permissions', requireAllPermissions('manage_roles', 'manage_permissions'), validateCsrf, adminController.updateMarketingOfficerPermissions);

// -- Role management (super admin only) ----------------------------------------------
router.get('/roles', requirePermission('manage_roles'), adminController.getRoles);
router.post('/roles/:role/permissions', requirePermission('manage_roles'), validateCsrf, adminController.updateRolePermissions);

// -- Permission management (super admin only) -------------------------------------------
router.get('/permissions', requirePermission('manage_permissions'), adminController.getPermissions);
router.post('/permissions/add', requirePermission('manage_permissions'), validateCsrf, adminController.addPermission);

// -- System / audit logs (super admin only) ------------------------------------------------
router.get('/activity-logs', requirePermission('view_system_reports'), adminController.getActivityLogs);

module.exports = router;
