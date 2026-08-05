const ProductModel = require('../models/ProductModel');
const OrderModel = require('../models/OrderModel');
const NotificationModel = require('../models/NotificationModel');
const { pool } = require('../config/db');
const { formatCurrency } = require('../utils/currency');

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
      title: req.t('cart:title.index'),
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
      req.flash('error', req.t('cart:flash.invalidProduct'));
      return res.redirect('/shop');
    }

    const product = await ProductModel.findById(productId);
    if (!product || product.status !== 'active') {
      req.flash('error', req.t('cart:flash.productNotFound'));
      return res.redirect('/shop');
    }

    if (!req.session.cart) req.session.cart = {};
    req.session.cart[productId] = (req.session.cart[productId] || 0) + quantity;

    req.flash('success', req.t('cart:flash.itemAdded'));
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
      req.flash('error', req.t('cart:flash.itemNotFound'));
      return res.redirect('/cart');
    }

    if (quantity <= 0) {
      delete req.session.cart[productId];
    } else {
      req.session.cart[productId] = quantity;
    }

    req.flash('success', req.t('cart:flash.cartUpdated'));
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
      req.flash('error', req.t('cart:flash.itemNotFound'));
      return res.redirect('/cart');
    }

    delete cart[productId];
    req.session.cart = cart;

    req.flash('success', req.t('cart:flash.itemRemoved'));
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
      req.flash('error', req.t('cart:flash.emptyCart'));
      return res.redirect('/cart');
    }

    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await pool.execute(
      `SELECT * FROM products WHERE id IN (${placeholders}) AND status = 'active'`,
      productIds
    );

    if (products.length === 0) {
      req.flash('error', req.t('cart:flash.noValidProducts'));
      return res.redirect('/cart');
    }

    let totalAmount = 0;
    const items = [];
    for (const product of products) {
      const quantity = cart[product.id] || 1;
      if (quantity > product.stock_quantity) {
        req.flash('error', req.t('cart:flash.insufficientStock', { name: product.name, stock: product.stock_quantity }));
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
      title: req.t('cart:notification.orderPlacedTitle'),
      message: req.t('cart:notification.orderPlacedMessage', { id: order.id, total: formatCurrency(totalAmount, req.currency) }),
      type: 'order',
      link: `/dashboard/orders/${order.id}`
    });

    NotificationModel.notifyAdmins({
      title: req.t('cart:notification.newOrderTitle'),
      message: req.t('cart:notification.newOrderMessage', { id: order.id, total: formatCurrency(totalAmount, req.currency) }),
      type: 'order',
      link: '/admin/orders'
    }).catch(() => {});

    req.flash('success', req.t('cart:flash.orderPlaced', { id: order.id }));
    res.redirect('/dashboard/orders');
  } catch (err) {
    next(err);
  }
};
