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
const { generateSlug, generateSku } = require('../utils/helpers');
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
    const page = parseInt(req.query.page) || 1;
    const role = req.query.role || null;
    const search = req.query.search || null;

    const { users, total, limit } = await UserModel.getAll({ role, search, page, limit: 20 });
    const totalPages = Math.ceil(total / limit);

    res.render('admin/users', {
      title: req.t('admin:title.users'),
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

    if (!first_name || !last_name || !email || !password) {
      req.flash('error', req.t('admin:flash.userRequiredFields'));
      return res.redirect('/admin/users/new');
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      req.flash('error', req.t('admin:flash.emailExists'));
      return res.redirect('/admin/users/new');
    }

    const validRoles = ['customer', 'technician', 'admin', 'super_admin', 'marketing_officer'];
    const validStatuses = ['active', 'inactive', 'suspended'];
    const userRole = validRoles.includes(role) ? role : 'customer';
    const userStatus = validStatuses.includes(status) ? status : 'active';

    if (userRole === 'admin' && req.session.userRole !== 'super_admin') {
      req.flash('error', req.t('admin:flash.createAdminRestricted'));
      return res.redirect('/admin/users/new');
    }

    if (userRole === 'super_admin' && req.session.userRole !== 'super_admin') {
      req.flash('error', req.t('admin:flash.createSuperAdminRestricted'));
      return res.redirect('/admin/users/new');
    }

    await UserModel.create({
      first_name, last_name, email, phone, password, role: userRole
    });

    if (userStatus !== 'active') {
      const created = await UserModel.findByEmail(email);
      if (created) await UserModel.updateStatus(created.id, userStatus);
    }

    req.flash('success', req.t('admin:flash.userCreated', { name: first_name + ' ' + last_name }));
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

exports.getEditUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      req.flash('error', req.t('admin:flash.invalidUserId'));
      return res.redirect('/admin/users');
    }

    const target = await UserModel.findById(userId);

    if (!target) {
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/users');
    }

    if (target.role === 'super_admin' && req.session.userRole !== 'super_admin') {
      req.flash('error', req.t('admin:flash.cannotEditSuperAdmin'));
      return res.redirect('/admin/users');
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
    if (isNaN(userId)) {
      req.flash('error', req.t('admin:flash.invalidUserId'));
      return res.redirect('/admin/users');
    }

    const { first_name, last_name, email, phone, role, status, password } = req.body;

    const target = await UserModel.findById(userId);
    if (!target) {
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/users');
    }

    if (target.role === 'super_admin' && req.session.userRole !== 'super_admin') {
      req.flash('error', req.t('admin:flash.cannotModifySuperAdmin'));
      return res.redirect('/admin/users');
    }

    if (userId === Number(req.session.userId) && role && role !== target.role) {
      req.flash('error', req.t('admin:flash.cannotChangeOwnRole'));
      return res.redirect('/admin/users');
    }

    if (userId === Number(req.session.userId) && status && status !== target.status) {
      req.flash('error', req.t('admin:flash.cannotChangeOwnStatus'));
      return res.redirect('/admin/users');
    }

    if (role && !['customer', 'technician', 'admin', 'super_admin', 'marketing_officer'].includes(role)) {
      req.flash('error', req.t('admin:flash.invalidRole'));
      return res.redirect('/admin/users');
    }

    if (status && !['active', 'inactive', 'suspended'].includes(status)) {
      req.flash('error', req.t('admin:flash.invalidStatus'));
      return res.redirect('/admin/users');
    }

    if (role && role !== target.role) {
      if (role === 'admin' && req.session.userRole !== 'super_admin') {
        req.flash('error', req.t('admin:flash.adminRoleRestricted'));
        return res.redirect('/admin/users');
      }
      if (role === 'super_admin' && req.session.userRole !== 'super_admin') {
        req.flash('error', req.t('admin:flash.superAdminRoleRestricted'));
        return res.redirect('/admin/users');
      }
    }

    if (email !== target.email) {
      const existing = await UserModel.findByEmail(email);
      if (existing) {
        req.flash('error', req.t('admin:flash.emailExists'));
        return res.redirect('/admin/users/' + userId + '/edit');
      }
    }

    await UserModel.adminUpdate(userId, {
      first_name: first_name || target.first_name,
      last_name: last_name || target.last_name,
      email: email || target.email,
      phone: phone || target.phone,
      role: role || target.role,
      status: status || target.status,
      password: password || null
    });

    req.flash('success', req.t('admin:flash.userUpdated'));
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      req.flash('error', req.t('admin:flash.invalidUserId'));
      return res.redirect('/admin/users');
    }

    if (userId === Number(req.session.userId)) {
      req.flash('error', req.t('admin:flash.cannotDeleteOwn'));
      return res.redirect('/admin/users');
    }

    const target = await UserModel.findById(userId);
    if (!target) {
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/users');
    }

    if (target.role === 'super_admin' && req.session.userRole !== 'super_admin') {
      req.flash('error', req.t('admin:flash.cannotDeleteSuperAdmin'));
      return res.redirect('/admin/users');
    }

    await UserModel.delete(userId);
    req.flash('success', req.t('admin:flash.userDeleted', { name: target.first_name + ' ' + target.last_name }));
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await ProductModel.getFiltered({ allStatuses: true });
    const categories = await CategoryModel.getAll();

    res.render('admin/products', {
      title: req.t('admin:title.products'),
      products: products.products,
      categories
    });
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
    const { name, description, price, discount_price, category_id, stock_quantity, sku } = req.body;

    if (!name || !price || !category_id) {
      req.flash('error', req.t('admin:flash.productRequiredFields'));
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
        status: 'active',
        featured: 0,
        sku: finalSku || null
      });
    } catch (err) {
      if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
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
      req.flash('error', req.t('admin:flash.productNotFound'));
      return res.redirect('/admin/products');
    }

    const categories = await CategoryModel.getAll();
    const gallery = await ProductImageModel.getByProduct(product.id);
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

    if (!product) {
      req.flash('error', req.t('admin:flash.productNotFound'));
      return res.redirect('/admin/products');
    }

    const { name, description, price, discount_price, category_id, stock_quantity, sku } = req.body;

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
        sku: finalSku
      });
    } catch (err) {
      if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
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
    const result = await RepairModel.getAll({});
    const technicians = await UserModel.getTechnicians();

    res.render('admin/repairs', {
      title: req.t('admin:title.repairs'),
      repairs: result.repairs,
      technicians
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
      req.flash('error', req.t('admin:flash.selectTechnician'));
      return res.redirect('/admin/repairs');
    }

    const [existing] = await pool.execute(
      'SELECT technician_id FROM repair_requests WHERE id = ?',
      [repairId]
    );
    if (existing.length > 0 && existing[0].technician_id) {
      if (req.session.userRole !== 'super_admin') {
        req.flash('error', req.t('admin:flash.reassignRestricted'));
        return res.redirect('/admin/repairs');
      }
    }

    await pool.execute(
      'UPDATE repair_requests SET technician_id = ?, status = ? WHERE id = ?',
      [parseInt(technician_id), 'assigned', repairId]
    );

    const [repair] = await pool.execute(
      'SELECT user_id, reference_number FROM repair_requests WHERE id = ?',
      [repairId]
    );
    const repairData = repair[0];

    if (repairData && repairData.user_id) {
      await NotificationModel.create(repairData.user_id, {
        title: req.t('admin:flash.repairAssignedTitle'),
        message: req.t('admin:flash.repairAssignedMessage', { ref: repairData.reference_number }),
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
        message: req.t('admin:flash.newAssignmentMessage', { ref: repairData.reference_number }),
        type: 'repair',
        link: '/technician/repairs'
      });
    }

    req.flash('success', req.t('admin:flash.technicianAssigned'));
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
      title: req.t('admin:title.orders'),
      orders
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
      req.flash('error', req.t('admin:flash.invalidStatus'));
      return res.redirect('/admin/orders');
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      req.flash('error', req.t('admin:flash.orderNotFound'));
      return res.redirect('/admin/orders');
    }

    await pool.execute('UPDATE orders SET order_status = ? WHERE id = ?', [status, orderId]);

    if (status === 'delivered' && order.user_id) {
      await NotificationModel.create(order.user_id, {
        title: req.t('admin:flash.orderDeliveredTitle'),
        message: req.t('admin:flash.orderDeliveredMessage', { ref: order.order_reference || orderId }),
        type: 'order',
        link: `/dashboard/orders/${orderId}`
      });
    }

    req.flash('success', req.t('admin:flash.orderStatusUpdated'));
    res.redirect('/admin/orders');
  } catch (err) {
    next(err);
  }
};

