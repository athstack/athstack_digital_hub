const ServiceModel = require('../models/ServiceModel');
const NotificationModel = require('../models/NotificationModel');
const { pool } = require('../config/db');
const { formatCurrency } = require('../utils/helpers');

exports.getMaintenance = async (req, res, next) => {
  try {
    const computerServices = await ServiceModel.getByCategory('computer');
    const phoneServices = await ServiceModel.getByCategory('phone');
    const services = [...computerServices, ...phoneServices];

    let user = null;
    if (req.session.userId) {
      const [rows] = await pool.execute(
        'SELECT first_name, last_name, email, phone, country FROM users WHERE id = ?',
        [req.session.userId]
      );
      if (rows.length > 0) user = rows[0];
    }

    res.render('maintenance/index', {
      title: 'Enterprise IT Maintenance & Device Repair - TechBridge Digital Hub',
      computerServices,
      phoneServices,
      services,
      formatCurrency,
      user
    });
  } catch (err) {
    next(err);
  }
};

exports.bookRepair = async (req, res, next) => {
  try {
    const { name, email, phone, customer_country, appointment_date, service_id, device_details, device_type, device_brand, device_model, issue_description } = req.body;

    if (!name || !email || !phone || !appointment_date || !service_id) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(400).json({ success: false, message: 'All mandatory fields are required.' });
      }
      req.flash('error', 'All mandatory fields are required.');
      return res.redirect('/maintenance');
    }

    const digits = Math.floor(100000 + Math.random() * 900000).toString();
    const reference = `ATH-TK-${digits}`;

    const [result] = await pool.execute(
      `INSERT INTO repair_requests (user_id, service_id, reference_number, customer_name, customer_email, customer_phone, customer_country,
        device_type, device_brand, device_model, issue_description, appointment_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.session.userId || null,
        parseInt(service_id),
        reference,
        name,
        email,
        phone,
        customer_country || '',
        device_type || '',
        device_brand || '',
        device_model || '',
        issue_description || device_details || '',
        appointment_date
      ]
    );

    if (req.session.userId) {
      await NotificationModel.create(req.session.userId, {
        title: 'Repair Request Filed',
        message: `Your repair request ${reference} has been submitted. We'll get back to you soon.`,
        type: 'repair',
        link: '/dashboard/repairs'
      });
    }

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.json({ success: true, message: 'Your maintenance request has been scheduled successfully.', reference });
    }

    req.flash('success', `Maintenance request filed successfully. Reference: ${reference}`);
    res.redirect('/maintenance');
  } catch (err) {
    next(err);
  }
};

exports.checkRepairStatus = async (req, res, next) => {
  try {
    const ref = req.params.ref;
    if (!ref) {
      return res.status(400).json({ success: false, message: 'Reference number is required.' });
    }

    const [rows] = await pool.execute(
      `SELECT rr.id, rr.reference_number, rr.status, rr.customer_name, rr.appointment_date, rr.device_type, rr.device_brand, rr.device_model, rr.issue_description, s.title AS service_title
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       WHERE rr.reference_number = ? OR rr.id = ?`,
      [ref, ref.replace('ATH-TK-', '')]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No repair request found with that reference.' });
    }

    const repair = rows[0];
    res.json({
      success: true,
      reference: repair.reference_number,
      status: repair.status,
      service: repair.service_title,
      appointment_date: repair.appointment_date,
      device_details: repair.issue_description
    });
  } catch (err) {
    next(err);
  }
};
