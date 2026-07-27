const express = require('express');
const router = express.Router();
const UserModel = require('../models/UserModel');
const OrderModel = require('../models/OrderModel');
const MaintenanceModel = require('../models/MaintenanceModel');
const CourseModel = require('../models/CourseModel');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const orders = await OrderModel.getUserOrders(userId);
    const bookings = await MaintenanceModel.getAllBookings();
    const courses = await UserModel.getRegisteredCourses(userId);

    const userBookings = bookings.filter(b => b.user_id == userId);
    res.render('user/dashboard', { title: 'Your Account Dashboard - Athstack', orders, bookings: userBookings, courses });
  } catch (err) {
    console.error(err);
    res.render('user/dashboard', { title: 'Your Account Dashboard - Athstack', orders: [], bookings: [], courses: [] });
  }
});

router.get('/orderHistory', isAuthenticated, async (req, res) => {
  try {
    const orders = await OrderModel.getUserOrders(req.session.userId);
    res.render('user/orders', { title: 'Order History - Athstack', orders });
  } catch (err) {
    console.error(err);
    res.render('user/orders', { title: 'Order History - Athstack', orders: [] });
  }
});

router.get('/adminUsers', isAdmin, async (req, res) => {
  try {
    const users = await UserModel.getAllUsers();
    res.render('admin/users', { title: 'User Management Directory', users });
  } catch (err) {
    console.error(err);
    res.render('admin/users', { title: 'User Management Directory', users: [] });
  }
});

router.post('/updateRole', isAdmin, validateCsrf, async (req, res) => {
  try {
    const { id, role } = req.body;
    if (id && role) {
      await UserModel.updateRole(parseInt(id), role);
    }
  } catch (err) {
    console.error(err);
  }
  res.redirect('/admin/users');
});

router.get('/edit/:id', isAdmin, async (req, res) => {
  try {
    const user = await UserModel.getById(parseInt(req.params.id));
    if (!user) return res.redirect('/admin/users');
    res.render('admin/edit_user', { title: 'Edit User Profile', user });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/users');
  }
});

router.post('/updateProfile', isAdmin, validateCsrf, async (req, res) => {
  try {
    await UserModel.updateDetails({
      id: parseInt(req.body.id),
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email
    });
  } catch (err) {
    console.error(err);
  }
  res.redirect('/admin/users');
});

module.exports = router;
