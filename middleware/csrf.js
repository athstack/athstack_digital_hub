const crypto = require('crypto');

function generateToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    name: req.session.userName,
    email: req.session.userEmail,
    role: req.session.userRole
  } : null;
  res.locals.urlRoot = process.env.URLROOT || '';
  res.locals.siteName = process.env.SITENAME || 'Athstack Digital Hub';
  res.locals.cartCount = req.session.cart ? Object.keys(req.session.cart).length : 0;
  next();
}

function validateCsrf(req, res, next) {
  const token = req.body.csrf_token || req.query.csrf_token;
  if (!token || !req.session.csrfToken || token !== req.session.csrfToken) {
    return res.status(403).json({ success: false, message: 'CSRF token validation failed.' });
  }
  next();
}

module.exports = { generateToken, validateCsrf };
