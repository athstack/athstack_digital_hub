const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated } = require('../middleware/auth');
const { isActive } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');

router.get('/', cartController.getCart);
router.post('/add', validateCsrf, isActive, cartController.addItem);
router.post('/update', validateCsrf, isActive, cartController.updateItem);
router.post('/remove/:index', validateCsrf, isActive, cartController.removeItem);
router.post('/checkout', isAuthenticated, isActive, validateCsrf, cartController.checkout);

module.exports = router;
