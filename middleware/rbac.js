/**
 * RBAC middleware.
 *
 * requirePermission is the ONLY supported way to gate routes by capability.
 * Authorization is permission based — never role-name based — so a route stays
 * protected even if the set of roles changes.
 *
 * Flow per request:
 *   1. attachUser (middleware/auth) attaches the session user to req.user.
 *   2. refreshSessionRole (middleware/auth) re-validates role/status.
 *   3. loadPermissions (below) loads the user's effective permission set once
 *      and exposes req.can() / res.locals.can().
 *   4. requirePermission(...) runs per route and decides allow/deny.
 */
const { getUserPermissionSet } = require('../helpers/rbac');
const { PERMISSIONS } = require('../config/permissions');

const PERMISSION_CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Loads the effective permission set for the current user once per request.
 * Exposes:
 *   - req.permissions (Set<string>)
 *   - req.can(permission) -> boolean
 *   - res.locals.can(permission) -> boolean (available to EJS templates)
 */
function loadPermissions(req, res, next) {
  if (!req.user || !req.user.id) {
    req.permissions = new Set();
    req.can = () => false;
    res.locals.can = req.can;
    res.locals.homePanel = '/auth/login';
    return next();
  }

  const sessionCache = req.session && req.session.permissionCache;
  if (
    sessionCache &&
    sessionCache.role === req.user.role &&
    sessionCache.loadedAt &&
    Date.now() - sessionCache.loadedAt < PERMISSION_CACHE_TTL_MS
  ) {
    const perms = new Set(sessionCache.permissions);
    req.permissions = perms;
    req.can = (permission) => perms.has(permission);
    res.locals.can = req.can;
    res.locals.homePanel = homePanel(req);
    return next();
  }

  getUserPermissionSet(req.user.id, req.user.role)
    .then((perms) => {
      req.permissions = perms;
      req.can = (permission) => perms.has(permission);
      res.locals.can = req.can;
      res.locals.homePanel = homePanel(req);

      if (req.session) {
        req.session.permissionCache = {
          role: req.user.role,
          permissions: [...perms],
          loadedAt: Date.now()
        };
      }
      next();
    })
    .catch(next);
}

/**
 * Invalidate the current session's cached permission set (e.g. after a role or
 * permission change) so the next request reloads from the database.
 */
function invalidatePermissionCache(req) {
  if (req.session) {
    delete req.session.permissionCache;
  }
}

/**
 * Deny helper — returns a 403 JSON response for API/AJAX requests and a
 * redirect with a flash message for full-page requests.
 */
function denyAccess(req, res) {
  const wantsJson =
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json')) ||
    req.path.startsWith('/api');

  if (wantsJson) {
    return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to perform this action.' });
  }
  req.flash('error', 'Access denied. You do not have permission to perform this action.');
  return res.redirect('/');
}

/**
 * Requires the authenticated user to hold at least one of the given permissions.
 * @param {...string} permissions
 */
function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      const wantsJson =
        req.xhr ||
        (req.headers.accept && req.headers.accept.includes('application/json')) ||
        req.path.startsWith('/api');

      if (wantsJson) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
      }
      req.session.returnTo = req.originalUrl;
      req.flash('error', 'Please log in to continue.');
      return res.redirect('/auth/login');
    }

    const allowed = permissions.some((p) => req.can && req.can(p));
    if (allowed) return next();
    return denyAccess(req, res);
  };
}

/**
 * Requires the authenticated user to hold every listed permission.
 * @param {...string} permissions
 */
function requireAllPermissions(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return requirePermission()(req, res, next);
    }
    const allowed = permissions.every((p) => req.can && req.can(p));
    if (allowed) return next();
    return denyAccess(req, res);
  };
}

/**
 * Coarse-grained role gate. Prefer requirePermission — this should only be used
 * for login-time redirection and layout selection, never for data security.
 * @param {...string} roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      req.session.returnTo = req.originalUrl;
      req.flash('error', 'Please log in to continue.');
      return res.redirect('/auth/login');
    }
    if (roles.includes(req.user.role)) return next();
    return denyAccess(req, res);
  };
}

/**
 * Returns the home panel URL for a given role.
 * @param {string} role
 */
function homePanelFor(role) {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/admin';
    case 'marketing_officer':
      return '/marketing';
    case 'technician':
      return '/technician';
    default:
      return '/dashboard';
  }
}

/**
 * Permission-based equivalent of homePanelFor. Resolves the landing panel from
 * the user's effective permission set so navigation stays permission-driven
 * instead of role-name-driven. Used by the site header on every page.
 * @param {Object} req
 * @returns {string}
 */
function homePanel(req) {
  if (!req.user) return '/auth/login';
  const can = req.can || (() => false);

  if (
    can(PERMISSIONS.MANAGE_USERS) ||
    can(PERMISSIONS.MANAGE_PRODUCTS) ||
    can(PERMISSIONS.MANAGE_ORDERS) ||
    can(PERMISSIONS.VIEW_BUSINESS_REPORTS) ||
    (can(PERMISSIONS.MANAGE_REPAIRS) && can(PERMISSIONS.ASSIGN_REPAIRS))
  ) {
    return '/admin';
  }
  if (can(PERMISSIONS.MANAGE_CAMPAIGNS) || can(PERMISSIONS.VIEW_MARKETING_ANALYTICS)) {
    return '/marketing';
  }
  if (can(PERMISSIONS.MANAGE_REPAIRS) || can(PERMISSIONS.CREATE_PRODUCTS)) {
    return '/technician';
  }
  return '/dashboard';
}

module.exports = {
  loadPermissions,
  invalidatePermissionCache,
  requirePermission,
  requireAllPermissions,
  requireRole,
  denyAccess,
  homePanelFor,
  homePanel
};
