const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { validateCsrf } = require('../middleware/csrf');
const { isGuest } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../validators/authValidators');

router.get('/login', isGuest, authController.getLogin);

router.post('/login',
  validateCsrf,
  isGuest,
  loginValidator,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg);
      return res.redirect('/auth/login');
    }
    next();
  },
  authController.postLogin
);

router.get('/register', isGuest, authController.getRegister);

router.post('/register',
  validateCsrf,
  isGuest,
  registerValidator,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg);
      return res.redirect('/auth/register');
    }
    next();
  },
  authController.postRegister
);

router.get('/forgot', isGuest, authController.getForgot);

router.post('/forgot',
  validateCsrf,
  isGuest,
  authController.postForgot
);

router.get('/logout', authController.logout);

module.exports = router;
