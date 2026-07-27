/**
 * Authentication and authorization middleware
 */
const { queryOne } = require('../config/db');

/**
 * Attaches user to req if session exists (non-blocking)
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail,
      role: req.session.userRole
    };
  } else {
    req.user = null;
  }
  next();
}

/**
 * Re-validates session role against the database.
 * If the user's role has changed (promoted/demoted), the session is updated immediately.
 * Also blocks users whose account has been suspended.
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
async function refreshSessionRole(req, res, next) {
  if (!req.session || !req.session.userId) {
    return next();
  }
  try {
    const user = await queryOne('SELECT role, status FROM users WHERE id = ?', [req.session.userId]);
    if (!user) {
      req.session.destroy(() => {
        res.redirect('/auth/login');
      });
      return;
    }
    if (user.status !== 'active') {
      req.session.destroy(() => {
        req.flash('error', 'Your account has been suspended.');
        res.redirect('/auth/login');
      });
      return;
    }
    if (req.session.userRole !== user.role) {
      req.session.userRole = user.role;
      if (req.user) req.user.role = user.role;
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require authenticated user
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
}

/**
 * Require customer role
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function isCustomer(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'customer') {
    return next();
  }
  if (req.session && req.session.userId) {
    req.flash('error', 'Access denied. Customer account required.');
    return res.redirect('/');
  }
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
}

/**
 * Require technician role
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function isTechnician(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'technician') {
    return next();
  }
  if (req.session && req.session.userId) {
    req.flash('error', 'Access denied. Technician account required.');
    return res.redirect('/');
  }
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
}

/**
 * Require admin or super_admin role
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function isAdmin(req, res, next) {
  if (req.session && req.session.userId && ['admin', 'super_admin'].includes(req.session.userRole)) {
    return next();
  }
  if (req.session && req.session.userId) {
    req.flash('error', 'Access denied. Admin privileges required.');
    return res.redirect('/');
  }
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
}

/**
 * Require technician or admin role
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function isTechnicianOrAdmin(req, res, next) {
  const allowedRoles = ['technician', 'admin', 'super_admin'];
  if (req.session && req.session.userId && allowedRoles.includes(req.session.userRole)) {
    return next();
  }
  if (req.session && req.session.userId) {
    req.flash('error', 'Access denied. Insufficient privileges.');
    return res.redirect('/');
  }
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
}

/**
 * Require guest (redirect if already logged in)
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function isGuest(req, res, next) {
  if (req.session && req.session.userId) {
    const role = req.session.userRole;
    if (['admin', 'super_admin'].includes(role)) {
      return res.redirect('/admin');
    }
    if (role === 'technician') {
      return res.redirect('/technician');
    }
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = {
  attachUser,
  refreshSessionRole,
  isAuthenticated,
  isCustomer,
  isTechnician,
  isAdmin,
  isTechnicianOrAdmin,
  isGuest
};
