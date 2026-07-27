const UserModel = require('../models/UserModel');
const ProductModel = require('../models/ProductModel');
const CourseModel = require('../models/CourseModel');
const RepairModel = require('../models/RepairModel');
const CategoryModel = require('../models/CategoryModel');
const ContactModel = require('../models/ContactModel');
const OrderModel = require('../models/OrderModel');
const { generateSlug, formatDate, formatCurrency, getStatusBadgeClass } = require('../utils/helpers');
const { pool } = require('../config/db');

exports.getDashboard = async (req, res, next) => {
  try {
    const totalClients = await UserModel.countAll({ role: 'customer' });
    const totalTechnicians = await UserModel.countAll({ role: 'technician' });
    const [productCountRow] = await pool.execute('SELECT COUNT(*) AS count FROM products');

    const [pendingBookings] = await pool.execute(
      "SELECT COUNT(*) AS count FROM repair_requests WHERE status = 'pending'"
    );
    const [totalRevenue] = await pool.execute(
      "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE order_status != 'cancelled'"
    );
    const [pendingOrders] = await pool.execute(
      "SELECT COUNT(*) AS count FROM orders WHERE order_status = 'pending'"
    );
    const [totalOrders] = await pool.execute(
      "SELECT COUNT(*) AS count FROM orders"
    );
    const [unreadMessages] = await pool.execute(
      "SELECT COUNT(*) AS count FROM contact_messages WHERE status = 'unread'"
    );

    const [recentBookings] = await pool.execute(
      `SELECT rr.*, s.title AS service_title
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       ORDER BY rr.created_at DESC LIMIT 5`
    );

    const [recentOrders] = await pool.execute(
      `SELECT o.*, u.first_name, u.last_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 5`
    );

    const metrics = {
      revenue: totalRevenue[0].total,
      pending_orders: pendingOrders[0].count,
      total_orders: totalOrders[0].count,
      pending_bookings: pendingBookings[0].count,
      total_clients: totalClients,
      total_technicians: totalTechnicians,
      total_products: productCountRow[0].count,
      unread_messages: unreadMessages[0].count
    };

    res.render('admin/dashboard', {
      title: 'Admin Control Matrix - Athstack',
      metrics,
      recentBookings,
      recentOrders,
      formatCurrency
    });
  } catch (err) {
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const role = req.query.role || null;
    const search = req.query.search || null;

    const { users, total, limit } = await UserModel.getAll({ role, search, page, limit: 20 });
    const totalPages = Math.ceil(total / limit);

    res.render('admin/users', {
      title: 'User Directories - Athstack',
      users,
      pagination: { page, totalPages, total, hasNext: page < totalPages, hasPrev: page > 1 },
      currentRole: role,
      searchQuery: search
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (isNaN(userId)) {
      req.flash('error', 'Invalid user ID.');
      return res.redirect('/admin/users');
    }

    const validRoles = ['customer', 'technician', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      req.flash('error', 'Invalid role.');
      return res.redirect('/admin/users');
    }

    if (userId === Number(req.session.userId)) {
      req.flash('error', 'You cannot change your own role.');
      return res.redirect('/admin/users');
    }

    if (role === 'super_admin' && req.session.userRole !== 'super_admin') {
      req.flash('error', 'Only super administrators can assign the super admin role.');
      return res.redirect('/admin/users');
    }

    if (role === 'admin' && req.session.userRole !== 'super_admin') {
      req.flash('error', 'Only super administrators can assign the admin role.');
      return res.redirect('/admin/users');
    }

    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    await UserModel.updateRole(userId, role);
    req.flash('success', 'User role updated.');
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(userId)) {
      req.flash('error', 'Invalid user ID.');
      return res.redirect('/admin/users');
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      req.flash('error', 'Invalid status.');
      return res.redirect('/admin/users');
    }

    if (userId === Number(req.session.userId)) {
      req.flash('error', 'You cannot change your own status.');
      return res.redirect('/admin/users');
    }

    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }

    await UserModel.updateStatus(userId, status);
    req.flash('success', 'User status updated.');
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await ProductModel.getFiltered({});
    const categories = await CategoryModel.getAll();

    res.render('admin/products', {
      title: 'Manage Inventory - Athstack',
      products: products.products,
      categories,
      formatCurrency
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleProductStatus = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await ProductModel.findById(productId);

    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/admin/products');
    }

    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    await pool.execute('UPDATE products SET status = ? WHERE id = ?', [newStatus, productId]);

    req.flash('success', `Product ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
};

exports.getRepairs = async (req, res, next) => {
  try {
    const result = await RepairModel.getAll({});
    const technicians = await UserModel.getTechnicians();

    res.render('admin/repairs', {
      title: 'Repair Requests - Athstack',
      repairs: result.repairs,
      technicians,
      formatDate,
      getStatusBadgeClass
    });
  } catch (err) {
    next(err);
  }
};

exports.assignTechnician = async (req, res, next) => {
  try {
    const repairId = parseInt(req.params.id);
    const { technician_id } = req.body;

    if (!technician_id) {
      req.flash('error', 'Please select a technician.');
      return res.redirect('/admin/repairs');
    }

    await pool.execute(
      'UPDATE repair_requests SET technician_id = ?, status = ? WHERE id = ?',
      [parseInt(technician_id), 'in_repair', repairId]
    );

    req.flash('success', 'Technician assigned to repair request.');
    res.redirect('/admin/repairs');
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, u.first_name, u.last_name, u.email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );

    res.render('admin/orders', {
      title: 'All Orders - Athstack',
      orders,
      formatDate,
      formatCurrency,
      getStatusBadgeClass
    });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      req.flash('error', 'Invalid status.');
      return res.redirect('/admin/orders');
    }

    await pool.execute('UPDATE orders SET order_status = ? WHERE id = ?', [status, orderId]);
    req.flash('success', 'Order status updated.');
    res.redirect('/admin/orders');
  } catch (err) {
    next(err);
  }
};

exports.getCourses = async (req, res, next) => {
  try {
    const modules = await CourseModel.getAll();
    res.render('admin/training', {
      title: 'Training Academy Modules - Athstack',
      modules,
      formatDate,
      formatCurrency
    });
  } catch (err) {
    next(err);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, duration, level, price, instructor } = req.body;

    if (!title) {
      req.flash('error', 'Course title is required.');
      return res.redirect('/admin/training');
    }

    const slug = generateSlug(title);

    await CourseModel.create({
      title,
      slug,
      description: description || '',
      duration: duration || '',
      status: 'draft',
      level: level || 'Beginner',
      price: parseFloat(price) || 0,
      image_path: req.file ? req.file.filename : 'default.jpg'
    });

    req.flash('success', 'Course created successfully.');
    res.redirect('/admin/training');
  } catch (err) {
    next(err);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id);
    const course = await CourseModel.findById(courseId);

    if (!course) {
      req.flash('error', 'Course not found.');
      return res.redirect('/admin/training');
    }

    const { title, description, duration, status, level, price } = req.body;

    await CourseModel.update(courseId, {
      title: title || course.title,
      description: description || course.description,
      duration: duration || course.duration,
      status: status || course.status,
      level: level || course.level,
      price: parseFloat(price) || course.price
    });

    req.flash('success', 'Course updated successfully.');
    res.redirect('/admin/training');
  } catch (err) {
    next(err);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id);
    const course = await CourseModel.findById(courseId);

    if (!course) {
      req.flash('error', 'Course not found.');
      return res.redirect('/admin/training');
    }

    await CourseModel.delete(courseId);
    req.flash('success', 'Course deleted.');
    res.redirect('/admin/training');
  } catch (err) {
    next(err);
  }
};

exports.getInbox = async (req, res, next) => {
  try {
    const { messages } = await ContactModel.getAll({});
    res.render('admin/inbox', {
      title: 'Contact Inbox - Athstack',
      messages,
      formatDate
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id);
    await pool.execute("UPDATE contact_messages SET status = 'read' WHERE id = ?", [messageId]);
    req.flash('success', 'Message marked as read.');
    res.redirect('/admin/inbox');
  } catch (err) {
    next(err);
  }
};

exports.getSettings = (req, res) => {
  res.render('admin/settings', {
    title: 'System Settings - Athstack'
  });
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { site_name, site_url, contact_email } = req.body;
    req.flash('success', 'Settings updated successfully.');
    res.redirect('/admin/settings');
  } catch (err) {
    next(err);
  }
};
