const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { validateCsrf } = require('../middleware/csrf');
const { isCustomer } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { uploadProductImages, withUpload } = require('../middleware/upload');

router.post('/product/:productId',
  withUpload(uploadProductImages.array('images', 5)),
  validateCsrf,
  isCustomer,
  requirePermission('manage_reviews'),
  reviewController.submitProductReview
);
router.post('/product/:productId/edit/:reviewId',
  withUpload(uploadProductImages.array('images', 5)),
  validateCsrf,
  isCustomer,
  requirePermission('manage_reviews'),
  reviewController.editProductReview
);
router.post('/technician/:techId', validateCsrf, isCustomer, requirePermission('manage_reviews'), reviewController.submitTechReview);
router.post('/service/:repairId', validateCsrf, isCustomer, requirePermission('manage_reviews'), reviewController.submitServiceReview);

module.exports = router;
