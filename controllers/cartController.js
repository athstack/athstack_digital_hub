const ProductModel = require('../models/ProductModel');
const OrderModel = require('../models/OrderModel');
const NotificationModel = require('../models/NotificationModel');
const { pool } = require('../config/db');
const { formatCurrency } = require('../utils/helpers');

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
      title: 'Your Shopping Cart - TechBridge Digital Hub',
      cart: req.session.cart || {},
      cartItems,
      cartTotal,
      formatCurrency
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
    const productId = parseInt(req.params.productId);
    const cart = req.session.cart || {};

    if (!productId || !cart[productId]) {
      req.flash('error', 'Item not found in cart.');
      return res.redirect('/cart');
    }

    delete cart[productId];
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
    const items = [];
    for (const product of products) {
      const quantity = cart[product.id] || 1;
      if (quantity > product.stock_quantity) {
        req.flash('error', `Insufficient stock for "${product.name}". Only ${product.stock_quantity} available.`);
        return res.redirect('/cart');
      }
      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;
      items.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.main_image || null,
        quantity,
        unit_price: product.price,
        total_price: itemTotal
      });
    }

    const order = await OrderModel.create(req.session.userId, {
      total_amount: totalAmount,
      items
    });

    req.session.cart = {};

    await NotificationModel.create(req.session.userId, {
      title: 'Order Placed',
      message: `Your order #${order.id} for ${formatCurrency(totalAmount)} has been placed successfully.`,
      type: 'order',
      link: `/dashboard/orders/${order.id}`
    });

    NotificationModel.notifyAdmins({
      title: 'New Order Received',
      message: `Order #${order.id} for ${formatCurrency(totalAmount)} needs processing.`,
      type: 'order',
      link: '/admin/orders'
    }).catch(() => {});

    req.flash('success', `Order #${order.id} placed successfully!`);
    res.redirect('/dashboard/orders');
  } catch (err) {
    next(err);
  }
};
