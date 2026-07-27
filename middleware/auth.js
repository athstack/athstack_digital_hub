function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/auth/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.userId && ['admin', 'super_admin'].includes(req.session.userRole)) {
    return next();
  }
  res.redirect('/auth/login');
}

function isGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return ['admin', 'super_admin'].includes(req.session.userRole)
      ? res.redirect('/admin')
      : res.redirect('/user');
  }
  next();
}

module.exports = { isAuthenticated, isAdmin, isGuest };
