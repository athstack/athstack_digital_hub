const UserModel = require('../models/UserModel');
const ProductModel = require('../models/ProductModel');
const CourseModel = require('../models/CourseModel');
const RepairModel = require('../models/RepairModel');
const CategoryModel = require('../models/CategoryModel');
const ContactModel = require('../models/ContactModel');
const OrderModel = require('../models/OrderModel');
const ServiceModel = require('../models/ServiceModel');
const NotificationModel = require('../models/NotificationModel');
const ProductImageModel = require('../models/ProductImageModel');
const { generateSlug, generateSku, formatDate } = require('../utils/helpers');
const { formatCurrency } = require('../utils/currency');
const { pool } = require('../config/db');
const { processUploadedFile, processUploadedFiles } = require('../helpers/upload');
const { logActivity } = require('../helpers/activityLog');
const {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_MODULES,
  ROLES,
  ROLE_NAMES
} = require('../config/permissions');
const {
  getRolePermissions,
  setRolePermissions,
  getCatalogPermissions,
  addCatalogPermission
} = require('../helpers/rbac');

// Dual-mode request helpers: every CRUD action answers HTML redirects (no-JS)
// and JSON (fetch + XHR) depending on what the client asked for.
const isAjaxRequest = (req) =>
  req.xhr ||
  (req.headers.accept && req.headers.accept.includes('application/json')) ||
  req.query.ajax === '1';

const flashFor = (req, type, key, data) => {
  const message = req.t(key, data);
  req.flash(type, message);
  return message;
};

const rejectWith = (res, status, message, errors) =>
  res.status(status).json({ success: false, message, errors: errors || undefined });

const toImageUrl = (path, folder) => {
  if (!path) return `/uploads/${folder}/product-placeholder.svg`;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return path;
  return `/uploads/${folder}/${path}`;
};

exports.getDashboard = async (req, res, next) => {
  try {
    const totalClients = await UserModel.countAll({ role: 'customer' });
    const totalTechnicians = await UserModel.countAll({ role: 'technician' });
    const totalUsers = await UserModel.countAll();
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
    const [totalRepairs] = await pool.execute(
      'SELECT COUNT(*) AS count FROM repair_requests'
    );
    const [unreadMessages] = await pool.execute(
      "SELECT COUNT(*) AS count FROM contact_messages WHERE status = 'unread'"
    );
    const [pendingReviews] = await pool.execute(
      "SELECT COUNT(*) AS count FROM reviews WHERE status = 'pending'"
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

    // Super Admin / system-wide metrics
    const [activeCampaigns] = await pool.execute(
      "SELECT COUNT(*) AS count FROM marketing_campaigns WHERE status = 'active'"
    );
    const [visitors30] = await pool.execute(
      'SELECT COUNT(DISTINCT visitor_key) AS count FROM website_visits WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
    );
    const [pendingApprovals] = await pool.execute(
      "SELECT (SELECT COUNT(*) FROM users WHERE status = 'pending') + (SELECT COUNT(*) FROM reviews WHERE status = 'pending') + (SELECT COUNT(*) FROM testimonials WHERE status = 'pending') AS count"
    );

    let systemHealth = null;
    if (req.can && req.can(PERMISSIONS.VIEW_SYSTEM_REPORTS)) {
      let dbOk = true;
      try {
        await pool.query('SELECT 1');
      } catch (e) {
        dbOk = false;
      }
      systemHealth = {
        database: dbOk,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        nodeVersion: process.version
      };
    }

    const metrics = {
      revenue: totalRevenue[0].total,
      pending_orders: pendingOrders[0].count,
      total_orders: totalOrders[0].count,
      total_repairs: totalRepairs[0].count,
      pending_bookings: pendingBookings[0].count,
      total_clients: totalClients,
      total_technicians: totalTechnicians,
      total_users: totalUsers,
      total_products: productCountRow[0].count,
      unread_messages: unreadMessages[0].count,
      pending_reviews: pendingReviews[0].count,
      active_campaigns: activeCampaigns[0].count,
      website_visitors: visitors30[0].count,
      pending_approvals: pendingApprovals[0].count
    };

    res.render('admin/dashboard', {
      title: req.t('admin:title.dashboard'),
      metrics,
      recentBookings,
      recentOrders,
      systemHealth
    });
  } catch (err) {
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim().slice(0, 100) : null;
    const role = req.query.role && ['customer', 'technician', 'admin', 'super_admin', 'marketing_officer'].includes(req.query.role) ? req.query.role : null;
    const status = req.query.status && ['active', 'inactive', 'suspended'].includes(req.query.status) ? req.query.status : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 10;

    const result = await UserModel.getAll({ role, status, search, page, limit });
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

    const viewData = {
      title: req.t('admin:title.users'),
      users: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
        hasNext: result.page < totalPages,
        hasPrev: result.page > 1
      },
      currentRole: role || '',
      currentStatus: status || '',
      currentSearch: search || '',
      isSuperAdmin: req.session.userRole === 'super_admin'
    };

    // Fragment: server-rendered toolbar + table for instant in-place refresh.
    if (req.query.fragment === '1') {
      return res.render('admin/partials/usersTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    // Plain JSON list for API consumers.
    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        users: result.users,
        total: result.total,
        page: result.page,
        totalPages
      });
    }

    res.render('admin/users', viewData);
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    const respond = (status, data) => isAjax ? res.status(status).json(data) : res.redirect('/admin/users');

    if (isNaN(userId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidUserId') });
      req.flash('error', req.t('admin:flash.invalidUserId'));
      return respond(400, {});
    }

    const validRoles = ['customer', 'technician', 'admin', 'super_admin', 'marketing_officer'];
    if (!validRoles.includes(role)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidRole') });
      req.flash('error', req.t('admin:flash.invalidRole'));
      return respond(400, {});
    }

    if (userId === Number(req.session.userId)) {
      if (isAjax) return respond(403, { success: false, message: req.t('admin:flash.cannotChangeOwnRole') });
      req.flash('error', req.t('admin:flash.cannotChangeOwnRole'));
      return respond(403, {});
    }

    if (role === 'super_admin' && req.session.userRole !== 'super_admin') {
      if (isAjax) return respond(403, { success: false, message: req.t('admin:flash.superAdminRoleRestricted') });
      req.flash('error', req.t('admin:flash.superAdminRoleRestricted'));
      return respond(403, {});
    }

    if (role === 'admin' && req.session.userRole !== 'super_admin') {
      if (isAjax) return respond(403, { success: false, message: req.t('admin:flash.adminRoleRestricted') });
      req.flash('error', req.t('admin:flash.adminRoleRestricted'));
      return respond(403, {});
    }

    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.userNotFound') });
      req.flash('error', req.t('admin:flash.userNotFound'));
      return respond(404, {});
    }

    if (targetUser.role === 'super_admin' && req.session.userRole !== 'super_admin') {
      if (isAjax) return respond(403, { success: false, message: req.t('admin:flash.cannotModifySuperAdmin') });
      req.flash('error', req.t('admin:flash.cannotModifySuperAdmin'));
      return respond(403, {});
    }

    await UserModel.updateRole(userId, role);
    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.roleUpdated') });
    req.flash('success', req.t('admin:flash.userRoleUpdated'));
    respond(200, {});
  } catch (err) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(500).json({ success: false, message: req.t('admin:flash.serverError') });
    }
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    const respond = (code, data) => isAjax ? res.status(code).json(data) : res.redirect('/admin/users');

    if (isNaN(userId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidUserId') });
      req.flash('error', req.t('admin:flash.invalidUserId'));
      return respond(400, {});
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidStatus') });
      req.flash('error', req.t('admin:flash.invalidStatus'));
      return respond(400, {});
    }

    if (userId === Number(req.session.userId)) {
      if (isAjax) return respond(403, { success: false, message: req.t('admin:flash.cannotChangeOwnStatus') });
      req.flash('error', req.t('admin:flash.cannotChangeOwnStatus'));
      return respond(403, {});
    }

    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.userNotFound') });
      req.flash('error', req.t('admin:flash.userNotFound'));
      return respond(404, {});
    }

    if (targetUser.role === 'super_admin' && req.session.userRole !== 'super_admin') {
      if (isAjax) return respond(403, { success: false, message: req.t('admin:flash.cannotModifySuperAdmin') });
      req.flash('error', req.t('admin:flash.cannotModifySuperAdmin'));
      return respond(403, {});
    }

    await UserModel.updateStatus(userId, status);
    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.statusUpdated') });
    req.flash('success', req.t('admin:flash.userStatusUpdated'));
    respond(200, {});
  } catch (err) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(500).json({ success: false, message: req.t('admin:flash.serverError') });
    }
    next(err);
  }
};

exports.getCreateUser = (req, res) => {
  res.render('admin/user-form', {
    title: req.t('admin:title.createUser'),
    user: null,
    editing: false,
    isAdmin: req.session.userRole === 'admin' || req.session.userRole === 'super_admin',
    isSuperAdmin: req.session.userRole === 'super_admin'
  });
};

