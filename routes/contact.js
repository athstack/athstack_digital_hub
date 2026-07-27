const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const contactController = require('../controllers/contactController');
const { validateCsrf } = require('../middleware/csrf');
const { contactValidator } = require('../validators/contactValidator');

router.get('/', contactController.getContact);

router.post('/send',
  validateCsrf,
  contactValidator,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg);
      return res.redirect('/contact');
    }
    next();
  },
  contactController.sendMessage
);

module.exports = router;