exports.getCourses = async (req, res, next) => {
  try {
    const modules = await CourseModel.getAll();
    res.render('admin/training', {
      title: req.t('admin:title.training'),
      modules
    });
  } catch (err) {
    next(err);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, duration, level, price, instructor } = req.body;

    if (!title) {
      req.flash('error', req.t('admin:flash.courseTitleRequired'));
      return res.redirect('/admin/training');
    }

    const slug = generateSlug(title);

    const courseImage = req.file ? await processUploadedFile(req.file, 'courses') : '';

    await CourseModel.create({
      title,
      slug,
      description: description || '',
      duration: duration || '',
      status: 'draft',
      level: level || 'Beginner',
      price: parseFloat(price) || 0,
      image_path: courseImage
    });

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

    if (!course) {
      req.flash('error', req.t('admin:flash.courseNotFound'));
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

    req.flash('success', req.t('admin:flash.courseUpdated'));
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
      req.flash('error', req.t('admin:flash.courseNotFound'));
      return res.redirect('/admin/training');
    }

    await CourseModel.delete(courseId);
    req.flash('success', req.t('admin:flash.courseDeleted'));
    res.redirect('/admin/training');
  } catch (err) {
    next(err);
  }
};

exports.getInbox = async (req, res, next) => {
  try {
    const { messages } = await ContactModel.getAll({});
    res.render('admin/inbox', {
      title: req.t('admin:title.inbox'),
      messages
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id);
    await pool.execute("UPDATE contact_messages SET status = 'read' WHERE id = ?", [messageId]);
    req.flash('success', req.t('admin:flash.messageMarkedRead'));
    res.redirect('/admin/inbox');
  } catch (err) {
    next(err);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id);
    const ContactModel = require('../models/ContactModel');
    await ContactModel.delete(messageId);
    req.flash('success', req.t('admin:flash.messageDeleted'));
    res.redirect('/admin/inbox');
  } catch (err) {
    next(err);
  }
};

