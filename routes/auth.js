const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { validateCsrf } = require('../middleware/csrf');
const { isGuest } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../validators/authValidators');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) {
      return res.status(429).json({ success: false, message: 'Too many login attempts. Please try again in 15 minutes.' });
    }
    res.redirect('/auth/login?error=rate_limited');
  }
});

router.get('/login', isGuest, authController.getLogin);

router.post('/login',
  loginLimiter,
  validateCsrf,
  isGuest,
  loginValidator,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
      if (isAjax) return res.status(400).json({ success: false, message: errors.array()[0].msg });
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

router.get('/reset/:token', isGuest, authController.getReset);
router.post('/reset/:token',
  validateCsrf,
  isGuest,
  authController.postReset
);

router.post('/logout', validateCsrf, authController.logout);

module.exports = router;
