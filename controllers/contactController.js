const ContactModel = require('../models/ContactModel');

exports.getContact = (req, res) => {
  const status = req.query.status || null;
  res.render('contact/index', {
    title: 'Contact Us - Athstack Digital Hub',
    status
  });
};

exports.sendMessage = async (req, res, next) => {
  try {
    const data = {
      name: (req.body.name || '').trim(),
      email: (req.body.email || '').trim(),
      phone: (req.body.phone || '').trim(),
      subject: (req.body.subject || '').trim(),
      message: (req.body.message || '').trim()
    };

    if (!data.name || !data.email || !data.message) {
      req.flash('error', 'Name, email, and message are required.');
      return res.redirect('/contact');
    }

    await ContactModel.create(data);
    req.flash('success', 'Your message has been sent. We will get back to you shortly.');
    res.redirect('/contact?status=success');
  } catch (err) {
    next(err);
  }
};
