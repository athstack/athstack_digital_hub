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
      role: req.session.userRole,
      avatar: req.session.userAvatar || null,
      firstName: req.session.userFirstName || '',
      lastName: req.session.userLastName || ''
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
    const user = await queryOne('SELECT role, status, avatar FROM users WHERE id = ?', [req.session.userId]);
    if (!user) {
      req.session.destroy(() => {
        res.redirect('/auth/login');
      });
      return;
    }
    if (user.status === 'suspended') {
      req.session.destroy(() => {
        res.redirect('/auth/login?error=suspended');
      });
      return;
    }
    if (req.session.userRole !== user.role) {
      req.session.userRole = user.role;
    }
    if (user.avatar && req.session.userAvatar !== user.avatar) {
      req.session.userAvatar = user.avatar;
    }
    req.session.userStatus = user.status || 'active';
    res.locals.userStatus = req.session.userStatus;
    if (req.user) {
      req.user.role = user.role;
      req.user.status = user.status || 'active';
      req.user.avatar = req.session.userAvatar || null;
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
 * Require marketing_officer role
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function isMarketingOfficer(req, res, next) {
  if (req.session && req.session.userId && req.session.userRole === 'marketing_officer') {
    return next();
  }
  if (req.session && req.session.userId) {
    req.flash('error', 'Access denied. Marketing officer account required.');
    return res.redirect('/');
  }
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
}

/**
 * Require a specific permission. Admins bypass the permission check.
 * Marketing officers are checked against role_permissions (default set) and
 * user_permissions (per-user grants). Supports user-level revokes where the
 * permission exists in user_permissions with granted = 0.
 * @param {string} permission
 */
function hasPermission(permission) {
  return async (req, res, next) => {
    const role = req.session && req.session.userRole;
    if (['admin', 'super_admin'].includes(role)) return next();

    if (role === 'marketing_officer' && req.session.userId) {
      try {
        const override = await queryOne(
          'SELECT granted FROM user_permissions WHERE user_id = ? AND permission = ?',
          [req.session.userId, permission]
        );
        if (override) {
          if (Number(override.granted) === 1) return next();
          req.flash('error', 'Access denied. You do not have permission to perform this action.');
          return res.redirect('/marketing');
        }
        const rolePerm = await queryOne(
          'SELECT permission FROM role_permissions WHERE role = ? AND permission = ?',
          [role, permission]
        );
        if (rolePerm) return next();
        req.flash('error', 'Access denied. You do not have permission to perform this action.');
        return res.redirect('/marketing');
      } catch (err) {
        return next(err);
      }
    }

    req.flash('error', 'Access denied.');
    res.redirect('/');
  };
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
    if (role === 'marketing_officer') {
      return res.redirect('/marketing');
    }
    return res.redirect('/dashboard');
  }
  next();
}

/**
 * Require active status for write actions
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function isActive(req, res, next) {
  if (req.session && req.session.userId) {
    const status = req.session.userStatus || 'active';
    if (status === 'inactive') {
      req.flash('error', 'Your account is inactive. Please contact an administrator to activate your account before performing this action.');
      return res.redirect('back');
    }
    if (status === 'suspended') {
      req.session.destroy(() => {
        res.redirect('/auth/login?error=suspended');
      });
      return;
    }
    return next();
  }
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
}

module.exports = {
  attachUser,
  refreshSessionRole,
  isAuthenticated,
  isCustomer,
  isTechnician,
  isAdmin,
  isTechnicianOrAdmin,
  isMarketingOfficer,
  hasPermission,
  isGuest,
  isActive
};
