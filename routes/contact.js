const express = require('express');
const router = express.Router();
const ContactModel = require('../models/ContactModel');
const { validateCsrf } = require('../middleware/csrf');

router.get('/', (req, res) => {
  const status = req.query.status || null;
  res.render('contact/index', { title: 'Contact Us - Athstack Digital Hub', status });
});

router.post('/send', validateCsrf, async (req, res) => {
  try {
    const data = {
      name: (req.body.name || '').trim(),
      email: (req.body.email || '').trim(),
      message: (req.body.message || '').trim()
    };

    if (!data.name || !data.email || !data.message) {
      return res.redirect('/contact?status=error');
    }

    await ContactModel.addMessage(data);
    res.redirect('/contact?status=success');
  } catch (err) {
    console.error(err);
    res.redirect('/contact?status=error');
  }
});

module.exports = router;
