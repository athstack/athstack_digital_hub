const UserModel = require('../models/UserModel');
const OrderModel = require('../models/OrderModel');
const RepairModel = require('../models/RepairModel');
const CourseModel = require('../models/CourseModel');
const WishlistModel = require('../models/WishlistModel');
const ReviewModel = require('../models/ReviewModel');
const ContactModel = require('../models/ContactModel');
const { pool } = require('../config/db');
const { formatDate, formatCurrency, getStatusBadgeClass } = require('../utils/helpers');

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const orders = await OrderModel.getByUser(userId);

    const [bookings] = await pool.execute(
      'SELECT rr.*, s.title AS service_title FROM repair_requests rr LEFT JOIN services s ON rr.service_id = s.id WHERE rr.user_id = ? ORDER BY rr.created_at DESC',
      [userId]
    );

    const enrollments = await CourseModel.getEnrollments(userId);

    const totalSpent = orders.orders ? orders.orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) : 0;

    res.render('dashboard/index', {
      title: 'Your Account Dashboard - TechBridge Digital Hub',
      orders: orders.orders || orders,
      bookings,
      courses: enrollments,
      totalSpent: formatCurrency(totalSpent),
      orderCount: (orders.orders || []).length,
      bookingCount: bookings.length,
      courseCount: enrollments.length,
      formatCurrency
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const result = await OrderModel.getByUser(req.session.userId);
    res.render('dashboard/orders', {
      title: 'Order History - TechBridge Digital Hub',
      orders: result.orders || result,
      formatDate,
      formatCurrency,
      getStatusBadgeClass
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrderDetail = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await OrderModel.findById(orderId);

    if (!order || order.user_id !== req.session.userId) {
      req.flash('error', 'Order not found.');
      return res.redirect('/dashboard/orders');
    }

    res.render('dashboard/order-detail', {
      title: 'Order Details - TechBridge Digital Hub',
      order,
      formatDate,
      formatCurrency,
      getStatusBadgeClass
    });
  } catch (err) {
    next(err);
  }
};

exports.getRepairs = async (req, res, next) => {
  try {
    const [bookings] = await pool.execute(
      `SELECT rr.*, s.title AS service_title,
              u.first_name AS technician_first_name, u.last_name AS technician_last_name
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       LEFT JOIN users u ON rr.technician_id = u.id
       WHERE rr.user_id = ?
       ORDER BY rr.created_at DESC`,
      [req.session.userId]
    );

    res.render('dashboard/repairs', {
      title: 'Repair History - TechBridge Digital Hub',
      bookings,
      formatDate,
      getStatusBadgeClass
    });
  } catch (err) {
    next(err);
  }
};

exports.getRepairDetail = async (req, res, next) => {
  try {
    const RepairModel = require('../models/RepairModel');
    const repairId = parseInt(req.params.id);
    const repair = await RepairModel.findById(repairId);

    if (!repair || repair.user_id !== req.session.userId) {
      req.flash('error', 'Repair request not found.');
      return res.redirect('/dashboard/repairs');
    }

    res.render('dashboard/repair-detail', {
      title: 'Repair Details - TechBridge Digital Hub',
      repair,
      formatDate,
      getStatusBadgeClass,
      formatCurrency
    });
  } catch (err) {
    next(err);
  }
};

exports.getTraining = async (req, res, next) => {
  try {
    const enrollments = await CourseModel.getEnrollments(req.session.userId);

    res.render('dashboard/training', {
      title: 'Enrolled Courses - TechBridge Digital Hub',
      courses: enrollments
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.session.userId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/dashboard');
    }

    res.render('dashboard/profile', {
      title: 'Your Profile - TechBridge Digital Hub',
      profile: user
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { first_name, last_name, email, phone } = req.body;

    if (!first_name || !last_name || !email) {
      req.flash('error', 'First name, last name, and email are required.');
      return res.redirect('/dashboard/profile');
    }

    const user = await UserModel.findById(userId);
    const avatar = req.file ? req.file.filename : (user.avatar || null);

    await UserModel.updateProfile(userId, {
      first_name,
      last_name,
      email,
      phone: phone || null,
      avatar
    });

    req.session.userName = `${first_name} ${last_name}`;
    req.session.userEmail = email;
    req.session.userAvatar = avatar;
    req.session.userFirstName = first_name;
    req.session.userLastName = last_name;

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/dashboard/profile');
  } catch (err) {
    next(err);
  }
};

exports.getWishlist = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const result = await WishlistModel.getByUser(req.session.userId, page, 12);
    res.render('dashboard/wishlist', {
      title: 'Your Wishlist - TechBridge Digital Hub',
      wishlist: result.items,
      pagination: { page: result.page, total: result.total, totalPages: Math.ceil(result.total / result.limit), hasNext: result.page < Math.ceil(result.total / result.limit), hasPrev: result.page > 1 },
      formatCurrency
    });
  } catch (err) {
    next(err);
  }
};

exports.addToWishlist = async (req, res, next) => {
  try {
    const productId = parseInt(req.body.product_id);
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (!productId) {
      if (isAjax) return res.status(400).json({ success: false, message: 'Product ID required.' });
      req.flash('error', 'Invalid product.');
      return res.redirect('back');
    }
    await WishlistModel.add(req.session.userId, productId);
    if (isAjax) return res.json({ success: true, message: 'Added to wishlist.' });
    req.flash('success', 'Added to your wishlist.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};

exports.removeFromWishlist = async (req, res, next) => {
  try {
    const productId = parseInt(req.body.product_id);
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    await WishlistModel.remove(req.session.userId, productId);
    if (isAjax) return res.json({ success: true, message: 'Removed from wishlist.' });
    req.flash('success', 'Removed from wishlist.');
    res.redirect('/dashboard/wishlist');
  } catch (err) {
    next(err);
  }
};

exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await ReviewModel.getByUser(req.session.userId);
    res.render('dashboard/reviews', {
      title: 'Your Reviews - TechBridge Digital Hub',
      reviews,
      formatDate,
      formatCurrency
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const reviewId = parseInt(req.params.id);
    await ReviewModel.delete(reviewId);
    req.flash('success', 'Review deleted.');
    res.redirect('/dashboard/reviews');
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const result = await ContactModel.getByUserId(userId, page, limit);
    res.render('dashboard/messages', {
      title: 'My Messages - TechBridge Digital Hub',
      messages: result.messages,
      total: result.total,
      page: result.page,
      limit: result.limit,
      formatDate
    });
  } catch (err) {
    next(err);
  }
};
