const ProductModel = require('../models/ProductModel');
const RepairModel = require('../models/RepairModel');
const UserModel = require('../models/UserModel');
const OrderModel = require('../models/OrderModel');
const NotificationModel = require('../models/NotificationModel');
const CategoryModel = require('../models/CategoryModel');
const ProductImageModel = require('../models/ProductImageModel');
const { generateSlug, formatDate, formatCurrency, getStatusBadgeClass } = require('../utils/helpers');
const { pool } = require('../config/db');
const { processUploadedFile, processUploadedFiles } = require('../helpers/upload');

exports.getDashboard = async (req, res, next) => {
  try {
    const techId = req.session.userId;

    const [productCount] = await pool.execute(
      'SELECT COUNT(*) AS count FROM products WHERE technician_id = ?',
      [techId]
    );

    const [assignedRepairs] = await pool.execute(
      `SELECT rr.*, s.title AS service_title
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       WHERE rr.technician_id = ?
       ORDER BY rr.created_at DESC`,
      [techId]
    );

    const [pendingRepairs] = await pool.execute(
      `SELECT COUNT(*) AS count FROM repair_requests
       WHERE technician_id = ? AND status IN ('pending', 'assigned', 'in_progress')`,
      [techId]
    );

    const [orderCount] = await pool.execute(
      `SELECT COUNT(DISTINCT o.id) AS count
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.technician_id = ?`,
      [techId]
    );

    const metrics = {
      products: productCount[0].count,
      pendingRepairs: pendingRepairs[0].count,
      totalRepairs: assignedRepairs.length,
      orders: orderCount[0].count
    };

    res.render('technician/dashboard', {
      title: 'Technician Dashboard - TechBridge Digital Hub',
      metrics,
      recentRepairs: assignedRepairs.slice(0, 5)
    });
  } catch (err) {
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const result = await ProductModel.getByTechnician(req.session.userId);

    res.render('technician/products', {
      title: 'My Products - TechBridge Digital Hub',
      products: result.products,
      formatCurrency
    });
  } catch (err) {
    next(err);
  }
};

exports.getAddProduct = async (req, res, next) => {
  try {
    const categories = await CategoryModel.getAll();
    res.render('technician/products-add', {
      title: 'Add Product - TechBridge Digital Hub',
      categories,
      product: null
    });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, discount_price, category_id, stock_quantity, sku } = req.body;

    if (!name || !price || !category_id) {
      req.flash('error', 'Product name, price, and category are required.');
      return res.redirect('/technician/products/add');
    }

    const mainImageFile = req.files && req.files['product_image'] && req.files['product_image'][0];
    const mainImage = mainImageFile ? await processUploadedFile(mainImageFile, 'products') : '';

    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    const existing = await ProductModel.findBySlug(baseSlug);
    if (existing) {
      slug = `${baseSlug}-${Date.now()}`;
    }

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
      sku: sku || null
    });

    const created = await ProductModel.findBySlug(slug);
    if (created && req.files && req.files['gallery_images']) {
      const galleryPaths = await processUploadedFiles(req.files['gallery_images'], 'products');
      if (galleryPaths.length > 0) {
        await ProductImageModel.addMultiple(created.id, galleryPaths);
      }
    }

    req.flash('success', 'Product created successfully.');
    res.redirect('/technician/products');
  } catch (err) {
    next(err);
  }
};