exports.createUser = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, role, status, password } = req.body;
    const ajax = isAjaxRequest(req);

    const errors = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!first_name || !String(first_name).trim()) errors.first_name = req.t('admin:flash.userFirstNameRequired');
    if (!last_name || !String(last_name).trim()) errors.last_name = req.t('admin:flash.userLastNameRequired');
    if (!email || !emailRe.test(String(email).trim())) errors.email = req.t('admin:flash.userEmailInvalid');
    if (!password || String(password).length < 6) errors.password = req.t('admin:flash.userPasswordRequired');

    if (Object.keys(errors).length > 0) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.userRequiredFields'), errors);
      flashFor(req, 'error', 'admin:flash.userRequiredFields');
      return res.redirect('/admin/users/new');
    }

    const cleanEmail = String(email).trim();
    const existing = await UserModel.findByEmail(cleanEmail);
    if (existing) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.emailExists'), { email: req.t('admin:flash.emailExists') });
      req.flash('error', req.t('admin:flash.emailExists'));
      return res.redirect('/admin/users/new');
    }

    const validRoles = ['customer', 'technician', 'admin', 'super_admin', 'marketing_officer'];
    const validStatuses = ['active', 'inactive', 'suspended'];
    const userRole = validRoles.includes(role) ? role : 'customer';
    const userStatus = validStatuses.includes(status) ? status : 'active';

    if (userRole === 'admin' && req.session.userRole !== 'super_admin') {
      if (ajax) return rejectWith(res, 403, req.t('admin:flash.createAdminRestricted'));
      req.flash('error', req.t('admin:flash.createAdminRestricted'));
      return res.redirect('/admin/users/new');
    }

    if (userRole === 'super_admin' && req.session.userRole !== 'super_admin') {
      if (ajax) return rejectWith(res, 403, req.t('admin:flash.createSuperAdminRestricted'));
      req.flash('error', req.t('admin:flash.createSuperAdminRestricted'));
      return res.redirect('/admin/users/new');
    }

    await UserModel.create({
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: cleanEmail,
      phone: phone ? String(phone).trim() : null,
      password,
      role: userRole
    });

    if (userStatus !== 'active') {
      const created = await UserModel.findByEmail(cleanEmail);
      if (created) await UserModel.updateStatus(created.id, userStatus);
    }

    if (ajax) {
      return res.json({
        success: true,
        message: req.t('admin:flash.userCreated', { name: String(first_name).trim() + ' ' + String(last_name).trim() })
      });
    }
    req.flash('success', req.t('admin:flash.userCreated', { name: String(first_name).trim() + ' ' + String(last_name).trim() }));
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

exports.getEditUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      if (isAjaxRequest(req)) return rejectWith(res, 400, req.t('admin:flash.invalidUserId'));
      req.flash('error', req.t('admin:flash.invalidUserId'));
      return res.redirect('/admin/users');
    }

    const target = await UserModel.findById(userId);

    if (!target) {
      if (isAjaxRequest(req)) return rejectWith(res, 404, req.t('admin:flash.userNotFound'));
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/users');
    }

    if (target.role === 'super_admin' && req.session.userRole !== 'super_admin') {
      if (isAjaxRequest(req)) return rejectWith(res, 403, req.t('admin:flash.cannotEditSuperAdmin'));
      req.flash('error', req.t('admin:flash.cannotEditSuperAdmin'));
      return res.redirect('/admin/users');
    }

    // JSON detail (used by the modal CRUD edit flow).
    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        user: {
          id: target.id,
          first_name: target.first_name,
          last_name: target.last_name,
          email: target.email,
          phone: target.phone || '',
          role: target.role,
          status: target.status,
          avatar_url: target.avatar ? toImageUrl(target.avatar, 'profiles') : null
        }
      });
    }

    res.render('admin/user-form', {
      title: req.t('admin:title.editUser'),
      user: target,
      editing: true,
      isAdmin: req.session.userRole === 'admin' || req.session.userRole === 'super_admin',
      isSuperAdmin: req.session.userRole === 'super_admin'
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const ajax = isAjaxRequest(req);

    if (isNaN(userId)) {
      if (ajax) return rejectWith(res, 400, req.t('admin:flash.invalidUserId'));
      req.flash('error', req.t('admin:flash.invalidUserId'));
      return res.redirect('/admin/users');
    }

    const { first_name, last_name, email, phone, role, status, password } = req.body;

    const target = await UserModel.findById(userId);
    if (!target) {
      if (ajax) return rejectWith(res, 404, req.t('admin:flash.userNotFound'));
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/users');
    }

    if (target.role === 'super_admin' && req.session.userRole !== 'super_admin') {
      if (ajax) return rejectWith(res, 403, req.t('admin:flash.cannotModifySuperAdmin'));
      req.flash('error', req.t('admin:flash.cannotModifySuperAdmin'));
      return res.redirect('/admin/users');
    }

    if (userId === Number(req.session.userId) && role && role !== target.role) {
      if (ajax) return rejectWith(res, 403, req.t('admin:flash.cannotChangeOwnRole'));
      req.flash('error', req.t('admin:flash.cannotChangeOwnRole'));
      return res.redirect('/admin/users');
    }

    if (userId === Number(req.session.userId) && status && status !== target.status) {
      if (ajax) return rejectWith(res, 403, req.t('admin:flash.cannotChangeOwnStatus'));
      req.flash('error', req.t('admin:flash.cannotChangeOwnStatus'));
      return res.redirect('/admin/users');
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors = {};
    if (first_name !== undefined && !String(first_name).trim()) errors.first_name = req.t('admin:flash.userFirstNameRequired');
    if (last_name !== undefined && !String(last_name).trim()) errors.last_name = req.t('admin:flash.userLastNameRequired');
    if (email !== undefined && (!String(email).trim() || !emailRe.test(String(email).trim()))) errors.email = req.t('admin:flash.userEmailInvalid');
    if (password && String(password).length < 6) errors.password = req.t('admin:flash.userPasswordWeak');

    if (Object.keys(errors).length > 0) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.userRequiredFields'), errors);
      flashFor(req, 'error', 'admin:flash.userRequiredFields');
      return res.redirect('/admin/users/' + userId + '/edit');
    }

    if (role && !['customer', 'technician', 'admin', 'super_admin', 'marketing_officer'].includes(role)) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.invalidRole'), { role: req.t('admin:flash.invalidRole') });
      req.flash('error', req.t('admin:flash.invalidRole'));
      return res.redirect('/admin/users');
    }

    if (status && !['active', 'inactive', 'suspended'].includes(status)) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.invalidStatus'), { status: req.t('admin:flash.invalidStatus') });
      req.flash('error', req.t('admin:flash.invalidStatus'));
      return res.redirect('/admin/users');
    }

    if (role && role !== target.role) {
      if (role === 'admin' && req.session.userRole !== 'super_admin') {
        if (ajax) return rejectWith(res, 403, req.t('admin:flash.adminRoleRestricted'));
        req.flash('error', req.t('admin:flash.adminRoleRestricted'));
        return res.redirect('/admin/users');
      }
      if (role === 'super_admin' && req.session.userRole !== 'super_admin') {
        if (ajax) return rejectWith(res, 403, req.t('admin:flash.superAdminRoleRestricted'));
        req.flash('error', req.t('admin:flash.superAdminRoleRestricted'));
        return res.redirect('/admin/users');
      }
    }

    const cleanEmail = email !== undefined ? String(email).trim() : target.email;
    if (cleanEmail !== target.email) {
      const existing = await UserModel.findByEmail(cleanEmail);
      if (existing) {
        if (ajax) return rejectWith(res, 422, req.t('admin:flash.emailExists'), { email: req.t('admin:flash.emailExists') });
        req.flash('error', req.t('admin:flash.emailExists'));
        return res.redirect('/admin/users/' + userId + '/edit');
      }
    }

    await UserModel.adminUpdate(userId, {
      first_name: first_name !== undefined ? String(first_name).trim() : target.first_name,
      last_name: last_name !== undefined ? String(last_name).trim() : target.last_name,
      email: cleanEmail,
      phone: phone !== undefined ? (String(phone).trim() || null) : target.phone,
      role: role || target.role,
      status: status || target.status,
      password: password || null
    });

    if (ajax) {
      return res.json({ success: true, message: req.t('admin:flash.userUpdated') });
    }
    req.flash('success', req.t('admin:flash.userUpdated'));
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    const respond = (code, data) => isAjax ? res.status(code).json(data) : res.redirect('/admin/users');

    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidUserId') });
      req.flash('error', req.t('admin:flash.invalidUserId'));
      return respond(400, {});
    }

    if (userId === Number(req.session.userId)) {
      if (isAjax) return respond(403, { success: false, message: req.t('admin:flash.cannotDeleteOwn') });
      req.flash('error', req.t('admin:flash.cannotDeleteOwn'));
      return respond(403, {});
    }

    const target = await UserModel.findById(userId);
    if (!target) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.userNotFound') });
      req.flash('error', req.t('admin:flash.userNotFound'));
      return respond(404, {});
    }

    if (target.role === 'super_admin' && req.session.userRole !== 'super_admin') {
      if (isAjax) return respond(403, { success: false, message: req.t('admin:flash.cannotDeleteSuperAdmin') });
      req.flash('error', req.t('admin:flash.cannotDeleteSuperAdmin'));
      return respond(403, {});
    }

    await UserModel.delete(userId);
    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.userDeleted', { name: target.first_name + ' ' + target.last_name }) });
    req.flash('success', req.t('admin:flash.userDeleted', { name: target.first_name + ' ' + target.last_name }));
    respond(200, {});
  } catch (err) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(500).json({ success: false, message: req.t('admin:flash.serverError') });
    }
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim().slice(0, 100) : null;
    const status = req.query.status && ['active', 'inactive'].includes(req.query.status) ? req.query.status : null;
    const category = req.query.category ? String(req.query.category).trim().slice(0, 80) : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 10;

    const result = await ProductModel.getFiltered({
      allStatuses: true,
      search,
      status,
      category,
      page,
      limit
    });
    const categories = await CategoryModel.getAll();
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

    const viewData = {
      title: req.t('admin:title.products'),
      products: result.products,
      categories,
      pagination: {
        page: result.page,
        total: result.total,
        totalPages,
        hasNext: result.page < totalPages,
        hasPrev: result.page > 1
      },
      currentSearch: search || '',
      currentStatus: status || '',
      currentCategory: category || ''
    };

    // Fragment: server-rendered toolbar + table for instant in-place refresh.
    if (req.query.fragment === '1') {
      return res.render('admin/partials/productsTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    // Plain JSON list for API consumers.
    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        products: result.products,
        total: result.total,
        page: result.page,
        totalPages
      });
    }

    res.render('admin/products', viewData);
  } catch (err) {
    next(err);
  }
};

exports.toggleProductStatus = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await ProductModel.findById(productId);
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    const respond = (code, data) => isAjax ? res.status(code).json(data) : res.redirect('/admin/products');

    if (!product) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.productNotFound') });
      req.flash('error', req.t('admin:flash.productNotFound'));
      return respond(404, {});
    }

    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    await pool.execute('UPDATE products SET status = ? WHERE id = ?', [newStatus, productId]);

    const statusMsg = req.t(newStatus === 'active' ? 'admin:flash.productActivated' : 'admin:flash.productDeactivated');
    if (isAjax) return respond(200, { success: true, status: newStatus, message: statusMsg });
    req.flash('success', statusMsg);
    respond(302, {});
  } catch (err) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(500).json({ success: false, message: req.t('admin:flash.serverError') });
    }
    next(err);
  }
};

