const express = require('express');
const router = express.Router();
const { validateCsrf } = require('../middleware/csrf');

router.get('/', (req, res) => {
  const cart = req.session.cart || {};
  res.render('cart/index', {
    title: 'Your Shopping Cart - Athstack',
    cart
  });
});

router.post('/add', validateCsrf, (req, res) => {
  const productId = parseInt(req.body.product_id);
  if (productId > 0) {
    if (!req.session.cart) req.session.cart = {};
    req.session.cart[productId] = (req.session.cart[productId] || 0) + 1;
  }
  res.redirect('/shop');
});

module.exports = router;
