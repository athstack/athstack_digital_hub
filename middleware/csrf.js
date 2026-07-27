const crypto = require('crypto');

/**
 * Generate CSRF token and attach global template variables
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function generateToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Regenerate token periodically (every 30 minutes)
  if (!req.session.csrfCreatedAt) {
    req.session.csrfCreatedAt = Date.now();
  } else if (Date.now() - req.session.csrfCreatedAt > 30 * 60 * 1000) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    req.session.csrfCreatedAt = Date.now();
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
  res.locals.currentPath = req.path;
  next();
}

/**
 * Validate CSRF token on state-changing requests
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function validateCsrf(req, res, next) {
  const token = req.body.csrf_token || req.query.csrf_token || req.headers['x-csrf-token'];

  if (!token || !req.session.csrfToken || token !== req.session.csrfToken) {
    // Return JSON for API-style requests, otherwise flash and redirect
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(403).json({ success: false, message: 'CSRF token validation failed.' });
    }
    req.flash('error', 'Session expired. Please try again.');
    return res.redirect('back');
  }

  next();
}

module.exports = { generateToken, validateCsrf };