exports.getAddProduct = async (req, res, next) => {
  try {
    const categories = await CategoryModel.getAll();
    res.render('admin/product-form', {
      title: req.t('admin:title.addProduct'),
      product: null,
      categories,
      editing: false
    });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, discount_price, category_id, stock_quantity, sku, status } = req.body;
    const ajax = isAjaxRequest(req);

    const errors = {};
    if (!name || !String(name).trim()) errors.name = req.t('admin:flash.productNameRequired');
    if (price === undefined || price === '' || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      errors.price = req.t('admin:flash.productPriceInvalid');
    }
    if (!category_id || isNaN(parseInt(category_id, 10))) {
      errors.category_id = req.t('admin:flash.productCategoryRequired');
    }

    if (Object.keys(errors).length > 0) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.productRequiredFields'), errors);
      flashFor(req, 'error', 'admin:flash.productRequiredFields');
      return res.redirect('/admin/products/new');
    }

    const mainImageFile = req.files && req.files['product_image'] && req.files['product_image'][0];
    const mainImage = mainImageFile ? await processUploadedFile(mainImageFile, 'products') : '';

    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    const existing = await ProductModel.findBySlug(baseSlug);
    if (existing) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    let finalSku = sku ? String(sku).trim() : '';
    if (!finalSku) {
      const category = await CategoryModel.findById(parseInt(category_id));
      const categoryName = category ? category.name : '';
      for (let attempt = 0; attempt < 20; attempt++) {
        finalSku = generateSku(name, categoryName, { random: true });
        if (!(await ProductModel.findBySku(finalSku))) break;
      }
    }

    try {
      await ProductModel.create({
        category_id: parseInt(category_id),
        name,
        slug,
        description: description || '',
        price: parseFloat(price),
        discount_price: discount_price ? parseFloat(discount_price) : null,
        stock_quantity: parseInt(stock_quantity) || 0,
        main_image: mainImage,
        technician_id: req.session.userId,
        status: status === 'inactive' ? 'inactive' : 'active',
        featured: 0,
        sku: finalSku || null
      });
    } catch (err) {
      if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
        if (ajax) return rejectWith(res, 422, req.t('admin:flash.productSkuDuplicate'));
        req.flash('error', req.t('admin:flash.productSkuDuplicate'));
        return res.redirect('/admin/products/new');
      }
      throw err;
    }

    const created = await ProductModel.findBySlug(slug);
    if (created && req.files && req.files['gallery_images']) {
      const galleryPaths = await processUploadedFiles(req.files['gallery_images'], 'products');
      if (galleryPaths.length > 0) {
        await ProductImageModel.addMultiple(created.id, galleryPaths);
      }
    }

    if (ajax) {
      return res.json({
        success: true,
        message: req.t('admin:flash.productCreated'),
        product: { id: created.id, name: created.name }
      });
    }
    req.flash('success', req.t('admin:flash.productCreated'));
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
};

exports.getEditProduct = async (req, res, next) => {
  try {
    const product = await ProductModel.findById(parseInt(req.params.id));
    if (!product) {
      if (isAjaxRequest(req)) return rejectWith(res, 404, req.t('admin:flash.productNotFound'));
      req.flash('error', req.t('admin:flash.productNotFound'));
      return res.redirect('/admin/products');
    }

    const categories = await CategoryModel.getAll();
    const gallery = await ProductImageModel.getByProduct(product.id);

    // JSON detail (used by the modal CRUD edit flow).
    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        product: Object.assign({}, product, {
          main_image_url: toImageUrl(product.main_image, 'products'),
          gallery: (gallery || []).map((g) => ({
            id: g.id,
            url: toImageUrl(g.image_path, 'products')
          }))
        }),
        categories
      });
    }

    res.render('admin/product-form', {
      title: req.t('admin:title.editProduct'),
      product,
      categories,
      gallery,
      editing: true
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await ProductModel.findById(productId);
    const ajax = isAjaxRequest(req);

    if (!product) {
      if (ajax) return rejectWith(res, 404, req.t('admin:flash.productNotFound'));
      req.flash('error', req.t('admin:flash.productNotFound'));
      return res.redirect('/admin/products');
    }

    const { name, description, price, discount_price, category_id, stock_quantity, sku, status } = req.body;

    const errors = {};
    if (name !== undefined && !String(name).trim()) errors.name = req.t('admin:flash.productNameRequired');
    if (price !== undefined && (price === '' || isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      errors.price = req.t('admin:flash.productPriceInvalid');
    }
    if (Object.keys(errors).length > 0) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.productRequiredFields'), errors);
      flashFor(req, 'error', 'admin:flash.productRequiredFields');
      return res.redirect('/admin/products/edit/' + productId);
    }

    let mainImage = req.body.existing_image || product.main_image;
    const mainImageFile = req.files && req.files['product_image'] && req.files['product_image'][0];
    if (mainImageFile) {
      mainImage = await processUploadedFile(mainImageFile, 'products');
    }

    let finalSku = sku !== undefined ? (sku ? String(sku).trim() : '') : product.sku;
    if (!finalSku) {
      const category = await CategoryModel.findById(parseInt(category_id) || product.category_id);
      const categoryName = category ? category.name : '';
      for (let attempt = 0; attempt < 20; attempt++) {
        finalSku = generateSku(name || product.name, categoryName, { random: true });
        if (!(await ProductModel.findBySku(finalSku))) break;
      }
    }

    try {
      await ProductModel.update(productId, {
        category_id: parseInt(category_id) || product.category_id,
        name: name || product.name,
        description: description || '',
        price: parseFloat(price) || product.price,
        discount_price: discount_price !== undefined ? (discount_price ? parseFloat(discount_price) : null) : product.discount_price,
        stock_quantity: parseInt(stock_quantity) || 0,
        main_image: mainImage,
        status: status === 'active' || status === 'inactive' ? status : product.status,
        sku: finalSku
      });
    } catch (err) {
      if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
        if (ajax) return rejectWith(res, 422, req.t('admin:flash.productSkuDuplicate'));
        req.flash('error', req.t('admin:flash.productSkuDuplicate'));
        return res.redirect('/admin/products/edit/' + productId);
      }
      throw err;
    }

    if (req.files && req.files['gallery_images'] && req.files['gallery_images'].length > 0) {
      const galleryPaths = await processUploadedFiles(req.files['gallery_images'], 'products');
      await ProductImageModel.deleteByProduct(productId);
      await ProductImageModel.addMultiple(productId, galleryPaths);
    }

    if (ajax) {
      return res.json({
        success: true,
        message: req.t('admin:flash.productUpdated'),
        product: { id: productId, name: name || product.name }
      });
    }
    req.flash('success', req.t('admin:flash.productUpdated'));
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    const respond = (code, data) => isAjax ? res.status(code).json(data) : res.redirect('/admin/products');

    const productId = parseInt(req.params.id);
    const product = await ProductModel.findById(productId);

    if (!product) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.productNotFound') });
      req.flash('error', req.t('admin:flash.productNotFound'));
      return respond(404, {});
    }

    await ProductModel.delete(productId);
    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.productDeleted') });
    req.flash('success', req.t('admin:flash.productDeleted'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.getRepairs = async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim().slice(0, 100) : null;
    const status = req.query.status && ['pending', 'assigned', 'diagnosing', 'in_repair', 'awaiting_parts', 'completed', 'cancelled'].includes(req.query.status) ? req.query.status : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 10;

    const result = await RepairModel.getAll({ status, search, page, limit });
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
    const technicians = await UserModel.getTechnicians();

    const viewData = {
      title: req.t('admin:title.repairs'),
      repairs: result.repairs,
      technicians,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
        hasNext: result.page < totalPages,
        hasPrev: result.page > 1
      },
      currentStatus: status || '',
      currentSearch: search || ''
    };

    // Fragment: server-rendered toolbar + table for instant in-place refresh.
    if (req.query.fragment === '1') {
      return res.render('admin/partials/repairsTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    // Plain JSON list for API consumers.
    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        repairs: result.repairs,
        total: result.total,
        page: result.page,
        totalPages
      });
    }

    res.render('admin/repairs', viewData);
  } catch (err) {
    next(err);
  }
};

