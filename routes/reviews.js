const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { validateCsrf } = require('../middleware/csrf');
const { isCustomer } = require('../middleware/auth');

router.post('/product/:productId', validateCsrf, isCustomer, reviewController.submitProductReview);
router.post('/technician/:techId', validateCsrf, isCustomer, reviewController.submitTechReview);
router.post('/service/:repairId', validateCsrf, isCustomer, reviewController.submitServiceReview);

module.exports = router;
