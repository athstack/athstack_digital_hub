const express = require('express');
const router = express.Router();
const MaintenanceModel = require('../models/MaintenanceModel');
const { validateCsrf } = require('../middleware/csrf');

router.get('/', async (req, res) => {
  try {
    const computerServices = await MaintenanceModel.getServicesByGroup('computer');
    const phoneServices = await MaintenanceModel.getServicesByGroup('phone');
    const services = [...computerServices, ...phoneServices];

    res.render('maintenance/index', {
      title: 'Enterprise IT Maintenance & Device Repair',
      computerServices,
      phoneServices,
      services
    });
  } catch (err) {
    console.error(err);
    res.render('maintenance/index', {
      title: 'Enterprise IT Maintenance & Device Repair',
      computerServices: [],
      phoneServices: [],
      services: []
    });
  }
});

router.post('/bookAppointment', validateCsrf, async (req, res) => {
  try {
    const { name, email, phone, appointment_date, service_id, device_details } = req.body;

    if (!name || !email || !phone || !appointment_date || !service_id) {
      return res.status(400).json({ success: false, message: 'All mandatory fields are required.' });
    }

    const result = await MaintenanceModel.createBooking({
      user_id: req.session.userId || null,
      service_id: parseInt(service_id),
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      appointment_date,
      device_details: device_details || ''
    });

    if (result) {
      res.json({ success: true, message: 'Your maintenance request has been scheduled successfully.' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create booking.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error processing booking.' });
  }
});

module.exports = router;
