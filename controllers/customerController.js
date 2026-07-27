const UserModel = require('../models/UserModel');
const OrderModel = require('../models/OrderModel');
const RepairModel = require('../models/RepairModel');
const CourseModel = require('../models/CourseModel');
const pool = require('../config/db');
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
      title: 'Your Account Dashboard - Athstack',
      orders: orders.orders || orders,
      bookings,
      courses: enrollments,
      totalSpent: formatCurrency(totalSpent),
      orderCount: orders.total || orders.length,
      bookingCount: bookings.length,
      courseCount: enrollments.length
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const result = await OrderModel.getByUser(req.session.userId);
    res.render('dashboard/orders', {
      title: 'Order History - Athstack',
      orders: result.orders || result,
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
      `SELECT rr.*, s.title AS service_title
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       WHERE rr.user_id = ?
       ORDER BY rr.created_at DESC`,
      [req.session.userId]
    );

    res.render('dashboard/repairs', {
      title: 'Repair History - Athstack',
      bookings,
      formatDate,
      getStatusBadgeClass
    });
  } catch (err) {
    next(err);
  }
};

exports.getTraining = async (req, res, next) => {
  try {
    const enrollments = await CourseModel.getEnrollments(req.session.userId);

    res.render('dashboard/training', {
      title: 'Enrolled Courses - Athstack',
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
      title: 'Your Profile - Athstack',
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

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/dashboard/profile');
  } catch (err) {
    next(err);
  }
};

exports.getWishlist = async (req, res, next) => {
  try {
    res.render('dashboard/wishlist', {
      title: 'Your Wishlist - Athstack',
      wishlist: []
    });
  } catch (err) {
    next(err);
  }
};