exports.getRepairDetail = async (req, res, next) => {
  try {
    const repairId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (status, data) => isAjax ? res.status(status).json(data) : res.redirect('/admin/repairs');

    if (isNaN(repairId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidRepairId') });
      req.flash('error', req.t('admin:flash.invalidRepairId'));
      return respond(400, {});
    }

    const repair = await RepairModel.findById(repairId);
    if (!repair) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.repairNotFound') });
      req.flash('error', req.t('admin:flash.repairNotFound'));
      return respond(404, {});
    }

    const lang = req.language;
    res.json({
      success: true,
      repair: {
        id: repair.id,
        reference_number: repair.reference_number,
        customer_name: repair.customer_name,
        customer_email: repair.customer_email,
        customer_phone: repair.customer_phone,
        service_title: repair.service_title,
        device_type: repair.device_type,
        device_brand: repair.device_brand,
        device_model: repair.device_model,
        device_serial: repair.device_serial,
        issue_description: repair.issue_description,
        appointment_date: repair.appointment_date,
        appointment_date_formatted: formatDate(repair.appointment_date, lang),
        created_at_formatted: formatDate(repair.created_at, lang),
        status: repair.status,
        priority: repair.priority,
        estimated_cost: repair.estimated_cost,
        estimated_cost_formatted: formatCurrency(repair.estimated_cost, req.currency),
        actual_cost: repair.actual_cost,
        actual_cost_formatted: formatCurrency(repair.actual_cost, req.currency),
        technician_first_name: repair.technician_first_name,
        technician_last_name: repair.technician_last_name,
        updates: (repair.updates || []).map(u => ({
          id: u.id,
          status: u.status,
          notes: u.notes,
          created_at_formatted: formatDate(u.created_at, lang),
          updater_first_name: u.updater_first_name,
          updater_last_name: u.updater_last_name
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.assignTechnician = async (req, res, next) => {
  try {
    const repairId = parseInt(req.params.id);
    const { technician_id } = req.body;
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/repairs');

    if (isNaN(repairId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidRepairId') });
      req.flash('error', req.t('admin:flash.invalidRepairId'));
      return respond(400, {});
    }

    if (!technician_id) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.selectTechnician') });
      req.flash('error', req.t('admin:flash.selectTechnician'));
      return respond(400, {});
    }

    const repair = await RepairModel.findById(repairId);
    if (!repair) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.repairNotFound') });
      req.flash('error', req.t('admin:flash.repairNotFound'));
      return respond(404, {});
    }

    if (repair.technician_id) {
      if (req.session.userRole !== 'super_admin') {
        if (isAjax) return respond(403, { success: false, message: req.t('admin:flash.reassignRestricted') });
        req.flash('error', req.t('admin:flash.reassignRestricted'));
        return respond(403, {});
      }
    }

    await RepairModel.assignTechnician(repairId, parseInt(technician_id));

    if (repair.user_id) {
      await NotificationModel.create(repair.user_id, {
        title: req.t('admin:flash.repairAssignedTitle'),
        message: req.t('admin:flash.repairAssignedMessage', { ref: repair.reference_number }),
        type: 'repair',
        link: '/dashboard/repairs'
      });
    }

    const [techUser] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND status = ?',
      [parseInt(technician_id), 'active']
    );
    if (techUser.length > 0) {
      await NotificationModel.create(techUser[0].id, {
        title: req.t('admin:flash.newAssignmentTitle'),
        message: req.t('admin:flash.newAssignmentMessage', { ref: repair.reference_number }),
        type: 'repair',
        link: '/technician/repairs'
      });
    }

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.technicianAssigned') });
    req.flash('success', req.t('admin:flash.technicianAssigned'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim().slice(0, 100) : null;
    const status = req.query.status && ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(req.query.status) ? req.query.status : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 10;

    const result = await OrderModel.getAll({ status, search, page, limit });
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

    const viewData = {
      title: req.t('admin:title.orders'),
      orders: result.orders,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
        hasNext: result.page < totalPages,
        hasPrev: result.page > 1
      },
      currentStatus: status || '',
      currentSearch: search || ''
    };

    // Fragment: server-rendered toolbar + table for instant in-place refresh.
    if (req.query.fragment === '1') {
      return res.render('admin/partials/ordersTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    // Plain JSON list for API consumers.
    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        orders: result.orders,
        total: result.total,
        page: result.page,
        totalPages
      });
    }

    res.render('admin/orders', viewData);
  } catch (err) {
    next(err);
  }
};

exports.getOrderDetail = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (status, data) => isAjax ? res.status(status).json(data) : res.redirect('/admin/orders');

    if (isNaN(orderId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidOrderId') });
      req.flash('error', req.t('admin:flash.invalidOrderId'));
      return respond(400, {});
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.orderNotFound') });
      req.flash('error', req.t('admin:flash.orderNotFound'));
      return respond(404, {});
    }

    const lang = req.language;
    res.json({
      success: true,
      order: {
        id: order.id,
        order_reference: order.order_reference,
        created_at: order.created_at,
        created_at_formatted: formatDate(order.created_at, lang),
        order_status: order.order_status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        shipping_address: order.shipping_address,
        total_amount: order.total_amount,
        total_formatted: formatCurrency(order.total_amount, req.currency),
        first_name: order.first_name,
        last_name: order.last_name,
        email: order.email,
        phone: order.phone,
        items: (order.items || []).map(i => ({
          id: i.id,
          product_name: i.product_name,
          product_image: i.product_image,
          product_slug: i.product_slug,
          quantity: i.quantity,
          unit_price: i.unit_price,
          unit_price_formatted: formatCurrency(i.unit_price, req.currency),
          total_price: i.total_price,
          total_price_formatted: formatCurrency(i.total_price, req.currency)
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/orders');

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (isNaN(orderId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidOrderId') });
      req.flash('error', req.t('admin:flash.invalidOrderId'));
      return respond(400, {});
    }

    if (!validStatuses.includes(status)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidStatus') });
      req.flash('error', req.t('admin:flash.invalidStatus'));
      return respond(400, {});
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.orderNotFound') });
      req.flash('error', req.t('admin:flash.orderNotFound'));
      return respond(404, {});
    }

    await OrderModel.updateStatus(orderId, status);

    if (status === 'delivered' && order.user_id) {
      await NotificationModel.create(order.user_id, {
        title: req.t('admin:flash.orderDeliveredTitle'),
        message: req.t('admin:flash.orderDeliveredMessage', { ref: order.order_reference || orderId }),
        type: 'order',
        link: `/dashboard/orders/${orderId}`
      });
    }

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.orderStatusUpdated') });
    req.flash('success', req.t('admin:flash.orderStatusUpdated'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.getCourses = async (req, res, next) => {
  try {
    const search = req.query.search ? String(req.query.search).trim().slice(0, 100) : null;
    const status = req.query.status && ['active', 'draft'].includes(req.query.status) ? req.query.status : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 10;

    const result = await CourseModel.getAll({ status, search, page, limit });
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

    const viewData = {
      title: req.t('admin:title.training'),
      modules: result.courses,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
        hasNext: result.page < totalPages,
        hasPrev: result.page > 1
      },
      currentStatus: status || '',
      currentSearch: search || ''
    };

    // Fragment: server-rendered toolbar + table for instant in-place refresh.
    if (req.query.fragment === '1') {
      return res.render('admin/partials/coursesTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    // Plain JSON list for API consumers.
    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        courses: result.courses,
        total: result.total,
        page: result.page,
        totalPages
      });
    }

    res.render('admin/training', viewData);
  } catch (err) {
    next(err);
  }
};

exports.getCourseDetail = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (status, data) => isAjax ? res.status(status).json(data) : res.redirect('/admin/training');

    if (isNaN(courseId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidCourseId') });
      req.flash('error', req.t('admin:flash.invalidCourseId'));
      return respond(400, {});
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.courseNotFound') });
      req.flash('error', req.t('admin:flash.courseNotFound'));
      return respond(404, {});
    }

    const lang = req.language;
    res.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        duration: course.duration,
        level: course.level,
        price: course.price,
        price_formatted: formatCurrency(course.price, req.currency),
        status: course.status,
        instructor_first_name: course.instructor_first_name,
        instructor_last_name: course.instructor_last_name,
        enrollment_count: course.enrollment_count || 0,
        image_url: toImageUrl(course.image_path, 'courses'),
        created_at_formatted: formatDate(course.created_at, lang)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCourseStatus = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id);
    const { status } = req.body;
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/training');

    if (isNaN(courseId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidCourseId') });
      req.flash('error', req.t('admin:flash.invalidCourseId'));
      return respond(400, {});
    }

    if (!['active', 'draft'].includes(status)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidCourseStatus') });
      req.flash('error', req.t('admin:flash.invalidCourseStatus'));
      return respond(400, {});
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.courseNotFound') });
      req.flash('error', req.t('admin:flash.courseNotFound'));
      return respond(404, {});
    }

    await CourseModel.update(courseId, { status });

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.courseStatusUpdated') });
    req.flash('success', req.t('admin:flash.courseStatusUpdated'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, duration, level, price, status } = req.body;
    const ajax = isAjaxRequest(req);

    const errors = {};
    if (!title || !String(title).trim()) errors.title = req.t('admin:flash.courseTitleRequired');

    if (Object.keys(errors).length > 0) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.courseRequiredFields'), errors);
      flashFor(req, 'error', 'admin:flash.courseTitleRequired');
      return res.redirect('/admin/training');
    }

    const slug = generateSlug(String(title).trim());
    const courseImage = req.file ? await processUploadedFile(req.file, 'courses') : '';

    const course = await CourseModel.create({
      title: String(title).trim(),
      slug,
      description: description || '',
      duration: duration || '',
      status: status === 'draft' ? 'draft' : 'active',
      level: level || 'Beginner',
      price: parseFloat(price) || 0,
      image_path: courseImage
    });

    if (ajax) {
      return res.json({
        success: true,
        message: req.t('admin:flash.courseCreated'),
        course: { id: course.id, title: course.title }
      });
    }
    req.flash('success', req.t('admin:flash.courseCreated'));
    res.redirect('/admin/training');
  } catch (err) {
    next(err);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id);
    const course = await CourseModel.findById(courseId);
    const ajax = isAjaxRequest(req);

    if (!course) {
      if (ajax) return rejectWith(res, 404, req.t('admin:flash.courseNotFound'));
      req.flash('error', req.t('admin:flash.courseNotFound'));
      return res.redirect('/admin/training');
    }

    const { title, description, duration, status, level, price } = req.body;

    const errors = {};
    if (title !== undefined && !String(title).trim()) errors.title = req.t('admin:flash.courseTitleRequired');

    if (Object.keys(errors).length > 0) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.courseRequiredFields'), errors);
      flashFor(req, 'error', 'admin:flash.courseTitleRequired');
      return res.redirect('/admin/training');
    }

    await CourseModel.update(courseId, {
      title: title ? String(title).trim() : course.title,
      description: description !== undefined ? description : course.description,
      duration: duration !== undefined ? duration : course.duration,
      status: status === 'active' || status === 'draft' ? status : course.status,
      level: level !== undefined && level ? level : course.level,
      price: price !== undefined && price !== '' ? parseFloat(price) : course.price
    });

    if (ajax) {
      return res.json({
        success: true,
        message: req.t('admin:flash.courseUpdated'),
        course: { id: courseId, title: title || course.title }
      });
    }
    req.flash('success', req.t('admin:flash.courseUpdated'));
    res.redirect('/admin/training');
  } catch (err) {
    next(err);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.id);
    const ajax = isAjaxRequest(req);

    if (isNaN(courseId)) {
      if (ajax) return rejectWith(res, 400, req.t('admin:flash.invalidCourseId'));
      req.flash('error', req.t('admin:flash.invalidCourseId'));
      return res.redirect('/admin/training');
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      if (ajax) return rejectWith(res, 404, req.t('admin:flash.courseNotFound'));
      req.flash('error', req.t('admin:flash.courseNotFound'));
      return res.redirect('/admin/training');
    }

    await CourseModel.delete(courseId);

    if (ajax) {
      return res.json({ success: true, message: req.t('admin:flash.courseDeleted') });
    }
    req.flash('success', req.t('admin:flash.courseDeleted'));
    res.redirect('/admin/training');
  } catch (err) {
    next(err);
  }
};

exports.getInbox = async (req, res, next) => {
  try {
    const status = req.query.status || null;
    const search = req.query.search ? String(req.query.search).trim().slice(0, 100) : null;
    const page = parseInt(req.query.page) || 1;
    const result = await ContactModel.getAll({ status, search, page, limit: 20 });
    const totalPages = Math.ceil(result.total / result.limit);
    const unreadCount = await ContactModel.countAll('unread');

    const viewData = {
      title: req.t('admin:title.inbox'),
      messages: result.messages,
      pagination: { page, totalPages, total: result.total, hasNext: page < totalPages, hasPrev: page > 1 },
      currentStatus: status,
      currentSearch: search,
      unreadCount
    };

    if (req.query.fragment === '1') {
      return res.render('admin/partials/inboxTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        messages: result.messages,
        total: result.total,
        page: result.page,
        totalPages
      });
    }

    res.render('admin/inbox', viewData);
  } catch (err) {
    next(err);
  }
};

exports.getMessageDetail = async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/inbox');

    if (isNaN(messageId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidMessageId') });
      req.flash('error', req.t('admin:flash.invalidMessageId'));
      return respond(400, {});
    }

    const message = await ContactModel.getById(messageId);
    if (!message) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.messageNotFound') });
      req.flash('error', req.t('admin:flash.messageNotFound'));
      return respond(404, {});
    }

    const lang = req.language;
    res.json({
      success: true,
      message: {
        id: message.id,
        name: message.name,
        email: message.email,
        phone: message.phone || '',
        subject: message.subject || '',
        message: message.message,
        status: message.status,
        created_at_formatted: message.created_at ? formatDate(message.created_at, lang) : null,
        reply_text: message.reply_text,
        replied_at_formatted: message.replied_at ? formatDate(message.replied_at, lang) : null,
        replied_by_name: formatDisplayName(message.replied_first_name, message.replied_last_name)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/inbox');

    if (isNaN(messageId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidMessageId') });
      req.flash('error', req.t('admin:flash.invalidMessageId'));
      return respond(400, {});
    }

    const message = await ContactModel.getById(messageId);
    if (!message) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.messageNotFound') });
      req.flash('error', req.t('admin:flash.messageNotFound'));
      return respond(404, {});
    }

    await ContactModel.markAsRead(messageId);

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.messageMarkedRead') });
    req.flash('success', req.t('admin:flash.messageMarkedRead'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/inbox');

    if (isNaN(messageId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidMessageId') });
      req.flash('error', req.t('admin:flash.invalidMessageId'));
      return respond(400, {});
    }

    const message = await ContactModel.getById(messageId);
    if (!message) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.messageNotFound') });
      req.flash('error', req.t('admin:flash.messageNotFound'));
      return respond(404, {});
    }

    await ContactModel.delete(messageId);

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.messageDeleted') });
    req.flash('success', req.t('admin:flash.messageDeleted'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.replyToMessage = async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id);
    const { to, subject, reply_text } = req.body;
    const { sendReply } = require('../helpers/mail');
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/inbox');

    if (isNaN(messageId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidMessageId') });
      req.flash('error', req.t('admin:flash.invalidMessageId'));
      return respond(400, {});
    }
    if (!to || !reply_text) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.replyRequired') });
      req.flash('error', req.t('admin:flash.replyRequired'));
      return respond(400, {});
    }

    const message = await ContactModel.getById(messageId);
    if (!message) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.messageNotFound') });
      req.flash('error', req.t('admin:flash.messageNotFound'));
      return respond(404, {});
    }

    const replyText = String(reply_text).trim();
    if (replyText.length > 2000) {
      if (isAjax) return respond(422, { success: false, message: req.t('admin:flash.replyTooLong'), errors: { reply_text: req.t('admin:flash.replyTooLong') } });
      req.flash('error', req.t('admin:flash.replyTooLong'));
      return respond(422, {});
    }

    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:20px;">TechBridge</h2>
      </div>
      <div style="background:#1e293b;padding:32px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        ${replyText.replace(/\n/g, '<br>')}
      </div>
      <div style="background:#0f172a;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center;">
        <p style="color:#64748b;font-size:12px;margin:0;">TechBridge &mdash; Premium Tech Marketplace</p>
      </div>
    </div>`;

    await sendReply({ to, subject: subject || req.t('admin:flash.replySubject'), text: replyText, html });

    await ContactModel.addReply(messageId, replyText, req.session.userId);

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.replySent') });
    req.flash('success', req.t('admin:flash.replySent'));
    respond(200, {});
  } catch (err) {
    console.error('Reply error:', err);
    if (isAjaxRequest(req)) return res.status(500).json({ success: false, message: req.t('admin:flash.replyFailed') });
    req.flash('error', req.t('admin:flash.replyFailed'));
    res.redirect('/admin/inbox');
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const SettingModel = require('../models/SettingModel');
    const settings = await SettingModel.getGroup('general');
    res.render('admin/settings', {
      title: req.t('admin:title.settings'),
      settings
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const SettingModel = require('../models/SettingModel');
    const { site_name, site_url, contact_email, site_description } = req.body;
    await SettingModel.setGroup({
      site_name: site_name || '',
      site_url: site_url || '',
      contact_email: contact_email || '',
      site_description: site_description || ''
    });
    if (isAjaxRequest(req)) {
      return res.status(200).json({ success: true, message: req.t('admin:flash.settingsUpdated') });
    }
    req.flash('success', req.t('admin:flash.settingsUpdated'));
    res.redirect('/admin/settings');
  } catch (err) {
    next(err);
  }
};

exports.getServices = async (req, res, next) => {
  try {
    const services = await ServiceModel.getAllAdmin();
    const viewData = { title: req.t('admin:title.services'), services };

    if (req.query.fragment === '1') {
      return res.render('admin/partials/servicesTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    if (isAjaxRequest(req)) {
      return res.json({ success: true, services });
    }

    res.render('admin/services', viewData);
  } catch (err) {
    next(err);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const { title, category, description, base_price, icon_class, status } = req.body;
    const ajax = isAjaxRequest(req);

    const errors = {};
    if (!title || !String(title).trim()) errors.title = req.t('admin:flash.serviceTitleRequired');
    if (!category || !['computer', 'phone'].includes(category)) errors.category = req.t('admin:flash.serviceCategoryRequired');
    if (base_price === undefined || base_price === '' || isNaN(parseFloat(base_price)) || parseFloat(base_price) < 0) {
      errors.base_price = req.t('admin:flash.servicePriceInvalid');
    }
    if (Object.keys(errors).length > 0) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.serviceRequiredFields'), errors);
      flashFor(req, 'error', 'admin:flash.serviceRequiredFields');
      return res.redirect('/admin/services');
    }

    const slug = generateSlug(title);
    await ServiceModel.create({
      title, slug, category, description, base_price: parseFloat(base_price), icon_class: icon_class || 'fa-tools', status: status || 'active'
    });

    if (ajax) return res.json({ success: true, message: req.t('admin:flash.serviceCreated') });
    req.flash('success', req.t('admin:flash.serviceCreated'));
    res.redirect('/admin/services');
  } catch (err) {
    next(err);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    const serviceId = parseInt(req.params.id);
    const service = await ServiceModel.findById(serviceId);
    const ajax = isAjaxRequest(req);

    if (!service) {
      if (ajax) return rejectWith(res, 404, req.t('admin:flash.serviceNotFound'));
      req.flash('error', req.t('admin:flash.serviceNotFound'));
      return res.redirect('/admin/services');
    }

    const { title, category, description, base_price, icon_class, status } = req.body;

    const errors = {};
    if (title !== undefined && !String(title).trim()) errors.title = req.t('admin:flash.serviceTitleRequired');
    if (base_price !== undefined && (base_price === '' || isNaN(parseFloat(base_price)) || parseFloat(base_price) < 0)) {
      errors.base_price = req.t('admin:flash.servicePriceInvalid');
    }
    if (Object.keys(errors).length > 0) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.serviceRequiredFields'), errors);
      flashFor(req, 'error', 'admin:flash.serviceRequiredFields');
      return res.redirect('/admin/services');
    }

    await ServiceModel.update(serviceId, {
      title: title || service.title,
      slug: title ? generateSlug(title) : service.slug,
      category: category || service.category,
      description: description || service.description,
      base_price: base_price ? parseFloat(base_price) : service.base_price,
      icon_class: icon_class || service.icon_class,
      status: status || service.status
    });

    if (ajax) return res.json({ success: true, message: req.t('admin:flash.serviceUpdated') });
    req.flash('success', req.t('admin:flash.serviceUpdated'));
    res.redirect('/admin/services');
  } catch (err) {
    next(err);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    const serviceId = parseInt(req.params.id);
    const service = await ServiceModel.findById(serviceId);
    const ajax = isAjaxRequest(req);

    if (!service) {
      if (ajax) return rejectWith(res, 404, req.t('admin:flash.serviceNotFound'));
      req.flash('error', req.t('admin:flash.serviceNotFound'));
      return res.redirect('/admin/services');
    }

    await ServiceModel.delete(serviceId);
    if (ajax) return res.json({ success: true, message: req.t('admin:flash.serviceDeleted') });
    req.flash('success', req.t('admin:flash.serviceDeleted'));
    res.redirect('/admin/services');
  } catch (err) {
    next(err);
  }
};

exports.getReviews = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const status = req.query.status || null;
    const search = req.query.search ? String(req.query.search).trim().slice(0, 100) : null;
    const reported = req.query.reported === '1';
    const page = parseInt(req.query.page) || 1;
    const result = await ReviewModel.getAllAdmin({ status, search, reported, page, limit: 20 });
    const totalPages = Math.ceil(result.total / result.limit);
    const pendingCount = await ReviewModel.getPendingCount();
    const reportedCount = await ReviewModel.getReportedCount();

    const viewData = {
      title: req.t('admin:title.reviews'),
      reviews: result.reviews,
      pagination: { page, totalPages, total: result.total, hasNext: page < totalPages, hasPrev: page > 1 },
      currentStatus: status,
      currentSearch: search,
      isReportedFilter: reported,
      pendingCount,
      reportedCount
    };

    if (req.query.fragment === '1') {
      return res.render('admin/partials/reviewsTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        reviews: result.reviews,
        total: result.total,
        page: result.page,
        totalPages
      });
    }

    res.render('admin/reviews', viewData);
  } catch (err) {
    next(err);
  }
};

exports.getReviewDetail = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/reviews');

    if (isNaN(reviewId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidReviewId') });
      req.flash('error', req.t('admin:flash.invalidReviewId'));
      return respond(400, {});
    }

    const review = await ReviewModel.getById(reviewId);
    if (!review) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.reviewNotFound') });
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return respond(404, {});
    }

    const lang = req.language;
    res.json({
      success: true,
      review: {
        id: review.id,
        product_id: review.product_id,
        product_name: review.product_name,
        user_id: review.user_id,
        user_name: formatDisplayName(review.first_name, review.last_name),
        email: review.email,
        title: review.title,
        comment: review.comment,
        rating: review.rating,
        type: review.type,
        status: review.status,
        is_verified: review.is_verified,
        is_hidden: review.is_hidden,
        images: (review.images || []).map(img => toImageUrl(img, 'reviews')),
        helpful_count: review.helpful_count || 0,
        reported_count: review.reported_count || 0,
        seller_reply: review.seller_reply,
        seller_replied_at_formatted: review.seller_replied_at ? formatDate(review.seller_replied_at, lang) : null,
        created_at_formatted: review.created_at ? formatDate(review.created_at, lang) : null
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateReviewStatus = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const { status } = req.body;
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/reviews');

    if (isNaN(reviewId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidReviewId') });
      req.flash('error', req.t('admin:flash.invalidReviewId'));
      return respond(400, {});
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidReviewStatus') });
      req.flash('error', req.t('admin:flash.invalidReviewStatus'));
      return respond(400, {});
    }

    const review = await ReviewModel.getById(reviewId);
    if (!review) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.reviewNotFound') });
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return respond(404, {});
    }

    if (status === 'approved') await ReviewModel.approve(reviewId, req.session.userId);
    else if (status === 'rejected') await ReviewModel.reject(reviewId, req.session.userId);
    else await ReviewModel.setStatus(reviewId, 'pending');

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.reviewStatusUpdated') });
    req.flash('success', req.t('admin:flash.reviewStatusUpdated'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.replyToReview = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const NotificationModel = require('../models/NotificationModel');
    const reviewId = parseInt(req.params.id);
    const reply = String(req.body.reply || '').trim();
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/reviews');

    if (isNaN(reviewId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidReviewId') });
      req.flash('error', req.t('admin:flash.invalidReviewId'));
      return respond(400, {});
    }
    if (!reply) {
      if (isAjax) return respond(422, { success: false, message: req.t('admin:flash.replyTextRequired'), errors: { reply: req.t('admin:flash.replyTextRequired') } });
      req.flash('error', req.t('admin:flash.replyTextRequired'));
      return respond(422, {});
    }
    if (reply.length > 2000) {
      if (isAjax) return respond(422, { success: false, message: req.t('admin:flash.replyTooLong'), errors: { reply: req.t('admin:flash.replyTooLong') } });
      req.flash('error', req.t('admin:flash.replyTooLong'));
      return respond(422, {});
    }

    const review = await ReviewModel.getById(reviewId);
    if (!review) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.reviewNotFound') });
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return respond(404, {});
    }

    await ReviewModel.sellerReply(reviewId, req.session.userId, reply);

    if (review.user_id) {
      await NotificationModel.create(review.user_id, {
        title: req.t('admin:flash.reviewReplyTitle'),
        message: req.t('admin:flash.reviewReplyMessage'),
        type: 'review',
        link: review.product_id ? `/shop/${review.product_slug || ''}#reviews` : '/dashboard/reviews'
      });
    }

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.reviewReplied') });
    req.flash('success', req.t('admin:flash.reviewReplied'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.toggleReviewHidden = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/reviews');

    if (isNaN(reviewId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidReviewId') });
      req.flash('error', req.t('admin:flash.invalidReviewId'));
      return respond(400, {});
    }

    const review = await ReviewModel.getById(reviewId);
    if (!review) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.reviewNotFound') });
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return respond(404, {});
    }

    const updated = await ReviewModel.toggleHidden(reviewId);
    const message = req.t(updated.is_hidden ? 'admin:flash.reviewHidden' : 'admin:flash.reviewUnhidden');

    if (isAjax) return respond(200, { success: true, message });
    req.flash('success', message);
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.resolveReviewReport = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reportId = parseInt(req.params.id);
    const action = req.body.action === 'dismissed' ? 'dismissed' : 'resolved';
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/reviews?reported=1');

    await ReviewModel.resolveReport(reportId, action);

    const message = req.t(action === 'dismissed' ? 'admin:flash.reportDismissed' : 'admin:flash.reportResolved');
    if (isAjax) return respond(200, { success: true, message });
    req.flash('success', message);
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.approveReview = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/reviews');

    if (isNaN(reviewId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidReviewId') });
      req.flash('error', req.t('admin:flash.invalidReviewId'));
      return respond(400, {});
    }

    const review = await ReviewModel.getById(reviewId);
    if (!review) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.reviewNotFound') });
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return respond(404, {});
    }

    await ReviewModel.approve(reviewId, req.session.userId);

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.reviewApproved') });
    req.flash('success', req.t('admin:flash.reviewApproved'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.rejectReview = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/reviews');

    if (isNaN(reviewId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidReviewId') });
      req.flash('error', req.t('admin:flash.invalidReviewId'));
      return respond(400, {});
    }

    const review = await ReviewModel.getById(reviewId);
    if (!review) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.reviewNotFound') });
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return respond(404, {});
    }

    await ReviewModel.reject(reviewId, req.session.userId);

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.reviewRejected') });
    req.flash('success', req.t('admin:flash.reviewRejected'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.getEditReview = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const Products = require('../models/ProductModel');
    const review = await ReviewModel.getById(reviewId);

    if (!review) {
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return res.redirect('/admin/reviews');
    }

    const products = await Products.getFiltered({ allStatuses: true });

    res.render('admin/review-form', {
      title: req.t('admin:title.reviewForm'),
      review,
      products: products.products || []
    });
  } catch (err) {
    next(err);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const UserModel = require('../models/UserModel');
    const reviewId = parseInt(req.params.id);
    const { user_id, product_id, rating, comment, type, status } = req.body;

    const review = await ReviewModel.getById(reviewId);
    if (!review) {
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return res.redirect('/admin/reviews');
    }

    if (!rating || rating < 1 || rating > 5) {
      req.flash('error', req.t('admin:flash.ratingOutOfRange'));
      return res.redirect('/admin/reviews/' + reviewId + '/edit');
    }

    await ReviewModel.update(reviewId, {
      rating: parseInt(rating),
      comment: comment || null,
      title: req.body.title || null,
      status: status || 'pending',
      is_verified: req.body.is_verified === '1' || req.body.is_verified === true
    });

    const targetProductId = parseInt(product_id) || review.product_id;
    if (targetProductId) {
      await ReviewModel.updateProductRating(targetProductId);
    }

    if (status === 'approved' && review.status !== 'approved') {
      await ReviewModel.approve(reviewId, req.session.userId);
    }

    req.flash('success', req.t('admin:flash.reviewUpdated'));
    res.redirect('/admin/reviews');
  } catch (err) {
    next(err);
  }
};

exports.createReview = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const { user_id, product_id, rating, comment, type, status } = req.body;
    const ajax = isAjaxRequest(req);

    const errors = {};
    if (!user_id) errors.user_id = req.t('admin:flash.reviewRequiredFields');
    if (!product_id) errors.product_id = req.t('admin:flash.reviewRequiredFields');
    if (!rating || rating < 1 || rating > 5) errors.rating = req.t('admin:flash.ratingOutOfRange');

    if (Object.keys(errors).length > 0) {
      if (ajax) return rejectWith(res, 422, req.t('admin:flash.reviewRequiredFields'), errors);
      req.flash('error', req.t('admin:flash.reviewRequiredFields'));
      return res.redirect('/admin/reviews');
    }

    const created = await ReviewModel.create({
      user_id: parseInt(user_id),
      product_id: parseInt(product_id),
      rating: parseInt(rating),
      title: req.body.title || null,
      comment: comment || null,
      type: type || 'product',
      status: status || 'approved',
      is_verified: true
    });

    if (ajax) {
      return res.json({
        success: true,
        message: req.t('admin:flash.reviewCreated'),
        review: { id: created.id, rating: created.rating }
      });
    }
    req.flash('success', req.t('admin:flash.reviewCreated'));
    res.redirect('/admin/reviews');
  } catch (err) {
    next(err);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/reviews');

    if (isNaN(reviewId)) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidReviewId') });
      req.flash('error', req.t('admin:flash.invalidReviewId'));
      return respond(400, {});
    }

    const review = await ReviewModel.getById(reviewId);
    if (!review) {
      if (isAjax) return respond(404, { success: false, message: req.t('admin:flash.reviewNotFound') });
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return respond(404, {});
    }

    await ReviewModel.delete(reviewId);

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.reviewDeleted') });
    req.flash('success', req.t('admin:flash.reviewDeleted'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const { range, start_date, end_date, category, search } = req.query;
    const { pool } = require('../config/db');

    var dateWhere = '';
    var dateParams = [];
    var now = new Date();

    if (range === 'custom' && start_date && end_date) {
      dateWhere = 'AND rr.created_at >= ? AND rr.created_at <= DATE_ADD(?, INTERVAL 1 DAY)';
      dateParams = [start_date, end_date];
    } else if (range === '30days') {
      var d = new Date(now); d.setDate(d.getDate() - 30);
      dateWhere = 'AND rr.created_at >= ?'; dateParams = [d.toISOString().slice(0, 19).replace('T', ' ')];
    } else if (range === '90days') {
      var d = new Date(now); d.setDate(d.getDate() - 90);
      dateWhere = 'AND rr.created_at >= ?'; dateParams = [d.toISOString().slice(0, 19).replace('T', ' ')];
    } else if (range === 'year') {
      var d = new Date(now); d.setFullYear(d.getFullYear() - 1);
      dateWhere = 'AND rr.created_at >= ?'; dateParams = [d.toISOString().slice(0, 19).replace('T', ' ')];
    } else {
      var d = new Date(now); d.setDate(d.getDate() - 7);
      dateWhere = 'AND rr.created_at >= ?'; dateParams = [d.toISOString().slice(0, 19).replace('T', ' ')];
    }

    var catWhere = '';
    var catParams = [];
    if (category && category !== 'all') {
      catWhere = 'AND s.category = ?';
      catParams = [category];
    }

    var [repairStats] = await pool.execute(
      `SELECT rr.status, COUNT(*) AS count FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       WHERE 1=1 ${dateWhere} ${catWhere}
       GROUP BY rr.status ORDER BY FIELD(rr.status,'pending','assigned','diagnosing','in_repair','awaiting_parts','completed','cancelled')`,
      [...dateParams, ...catParams]
    );
    var totalRepairs = repairStats.reduce(function(s, r) { return s + r.count; }, 0);
    var pendingRepairs = 0, inProgress = 0, completedRepairs = 0;
    repairStats.forEach(function(r) {
      if (r.status === 'pending' || r.status === 'assigned') pendingRepairs += r.count;
      else if (r.status === 'diagnosing' || r.status === 'in_repair' || r.status === 'awaiting_parts') inProgress += r.count;
      else if (r.status === 'completed') completedRepairs += r.count;
    });

    var [revRow] = await pool.execute(
      `SELECT COALESCE(SUM(rr.actual_cost), 0) AS revenue FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       WHERE rr.status = 'completed' ${dateWhere} ${catWhere}`,
      [...dateParams, ...catParams]
    );
    var repairRevenue = parseFloat(revRow[0].revenue);

    var [turnRow] = await pool.execute(
      `SELECT AVG(TIMESTAMPDIFF(HOUR, rr.created_at, rr.updated_at)) AS avg_hours
       FROM repair_requests rr LEFT JOIN services s ON rr.service_id = s.id
       WHERE rr.status = 'completed' AND rr.updated_at IS NOT NULL ${dateWhere} ${catWhere}`,
      [...dateParams, ...catParams]
    );
    var avgTurnaround = turnRow[0].avg_hours ? Math.round(turnRow[0].avg_hours) : null;

    var svcWhere = '';
    var svcParams = [];
    if (search) {
      svcWhere = 'AND s.title LIKE ?';
      svcParams = ['%' + search + '%'];
    }

    var [serviceStats] = await pool.execute(
      `SELECT s.id, s.title, s.category, s.base_price, s.icon_class,
              COUNT(rr.id) AS total_bookings,
              SUM(CASE WHEN rr.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
              SUM(CASE WHEN rr.status IN ('pending','assigned') THEN 1 ELSE 0 END) AS pending_count,
              COALESCE(SUM(rr.actual_cost), 0) AS total_revenue,
              AVG(CASE WHEN rr.status = 'completed' AND rr.updated_at IS NOT NULL
                THEN TIMESTAMPDIFF(HOUR, rr.created_at, rr.updated_at) END) AS avg_completion_hours
       FROM services s
       LEFT JOIN repair_requests rr ON rr.service_id = s.id
       WHERE s.status = 'active' ${catWhere} ${svcWhere}
       GROUP BY s.id, s.title, s.category, s.base_price, s.icon_class
       ORDER BY total_bookings DESC`,
      [...catParams, ...svcParams]
    );

    var topService = null;
    if (serviceStats.length > 0) {
      var sorted = serviceStats.slice().sort(function(a, b) { return b.total_bookings - a.total_bookings; });
      topService = sorted[0];
    }

    res.render('admin/analytics', {
      title: req.t('admin:title.analytics'),
      repairStats,
      totalRepairs,
      pendingRepairs,
      inProgress,
      completedRepairs,
      repairRevenue,
      avgTurnaround,
      serviceStats,
      topService,
      range: range || '7days',
      start_date: start_date || '',
      end_date: end_date || '',
      category: category || 'all',
      search: search || ''
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Marketing Officer management (role + permission management — super admin only)
// ---------------------------------------------------------------------------

/**
 * Permission toggles exposed in the marketing-officer editor. Drawn from the
 * central catalog so the UI can never drift from the real authorization model.
 */
const MARKETING_PERMISSIONS = [
  { key: PERMISSIONS.VIEW_DASHBOARD, label: 'marketing:permissions.dashboard' },
  { key: PERMISSIONS.MANAGE_CAMPAIGNS, label: 'marketing:permissions.campaigns' },
  { key: PERMISSIONS.MANAGE_PROMOTIONS, label: 'marketing:permissions.promotions' },
  { key: PERMISSIONS.MANAGE_COUPONS, label: 'marketing:permissions.coupons' },
  { key: PERMISSIONS.MANAGE_FEATURED_PRODUCTS, label: 'marketing:permissions.featured_products' },
  { key: PERMISSIONS.MANAGE_BLOG, label: 'marketing:permissions.blog' },
  { key: PERMISSIONS.MANAGE_BANNERS, label: 'marketing:permissions.banners' },
  { key: PERMISSIONS.MANAGE_ANNOUNCEMENTS, label: 'marketing:permissions.announcements' },
  { key: PERMISSIONS.MANAGE_TESTIMONIALS, label: 'marketing:permissions.testimonials' },
  { key: PERMISSIONS.MANAGE_REVIEWS, label: 'marketing:permissions.reviews' },
  { key: PERMISSIONS.MANAGE_MESSAGES, label: 'marketing:permissions.feedback' },
  { key: PERMISSIONS.MANAGE_NEWSLETTERS, label: 'marketing:permissions.newsletters' },
  { key: PERMISSIONS.VIEW_MARKETING_ANALYTICS, label: 'marketing:permissions.analytics' },
  { key: PERMISSIONS.MANAGE_PROFILE, label: 'marketing:permissions.profile' },
  { key: PERMISSIONS.MANAGE_SETTINGS, label: 'marketing:permissions.settings' }
];

async function getMarketingPermissionMap(userId) {
  const [rows] = await pool.execute(
    'SELECT permission, granted FROM user_permissions WHERE user_id = ?',
    [userId]
  );
  const map = {};
  rows.forEach((r) => { map[r.permission] = Number(r.granted); });
  return map;
}

exports.getMarketingOfficers = async (req, res, next) => {
  try {
    const search = req.query.search || null;
    const page = parseInt(req.query.page) || 1;
    const { users, total } = await UserModel.getAll({ role: 'marketing_officer', search, page, limit: 20 });
    const totalPages = Math.ceil(total / 20);
    const [activityCount] = await pool.execute(
      "SELECT COUNT(*) AS count FROM activity_logs WHERE role = 'marketing_officer'"
    );

    const viewData = {
      title: req.t('admin:title.marketingOfficers'),
      officers: users,
      currentSearch: search,
      activityCount: activityCount[0].count,
      pagination: { page, limit: 20, totalPages, total, hasNext: page < totalPages, hasPrev: page > 1 },
      marketingPermissions: MARKETING_PERMISSIONS.map((p) => ({ key: p.key, label: req.t(p.label) }))
    };

    if (req.query.fragment === '1') {
      return res.render('admin/partials/officersTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    if (isAjaxRequest(req)) {
      return res.json({ success: true, officers: users, total, page, totalPages });
    }

    res.render('admin/marketing-officers', viewData);
  } catch (err) {
    next(err);
  }
};

exports.getMarketingOfficerDetail = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      return res.status(404).json({ success: false, message: req.t('admin:flash.userNotFound') });
    }
    const permissions = await getMarketingPermissionMap(userId);
    res.json({
      success: true,
      user: {
        id: target.id,
        first_name: target.first_name,
        last_name: target.last_name,
        email: target.email,
        phone: target.phone || '',
        status: target.status,
        created_at_formatted: target.created_at ? formatDate(target.created_at, req.language) : null
      },
      permissions
    });
  } catch (err) {
    next(err);
  }
};

exports.getCreateMarketingOfficer = (req, res) => {
  res.render('admin/marketing-officer-form', {
    title: req.t('admin:title.createMarketingOfficer'),
    user: null,
    editing: false,
    MARKETING_PERMISSIONS,
    permissions: {}
  });
};

exports.createMarketingOfficer = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/marketing-officers');

    const errors = {};
    if (!first_name) errors.first_name = req.t('admin:flash.userRequiredFields');
    if (!last_name) errors.last_name = req.t('admin:flash.userRequiredFields');
    if (!email) errors.email = req.t('admin:flash.userRequiredFields');
    if (!password || password.length < 6) errors.password = req.t('admin:flash.passwordTooShort');
    if (Object.keys(errors).length > 0) {
      const message = req.t('admin:flash.userRequiredFields');
      if (isAjax) return respond(422, { success: false, message, errors });
      req.flash('error', message);
      return respond(422, {});
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const message = req.t('admin:flash.emailExists');
      if (isAjax) return respond(422, { success: false, message, errors: { email: message } });
      req.flash('error', message);
      return respond(422, {});
    }

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const created = await UserModel.create({
      first_name, last_name, email, phone, password: hashed, role: 'marketing_officer'
    });

    await applyMarketingPermissions(created.id, extractPermissions(req.body));
    await logActivity(req, 'create', 'marketing_officer', created.id);

    const message = req.t('admin:flash.marketingOfficerCreated', { name: first_name + ' ' + last_name });
    if (isAjax) return respond(200, { success: true, message });
    req.flash('success', message);
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

async function applyMarketingPermissions(userId, permissions) {
  const selected = permissions || {};
  await pool.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
  for (const perm of MARKETING_PERMISSIONS) {
    const choice = selected[perm.key];
    if (choice === 'allow') {
      await pool.execute(
        'INSERT INTO user_permissions (user_id, permission, granted) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE granted = 1',
        [userId, perm.key]
      );
    } else if (choice === 'deny') {
      await pool.execute(
        'INSERT INTO user_permissions (user_id, permission, granted) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE granted = 0',
        [userId, perm.key]
      );
    }
  }
}

function extractPermissions(body) {
  const result = {};
  if (!body || typeof body !== 'object') return result;
  if (body.permissions && typeof body.permissions === 'object') return body.permissions;
  for (const key of Object.keys(body)) {
    const m = /^permissions\[(.+)\]$/.exec(key);
    if (m) result[m[1]] = body[key];
  }
  return result;
}

exports.getEditMarketingOfficer = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/marketing-officers');
    }
    const permissions = await getMarketingPermissionMap(userId);
    res.render('admin/marketing-officer-form', {
      title: req.t('admin:title.editMarketingOfficer'),
      user: target,
      editing: true,
      MARKETING_PERMISSIONS,
      permissions
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMarketingOfficer = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { first_name, last_name, email, phone, status, password } = req.body;
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/marketing-officers');

    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      const message = req.t('admin:flash.userNotFound');
      if (isAjax) return respond(404, { success: false, message });
      req.flash('error', message);
      return respond(404, {});
    }

    const errors = {};
    if (!first_name) errors.first_name = req.t('admin:flash.userRequiredFields');
    if (!last_name) errors.last_name = req.t('admin:flash.userRequiredFields');
    if (password && password.length < 6) errors.password = req.t('admin:flash.passwordTooShort');
    if (Object.keys(errors).length > 0) {
      const message = req.t('admin:flash.userRequiredFields');
      if (isAjax) return respond(422, { success: false, message, errors });
      req.flash('error', message);
      return respond(422, {});
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    const newStatus = validStatuses.includes(status) ? status : target.status;

    if (email && email !== target.email) {
      const existing = await UserModel.findByEmail(email);
      if (existing && existing.id !== userId) {
        const message = req.t('admin:flash.emailExists');
        if (isAjax) return respond(422, { success: false, message, errors: { email: message } });
        req.flash('error', message);
        return respond(422, {});
      }
    }

    await UserModel.adminUpdate(userId, {
      first_name: first_name || target.first_name,
      last_name: last_name || target.last_name,
      email: email || target.email,
      phone: phone || target.phone,
      role: 'marketing_officer',
      status: newStatus,
      password: password || null
    });

    const permMap = extractPermissions(req.body);
    if (Object.keys(permMap).length > 0) {
      await applyMarketingPermissions(userId, permMap);
    }

    await logActivity(req, 'update', 'marketing_officer', userId);

    const message = req.t('admin:flash.marketingOfficerUpdated');
    if (isAjax) return respond(200, { success: true, message });
    req.flash('success', message);
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.updateMarketingOfficerStatus = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/marketing-officers');
    const validStatuses = ['active', 'inactive', 'suspended'];

    if (!validStatuses.includes(status)) {
      const message = req.t('admin:flash.invalidStatus');
      if (isAjax) return respond(400, { success: false, message });
      req.flash('error', message);
      return respond(400, {});
    }

    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      const message = req.t('admin:flash.userNotFound');
      if (isAjax) return respond(404, { success: false, message });
      req.flash('error', message);
      return respond(404, {});
    }

    await UserModel.updateStatus(userId, status);
    await logActivity(req, status === 'active' ? 'activate' : 'deactivate', 'marketing_officer', userId);

    const message = req.t('admin:flash.marketingOfficerStatusUpdated');
    if (isAjax) return respond(200, { success: true, message, status });
    req.flash('success', message);
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.resetMarketingOfficerPassword = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { password } = req.body;
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/marketing-officers');

    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      const message = req.t('admin:flash.userNotFound');
      if (isAjax) return respond(404, { success: false, message });
      req.flash('error', message);
      return respond(404, {});
    }

    if (!password || password.length < 6) {
      const errors = { password: req.t('admin:flash.passwordTooShort') };
      if (isAjax) return respond(422, { success: false, message: req.t('admin:flash.passwordTooShort'), errors });
      req.flash('error', req.t('admin:flash.passwordTooShort'));
      return respond(422, {});
    }

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    await UserModel.updatePassword(userId, hashed);
    await logActivity(req, 'reset_password', 'marketing_officer', userId);

    const message = req.t('admin:flash.passwordReset');
    if (isAjax) return respond(200, { success: true, message });
    req.flash('success', message);
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.getMarketingOfficerPermissions = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/marketing-officers');
    }
    const permissions = await getMarketingPermissionMap(userId);
    res.render('admin/marketing-officer-permissions', {
      title: req.t('admin:title.marketingOfficerPermissions'),
      user: target,
      MARKETING_PERMISSIONS,
      permissions
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMarketingOfficerPermissions = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/marketing-officers');

    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      const message = req.t('admin:flash.userNotFound');
      if (isAjax) return respond(404, { success: false, message });
      req.flash('error', message);
      return respond(404, {});
    }
    await applyMarketingPermissions(userId, extractPermissions(req.body));
    await logActivity(req, 'update_permissions', 'marketing_officer', userId);

    const message = req.t('admin:flash.permissionsUpdated');
    if (isAjax) return respond(200, { success: true, message });
    req.flash('success', message);
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Role Management (super admin only)
// ---------------------------------------------------------------------------

exports.getRoles = async (req, res, next) => {
  try {
    const roles = Object.values(ROLES).map((role) => ({
      role,
      nameKey: ROLE_NAMES[role]
    }));

    const rolesWithPermissions = [];
    const rolePermissionMap = {};
    for (const entry of roles) {
      const current = await getRolePermissions(entry.role);
      rolesWithPermissions.push({ ...entry, permissions: current });
      rolePermissionMap[entry.role] = current;
    }

    const modulePermissions = PERMISSION_MODULES.map((mod) => ({
      key: mod.key,
      label: mod.label,
      permissions: mod.permissions
    }));

    const viewData = {
      title: req.t('admin:title.roleManagement'),
      roles: rolesWithPermissions,
      modulePermissions,
      rolePermissionMap,
      ALL_PERMISSIONS: modulePermissions.flatMap((m) => m.permissions)
    };

    if (req.query.fragment === '1') {
      return res.render('admin/partials/rolesTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    if (isAjaxRequest(req)) {
      return res.json({ success: true, roles: rolesWithPermissions, rolePermissionMap });
    }

    res.render('admin/roles', viewData);
  } catch (err) {
    next(err);
  }
};

exports.updateRolePermissions = async (req, res, next) => {
  try {
    const role = req.params.role;
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/roles');

    if (!ROLE_NAMES[role]) {
      if (isAjax) return respond(400, { success: false, message: req.t('admin:flash.invalidRole') });
      req.flash('error', req.t('admin:flash.invalidRole'));
      return respond(400, {});
    }

    // Never allow a role to be stripped to nothing unexpectedly; super_admin is
    // always treated as having every permission regardless of DB rows.
    let selected = req.body.permissions;
    if (!Array.isArray(selected)) {
      selected = selected ? [selected] : [];
    }
    selected = selected.filter((p) => ROLE_PERMISSIONS[role].includes(p));

    if (role === ROLES.SUPER_ADMIN) {
      selected = Object.values(PERMISSIONS);
    }

    await setRolePermissions(role, selected);
    await logActivity(req, 'update_permissions', 'role', null);

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.rolePermissionsUpdated'), permissions: selected });
    req.flash('success', req.t('admin:flash.rolePermissionsUpdated'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Permission Management (super admin only)
// ---------------------------------------------------------------------------

exports.getPermissions = async (req, res, next) => {
  try {
    const rows = await getCatalogPermissions();
    const viewData = {
      title: req.t('admin:title.permissionManagement'),
      permissions: rows
    };

    if (req.query.fragment === '1') {
      return res.render('admin/partials/permissionsList', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    if (isAjaxRequest(req)) {
      return res.json({ success: true, permissions: rows });
    }

    res.render('admin/permissions', viewData);
  } catch (err) {
    next(err);
  }
};

exports.addPermission = async (req, res, next) => {
  try {
    const isAjax = isAjaxRequest(req);
    const respond = (statusCode, data) => isAjax ? res.status(statusCode).json(data) : res.redirect('/admin/permissions');

    const permission = String(req.body.permission || '').trim();
    const module = String(req.body.module || 'general').trim() || 'general';
    const description = String(req.body.description || '').trim() || null;

    if (!/^[a-z][a-z0-9_]{1,99}$/.test(permission)) {
      const errors = { permission: req.t('admin:flash.invalidPermissionName') };
      if (isAjax) return respond(422, { success: false, message: req.t('admin:flash.invalidPermissionName'), errors });
      req.flash('error', req.t('admin:flash.invalidPermissionName'));
      return respond(422, {});
    }

    await addCatalogPermission(permission, module, description);
    await logActivity(req, 'create', 'permission', null);

    if (isAjax) return respond(200, { success: true, message: req.t('admin:flash.permissionAdded') });
    req.flash('success', req.t('admin:flash.permissionAdded'));
    respond(200, {});
  } catch (err) {
    next(err);
  }
};

exports.getActivityLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const offset = (page - 1) * limit;
    const roleFilter = req.query.role || null;
    const actionFilter = req.query.action || null;
    const search = req.query.search || null;

    const conditions = [];
    const params = [];
    if (roleFilter) {
      conditions.push('role = ?');
      params.push(roleFilter);
    }
    if (actionFilter) {
      conditions.push('action = ?');
      params.push(actionFilter);
    }
    if (search) {
      conditions.push('(username LIKE ? OR resource LIKE ?)');
      const term = '%' + search + '%';
      params.push(term, term);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [logs] = await pool.execute(
      `SELECT * FROM activity_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRow] = await pool.execute(
      `SELECT COUNT(*) AS total FROM activity_logs ${where}`,
      params
    );

    const total = countRow[0].total;
    const totalPages = Math.ceil(total / limit);

    const [actions] = await pool.execute('SELECT DISTINCT action FROM activity_logs ORDER BY action');
    const [roles] = await pool.execute('SELECT DISTINCT role FROM activity_logs ORDER BY role');

    const viewData = {
      title: req.t('admin:title.activityLogs'),
      logs,
      pagination: { page, limit, totalPages, total, hasNext: page < totalPages, hasPrev: page > 1 },
      currentRole: roleFilter,
      currentAction: actionFilter,
      currentSearch: search,
      actions: actions.map((a) => a.action),
      roles: roles.map((r) => r.role)
    };

    if (req.query.fragment === '1') {
      return res.render('admin/partials/activityLogsTable', viewData, (err, html) => {
        if (err) return next(err);
        res.json({ success: true, html });
      });
    }

    if (isAjaxRequest(req)) {
      return res.json({
        success: true,
        logs,
        total,
        page,
        totalPages
      });
    }

    res.render('admin/activity-logs', viewData);
  } catch (err) {
    next(err);
  }
};
