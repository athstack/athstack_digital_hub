const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

router.get('/', shopController.getShop);
router.get('/:slug', shopController.getProduct);
router.get('/debug/reviews', shopController.debugReviews);

module.exports = router;