exports.getEditProduct = async (req, res, next) => {
  try {
    const product = await ProductModel.findById(parseInt(req.params.id));
    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/technician/products');
    }

    if (product.technician_id !== req.session.userId) {
      req.flash('error', 'You can only edit your own products.');
      return res.redirect('/technician/products');
    }

    const categories = await CategoryModel.getAll();
    const gallery = await ProductImageModel.getByProduct(product.id);
    res.render('technician/products-edit', {
      title: 'Edit Product - TechBridge Digital Hub',
      product,
      categories,
      gallery
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
      req.flash('error', 'Product not found.');
      return res.redirect('/technician/products');
    }

    if (product.technician_id !== req.session.userId) {
      req.flash('error', 'You can only edit your own products.');
      return res.redirect('/technician/products');
    }

    const { name, description, price, discount_price, category_id, stock_quantity, sku } = req.body;

    let mainImage = req.body.existing_image || product.main_image;
    const mainImageFile = req.files && req.files['product_image'] && req.files['product_image'][0];
    if (mainImageFile) {
      mainImage = await processUploadedFile(mainImageFile, 'products');
    }

    await ProductModel.update(productId, {
      category_id: parseInt(category_id) || product.category_id,
      name: name || product.name,
      description: description || '',
      price: parseFloat(price) || product.price,
      discount_price: discount_price !== undefined ? (discount_price ? parseFloat(discount_price) : null) : product.discount_price,
      stock_quantity: parseInt(stock_quantity) || 0,
      main_image: mainImage,
      sku: sku !== undefined ? (sku || null) : product.sku
    });

    if (req.files && req.files['gallery_images'] && req.files['gallery_images'].length > 0) {
      const galleryPaths = await processUploadedFiles(req.files['gallery_images'], 'products');
      await ProductImageModel.deleteByProduct(productId);
      await ProductImageModel.addMultiple(productId, galleryPaths);
    }

    req.flash('success', 'Product updated successfully.');
    res.redirect('/technician/products');
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await ProductModel.findById(productId);

    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/technician/products');
    }

    if (product.technician_id !== req.session.userId) {
      req.flash('error', 'You can only delete your own products.');
      return res.redirect('/technician/products');
    }

    await ProductModel.delete(productId);
    req.flash('success', 'Product deleted.');
    res.redirect('/technician/products');
  } catch (err) {
    next(err);
  }
};

exports.toggleProductStatus = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    const respond = (code, data) => isAjax ? res.status(code).json(data) : res.redirect('/technician/products');

    if (isNaN(productId)) {
      if (isAjax) return respond(400, { success: false, message: 'Invalid product ID.' });
      req.flash('error', 'Invalid product ID.');
      return respond(400, {});
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      if (isAjax) return respond(404, { success: false, message: 'Product not found.' });
      req.flash('error', 'Product not found.');
      return respond(404, {});
    }

    if (product.technician_id !== req.session.userId) {
      if (isAjax) return respond(403, { success: false, message: 'You can only modify your own products.' });
      req.flash('error', 'You can only modify your own products.');
      return respond(403, {});
    }

    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    await pool.execute('UPDATE products SET status = ? WHERE id = ?', [newStatus, productId]);

    if (isAjax) return respond(200, { success: true, status: newStatus, message: `Product ${newStatus === 'active' ? 'activated' : 'deactivated'}.` });
    req.flash('success', `Product ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
    respond(302, {});
  } catch (err) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(500).json({ success: false, message: 'Server error.' });
    }
    next(err);
  }
};

exports.getRepairs = async (req, res, next) => {
  try {
    const [repairs] = await pool.execute(
      `SELECT rr.*, s.title AS service_title
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       WHERE rr.technician_id = ?
       ORDER BY rr.created_at DESC`,
      [req.session.userId]
    );

    res.render('technician/repairs', {
      title: 'Assigned Repairs - TechBridge Digital Hub',
      repairs,
      formatDate,
      getStatusBadgeClass
    });
  } catch (err) {
    next(err);
  }
};

exports.updateRepairStatus = async (req, res, next) => {
  try {
    const repairId = parseInt(req.params.id);
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'assigned', 'diagnosing', 'in_repair', 'awaiting_parts', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      req.flash('error', 'Invalid status.');
      return res.redirect('/technician/repairs');
    }

    const [existing] = await pool.execute(
      'SELECT * FROM repair_requests WHERE id = ? AND technician_id = ?',
      [repairId, req.session.userId]
    );

    if (existing.length === 0) {
      req.flash('error', 'Repair not found or not assigned to you.');
      return res.redirect('/technician/repairs');
    }

    await RepairModel.updateStatus(repairId, status, notes, req.session.userId);

    const [repair] = await pool.execute(
      'SELECT user_id, reference_number FROM repair_requests WHERE id = ?',
      [repairId]
    );
    if (repair.length > 0 && repair[0].user_id) {
      var statusLabel = status.replace(/_/g, ' ');
      await NotificationModel.create(repair[0].user_id, {
        title: 'Repair Status Updated',
        message: 'Your repair ' + repair[0].reference_number + ' is now: ' + statusLabel + (notes ? '. Notes: ' + notes : ''),
        type: 'repair',
        link: '/dashboard/repairs'
      });
    }

    req.flash('success', 'Repair status updated.');
    res.redirect('/technician/repairs');
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const result = await OrderModel.getByTechnician(req.session.userId);

    res.render('technician/orders', {
      title: 'Product Orders - TechBridge Digital Hub',
      orders: result.orders,
      formatDate,
      formatCurrency,
      getStatusBadgeClass
    });
  } catch (err) {
    next(err);
  }
};