exports.replyToMessage = async (req, res, next) => {
  try {
    const messageId = parseInt(req.params.id);
    const { to, subject, reply_text } = req.body;
    const { sendReply } = require('../helpers/mail');
    const ContactModel = require('../models/ContactModel');

    if (!to || !reply_text) {
      return res.status(400).json({ success: false, message: req.t('admin:flash.replyRequired') });
    }

    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:20px;">TechBridge</h2>
      </div>
      <div style="background:#1e293b;padding:32px;color:#e2e8f0;font-size:15px;line-height:1.7;">
        ${reply_text.replace(/\n/g, '<br>')}
      </div>
      <div style="background:#0f172a;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center;">
        <p style="color:#64748b;font-size:12px;margin:0;">TechBridge &mdash; Premium Tech Marketplace</p>
      </div>
    </div>`;

    await sendReply({ to, subject: subject || req.t('admin:flash.replySubject'), text: reply_text, html });

    await ContactModel.addReply(messageId, reply_text, req.session.userId);

    return res.status(200).json({ success: true, message: req.t('admin:flash.replySent') });
  } catch (err) {
    console.error('Reply error:', err);
    return res.status(500).json({ success: false, message: req.t('admin:flash.replyFailed') });
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
    req.flash('success', req.t('admin:flash.settingsUpdated'));
    res.redirect('/admin/settings');
  } catch (err) {
    next(err);
  }
};

exports.getServices = async (req, res, next) => {
  try {
    const services = await ServiceModel.getAllAdmin();
    res.render('admin/services', {
      title: req.t('admin:title.services'),
      services
    });
  } catch (err) {
    next(err);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const { title, category, description, base_price, icon_class, status } = req.body;
    if (!title || !category || !base_price) {
      req.flash('error', req.t('admin:flash.serviceRequiredFields'));
      return res.redirect('/admin/services');
    }
    const slug = generateSlug(title);
    await ServiceModel.create({
      title, slug, category, description, base_price: parseFloat(base_price), icon_class: icon_class || 'fa-tools', status: status || 'active'
    });
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
    if (!service) {
      req.flash('error', req.t('admin:flash.serviceNotFound'));
      return res.redirect('/admin/services');
    }
    const { title, category, description, base_price, icon_class, status } = req.body;
    await ServiceModel.update(serviceId, {
      title: title || service.title,
      slug: title ? generateSlug(title) : service.slug,
      category: category || service.category,
      description: description || service.description,
      base_price: base_price ? parseFloat(base_price) : service.base_price,
      icon_class: icon_class || service.icon_class,
      status: status || service.status
    });
    req.flash('success', req.t('admin:flash.serviceUpdated'));
    res.redirect('/admin/services');
  } catch (err) {
    next(err);
  }
};

exports.deleteService = async (req, res, next) => {
  try {
    const serviceId = parseInt(req.params.id);
    await ServiceModel.delete(serviceId);
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

    res.render('admin/reviews', {
      title: req.t('admin:title.reviews'),
      reviews: result.reviews,
      pagination: { page, totalPages, total: result.total, hasNext: page < totalPages, hasPrev: page > 1 },
      currentStatus: status,
      currentSearch: search,
      isReportedFilter: reported,
      pendingCount,
      reportedCount
    });
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

    if (!reply) {
      req.flash('error', req.t('admin:flash.replyTextRequired'));
      return res.redirect('/admin/reviews');
    }
    if (reply.length > 2000) {
      req.flash('error', req.t('admin:flash.replyTooLong'));
      return res.redirect('/admin/reviews');
    }

    const review = await ReviewModel.getById(reviewId);
    if (!review) {
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return res.redirect('/admin/reviews');
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

    req.flash('success', req.t('admin:flash.reviewReplied'));
    res.redirect('/admin/reviews');
  } catch (err) {
    next(err);
  }
};

exports.toggleReviewHidden = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const review = await ReviewModel.getById(reviewId);

    if (!review) {
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return res.redirect('/admin/reviews');
    }

    await ReviewModel.toggleHidden(reviewId);

    if (review.product_id) {
      await ReviewModel.updateProductRating(review.product_id);
    }

    req.flash('success', req.t(review.is_hidden ? 'admin:flash.reviewUnhidden' : 'admin:flash.reviewHidden'));
    res.redirect('/admin/reviews');
  } catch (err) {
    next(err);
  }
};

exports.resolveReviewReport = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reportId = parseInt(req.params.id);
    const action = req.body.action === 'dismissed' ? 'dismissed' : 'resolved';

    await ReviewModel.resolveReport(reportId, action);

    req.flash('success', req.t(action === 'dismissed' ? 'admin:flash.reportDismissed' : 'admin:flash.reportResolved'));
    res.redirect('/admin/reviews?reported=1');
  } catch (err) {
    next(err);
  }
};

exports.approveReview = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const review = await ReviewModel.getById(reviewId);

    if (!review) {
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return res.redirect('/admin/reviews');
    }

    await ReviewModel.approve(reviewId, req.session.userId);

    if (review.product_id) {
      await ReviewModel.updateProductRating(review.product_id);
    }

    req.flash('success', req.t('admin:flash.reviewApproved'));
    res.redirect('/admin/reviews');
  } catch (err) {
    next(err);
  }
};

exports.rejectReview = async (req, res, next) => {
  try {
    const ReviewModel = require('../models/ReviewModel');
    const reviewId = parseInt(req.params.id);
    const review = await ReviewModel.getById(reviewId);

    if (!review) {
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return res.redirect('/admin/reviews');
    }

    await ReviewModel.reject(reviewId, req.session.userId);

    if (review.product_id) {
      await ReviewModel.updateProductRating(review.product_id);
    }

    req.flash('success', req.t('admin:flash.reviewRejected'));
    res.redirect('/admin/reviews');
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

    if (!user_id || !product_id || !rating || rating < 1 || rating > 5) {
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

    if (created && created.product_id) {
      await ReviewModel.updateProductRating(created.product_id);
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
    const review = await ReviewModel.getById(reviewId);

    if (!review) {
      req.flash('error', req.t('admin:flash.reviewNotFound'));
      return res.redirect('/admin/reviews');
    }

    await ReviewModel.delete(reviewId);

    if (review.product_id) {
      await ReviewModel.updateProductRating(review.product_id);
    }

    req.flash('success', req.t('admin:flash.reviewDeleted'));
    res.redirect('/admin/reviews');
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
    const { users } = await UserModel.getAll({ role: 'marketing_officer', search, page: 1, limit: 200 });
    const [activityCount] = await pool.execute(
      "SELECT COUNT(*) AS count FROM activity_logs WHERE role = 'marketing_officer'"
    );
    res.render('admin/marketing-officers', {
      title: req.t('admin:title.marketingOfficers'),
      officers: users,
      searchQuery: search,
      activityCount: activityCount[0].count
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

    if (!first_name || !last_name || !email || !password) {
      req.flash('error', req.t('admin:flash.userRequiredFields'));
      return res.redirect('/admin/marketing-officers/new');
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      req.flash('error', req.t('admin:flash.emailExists'));
      return res.redirect('/admin/marketing-officers/new');
    }

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const created = await UserModel.create({
      first_name, last_name, email, phone, password: hashed, role: 'marketing_officer'
    });

    await applyMarketingPermissions(created.id, extractPermissions(req.body));
    await logActivity(req, 'create', 'marketing_officer', created.id);
    req.flash('success', req.t('admin:flash.marketingOfficerCreated', { name: first_name + ' ' + last_name }));
    res.redirect('/admin/marketing-officers');
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

    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/marketing-officers');
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    const newStatus = validStatuses.includes(status) ? status : target.status;

    if (email && email !== target.email) {
      const existing = await UserModel.findByEmail(email);
      if (existing && existing.id !== userId) {
        req.flash('error', req.t('admin:flash.emailExists'));
        return res.redirect('/admin/marketing-officers/' + userId + '/edit');
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
    req.flash('success', req.t('admin:flash.marketingOfficerUpdated'));
    res.redirect('/admin/marketing-officers');
  } catch (err) {
    next(err);
  }
};

exports.updateMarketingOfficerStatus = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { status } = req.body;
    const validStatuses = ['active', 'inactive', 'suspended'];

    if (!validStatuses.includes(status)) {
      req.flash('error', req.t('admin:flash.invalidStatus'));
      return res.redirect('/admin/marketing-officers');
    }

    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/marketing-officers');
    }

    await UserModel.updateStatus(userId, status);
    await logActivity(req, status === 'active' ? 'activate' : 'deactivate', 'marketing_officer', userId);
    req.flash('success', req.t('admin:flash.marketingOfficerStatusUpdated'));
    res.redirect('/admin/marketing-officers');
  } catch (err) {
    next(err);
  }
};

exports.resetMarketingOfficerPassword = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { password } = req.body;

    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/marketing-officers');
    }

    if (!password || password.length < 6) {
      req.flash('error', req.t('admin:flash.passwordTooShort'));
      return res.redirect('/admin/marketing-officers/' + userId + '/edit');
    }

    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    await UserModel.updatePassword(userId, hashed);
    await logActivity(req, 'reset_password', 'marketing_officer', userId);
    req.flash('success', req.t('admin:flash.passwordReset'));
    res.redirect('/admin/marketing-officers/' + userId + '/edit');
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
    const target = await UserModel.findById(userId);
    if (!target || target.role !== 'marketing_officer') {
      req.flash('error', req.t('admin:flash.userNotFound'));
      return res.redirect('/admin/marketing-officers');
    }
    await applyMarketingPermissions(userId, extractPermissions(req.body));
    await logActivity(req, 'update_permissions', 'marketing_officer', userId);
    req.flash('success', req.t('admin:flash.permissionsUpdated'));
    res.redirect('/admin/marketing-officers/' + userId + '/permissions');
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
    for (const entry of roles) {
      const current = await getRolePermissions(entry.role);
      rolesWithPermissions.push({ ...entry, permissions: current });
    }

    const modulePermissions = PERMISSION_MODULES.map((mod) => ({
      key: mod.key,
      label: mod.label,
      permissions: mod.permissions
    }));

    res.render('admin/roles', {
      title: req.t('admin:title.roleManagement'),
      roles: rolesWithPermissions,
      modulePermissions,
      ALL_PERMISSIONS: modulePermissions.flatMap((m) => m.permissions)
    });
  } catch (err) {
    next(err);
  }
};

exports.updateRolePermissions = async (req, res, next) => {
  try {
    const role = req.params.role;
    if (!ROLE_NAMES[role]) {
      req.flash('error', req.t('admin:flash.invalidRole'));
      return res.redirect('/admin/roles');
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
    req.flash('success', req.t('admin:flash.rolePermissionsUpdated'));
    res.redirect('/admin/roles');
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
    res.render('admin/permissions', {
      title: req.t('admin:title.permissionManagement'),
      permissions: rows
    });
  } catch (err) {
    next(err);
  }
};

exports.addPermission = async (req, res, next) => {
  try {
    const permission = String(req.body.permission || '').trim();
    const module = String(req.body.module || 'general').trim() || 'general';
    const description = String(req.body.description || '').trim() || null;

    if (!/^[a-z][a-z0-9_]{1,99}$/.test(permission)) {
      req.flash('error', req.t('admin:flash.invalidPermissionName'));
      return res.redirect('/admin/permissions');
    }

    await addCatalogPermission(permission, module, description);
    await logActivity(req, 'create', 'permission', null);
    req.flash('success', req.t('admin:flash.permissionAdded'));
    res.redirect('/admin/permissions');
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

    res.render('admin/activity-logs', {
      title: req.t('admin:title.activityLogs'),
      logs,
      pagination: { page, totalPages, total, hasNext: page < totalPages, hasPrev: page > 1 },
      currentRole: roleFilter,
      currentAction: actionFilter,
      searchQuery: search,
      actions: actions.map((a) => a.action),
      roles: roles.map((r) => r.role)
    });
  } catch (err) {
    next(err);
  }
};
