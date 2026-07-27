const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const UserModel = require('../models/UserModel');
const ProductModel = require('../models/ProductModel');
const CourseModel = require('../models/CourseModel');
const MaintenanceModel = require('../models/MaintenanceModel');
const ContactModel = require('../models/ContactModel');
const OrderModel = require('../models/OrderModel');
const { isAdmin } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const pool = require('../config/db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads', 'products')),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + path.basename(file.originalname))
});
const upload = multer({ storage });

router.use(isAdmin);

router.get('/', async (req, res) => {
  try {
    const totalClients = await UserModel.getTotalUsers();
    const [pendingBookings] = await pool.execute("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'");
    const [recentBookings] = await pool.execute(
      `SELECT b.*, s.title as service_title FROM bookings b
       LEFT JOIN services s ON b.service_id = s.id
       ORDER BY b.created_at DESC LIMIT 5`
    );
    const metrics = {
      revenue: 0,
      pending_orders: 0,
      pending_bookings: pendingBookings[0].count,
      total_clients: totalClients
    };
    res.render('admin/dashboard', { title: 'Admin Control Matrix', metrics, recentBookings });
  } catch (err) {
    console.error(err);
    res.render('admin/dashboard', { title: 'Admin Control Matrix', metrics: { revenue: 0, pending_orders: 0, pending_bookings: 0, total_clients: 0 }, recentBookings: [] });
  }
});

router.get('/training', async (req, res) => {
  try {
    const modules = await CourseModel.getAll();
    res.render('admin/training', { title: 'Training Academy Modules - Athstack', modules });
  } catch (err) {
    console.error(err);
    res.render('admin/training', { title: 'Training Academy Modules - Athstack', modules: [] });
  }
});

router.get('/addModule', (req, res) => {
  res.render('admin/add_module', { title: 'Add Training Module' });
});

router.post('/addModule', async (req, res) => {
  try {
    const slug = req.body.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    await CourseModel.add({
      title: req.body.title,
      slug,
      description: req.body.description,
      duration: req.body.duration,
      status: 'draft',
      level: req.body.level || 'Beginner',
      price: req.body.price || 0,
      instructor: req.body.instructor || 'Athanas Kayombo',
      image_path: req.body.image_path || 'default.jpg'
    });
    res.redirect('/admin/training');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/training');
  }
});

router.get('/editModule/:id', async (req, res) => {
  try {
    const course = await CourseModel.getById(parseInt(req.params.id));
    if (!course) return res.redirect('/admin/training');
    res.render('admin/edit_module', { title: 'Edit Training Module', course });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/training');
  }
});

router.post('/editModule/:id', async (req, res) => {
  try {
    await CourseModel.update({
      title: req.body.title,
      description: req.body.description,
      duration: req.body.duration,
      status: req.body.status,
      level: req.body.level,
      price: req.body.price
    }, parseInt(req.params.id));
    res.redirect('/admin/training');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/training');
  }
});

router.post('/deleteModule/:id', async (req, res) => {
  try {
    await CourseModel.delete(parseInt(req.params.id));
  } catch (err) {
    console.error(err);
  }
  res.redirect('/admin/training');
});

router.get('/products', async (req, res) => {
  try {
    const products = await ProductModel.getAll();
    res.render('admin/products', { title: 'Manage Inventory - Athstack', products });
  } catch (err) {
    console.error(err);
    res.render('admin/products', { title: 'Manage Inventory - Athstack', products: [] });
  }
});

router.post('/products', upload.single('product_image'), async (req, res) => {
  try {
    if (req.body.add_product) {
      let imageName = 'default.jpg';
      if (req.file) {
        imageName = req.file.filename;
      }

      const baseSlug = req.body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      const slug = await ProductModel.slugExists(baseSlug) ? baseSlug + '-' + Date.now() : baseSlug;

      await ProductModel.add({
        category_id: req.body.category_id,
        name: req.body.name,
        slug,
        description: req.body.description,
        price: req.body.price,
        stock_quantity: req.body.stock_quantity,
        main_image: imageName
      });
    }
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/products');
  }
});

router.get('/editProduct/:id', async (req, res) => {
  try {
    const product = await ProductModel.getById(parseInt(req.params.id));
    if (!product) return res.redirect('/admin/products');
    res.render('admin/edit_product', { title: 'Edit Product - Athstack', product });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/products');
  }
});

router.post('/editProduct/:id', upload.single('product_image'), async (req, res) => {
  try {
    let imageName = req.body.existing_image || 'default.jpg';
    if (req.file) {
      imageName = req.file.filename;
    }

    await ProductModel.update({
      category_id: req.body.category_id,
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      stock_quantity: req.body.stock_quantity,
      main_image: imageName
    }, parseInt(req.params.id));
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/products');
  }
});

router.get('/deleteProduct/:id', async (req, res) => {
  try {
    await ProductModel.delete(parseInt(req.params.id));
  } catch (err) {
    console.error(err);
  }
  res.redirect('/admin/products');
});

router.get('/bookings', async (req, res) => {
  try {
    const bookings = await MaintenanceModel.getAllBookings();
    res.render('admin/bookings', { title: 'Maintenance Queue - Athstack', bookings });
  } catch (err) {
    console.error(err);
    res.render('admin/bookings', { title: 'Maintenance Queue - Athstack', bookings: [] });
  }
});

router.post('/updateBookingStatus', validateCsrf, async (req, res) => {
  try {
    const { id, status } = req.body;
    if (id && status) {
      await MaintenanceModel.updateBookingStatus(parseInt(id), status);
    }
  } catch (err) {
    console.error(err);
  }
  res.redirect('/admin/bookings');
});

router.get('/users', async (req, res) => {
  try {
    const users = await UserModel.getAllUsers();
    res.render('admin/users', { title: 'User Directories - Athstack', users });
  } catch (err) {
    console.error(err);
    res.render('admin/users', { title: 'User Directories - Athstack', users: [] });
  }
});

router.get('/inbox', async (req, res) => {
  try {
    const messages = await ContactModel.getMessages();
    res.render('admin/inbox', { title: 'Contact Inbox - Athstack', messages });
  } catch (err) {
    console.error(err);
    res.render('admin/inbox', { title: 'Contact Inbox - Athstack', messages: [] });
  }
});

module.exports = router;
