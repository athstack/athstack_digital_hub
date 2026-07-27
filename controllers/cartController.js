const ProductModel = require('../models/ProductModel');
const OrderModel = require('../models/OrderModel');
const { pool } = require('../config/db');

exports.getCart = async (req, res, next) => {
  try {
    const cart = req.session.cart || {};
    const productIds = Object.keys(cart).map(Number);

    let cartItems = [];
    let cartTotal = 0;

    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const [rows] = await pool.execute(
        `SELECT * FROM products WHERE id IN (${placeholders}) AND status = 'active'`,
        productIds
      );

      cartItems = rows.map(product => {
        const quantity = cart[product.id] || 1;
        const subtotal = product.price * quantity;
        cartTotal += subtotal;
        return { ...product, quantity, subtotal };
      });
    }

    res.render('cart/index', {
      title: 'Your Shopping Cart - Athstack',
      cart: req.session.cart || {},
      cartItems,
      cartTotal
    });
  } catch (err) {
    next(err);
  }
};

exports.addItem = async (req, res, next) => {
  try {
    const productId = parseInt(req.body.product_id);
    const quantity = parseInt(req.body.quantity) || 1;

    if (!productId || productId <= 0) {
      req.flash('error', 'Invalid product.');
      return res.redirect('/shop');
    }

    const product = await ProductModel.findById(productId);
    if (!product || product.status !== 'active') {
      req.flash('error', 'Product not found or unavailable.');
      return res.redirect('/shop');
    }

    if (!req.session.cart) req.session.cart = {};
    req.session.cart[productId] = (req.session.cart[productId] || 0) + quantity;

    req.flash('success', 'Item added to cart.');
    res.redirect(req.get('Referrer') || '/shop');
  } catch (err) {
    next(err);
  }
};

exports.updateItem = (req, res, next) => {
  try {
    const productId = parseInt(req.body.product_id);
    const quantity = parseInt(req.body.quantity);

    if (!productId || !req.session.cart || !req.session.cart[productId]) {
      req.flash('error', 'Item not found in cart.');
      return res.redirect('/cart');
    }

    if (quantity <= 0) {
      delete req.session.cart[productId];
    } else {
      req.session.cart[productId] = quantity;
    }

    req.flash('success', 'Cart updated.');
    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
};

exports.removeItem = (req, res, next) => {
  try {
    const index = parseInt(req.params.index);
    const cart = req.session.cart || {};
    const keys = Object.keys(cart);

    if (index < 0 || index >= keys.length) {
      req.flash('error', 'Item not found in cart.');
      return res.redirect('/cart');
    }

    delete cart[keys[index]];
    req.session.cart = cart;

    req.flash('success', 'Item removed from cart.');
    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    const cart = req.session.cart || {};
    const productIds = Object.keys(cart).map(Number);

    if (productIds.length === 0) {
      req.flash('error', 'Your cart is empty.');
      return res.redirect('/cart');
    }

    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await pool.execute(
      `SELECT * FROM products WHERE id IN (${placeholders}) AND status = 'active'`,
      productIds
    );

    if (products.length === 0) {
      req.flash('error', 'No valid products in cart.');
      return res.redirect('/cart');
    }

    let totalAmount = 0;
    const orderItems = products.map(product => {
      const quantity = cart[product.id] || 1;
      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;
      return { product_id: product.id, quantity, price: product.price, name: product.name };
    });

    const [orderResult] = await pool.execute(
      'INSERT INTO orders (user_id, total_amount, order_status, created_at) VALUES (?, ?, ?, NOW())',
      [req.session.userId, totalAmount, 'pending']
    );

    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await pool.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      await pool.execute(
        'UPDATE products SET stock_quantity = GREATEST(stock_quantity - ?, 0) WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    req.session.cart = {};

    req.flash('success', `Order #${orderId} placed successfully!`);
    res.redirect('/dashboard/orders');
  } catch (err) {
    next(err);
  }
};
