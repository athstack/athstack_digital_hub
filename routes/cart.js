const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { isAuthenticated, isActive } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { validateCsrf } = require('../middleware/csrf');

// Viewing the cart is public; mutating it requires buy_products permission.
router.get('/', cartController.getCart);
router.post('/add', requirePermission('buy_products'), isActive, validateCsrf, cartController.addItem);
router.post('/update', requirePermission('buy_products'), isActive, validateCsrf, cartController.updateItem);
router.post('/remove/:productId', requirePermission('buy_products'), isActive, validateCsrf, cartController.removeItem);
router.post('/checkout', requirePermission('buy_products'), isActive, validateCsrf, cartController.checkout);

module.exports = router;
