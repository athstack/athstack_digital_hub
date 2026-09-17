/**
 * Custom application error class
 */
class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Sequelize/MySQL duplicate key errors
 * @param {Object} err
 * @returns {AppError}
 */
function handleDuplicateKey(err) {
  const field = err.message.match(/for key '(.+?)'/)?.[1] || 'field';
  return new AppError(`Duplicate value for ${field}. This value already exists.`, 400);
}

/**
 * Handle validation errors
 * @param {Object} err
 * @returns {AppError}
 */
function handleValidationError(err) {
  if (err.errors && Array.isArray(err.errors)) {
    const messages = err.errors.map(e => e.message).join('. ');
    return new AppError(messages, 400);
  }
  return new AppError(err.message || 'Validation failed', 400);
}

/**
 * Determine whether the request comes from a browser expecting HTML,
 * or from an API/AJAX caller expecting JSON.
 */
function wantsJson(req) {
  if (!req) return false;
  if (req.xhr) return true;
  if (req.path.startsWith('/api')) return true;
  const accept = req.headers && req.headers.accept;
  if (accept && accept.includes('application/json')) return true;
  return false;
}

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error('[Error]', err.statusCode, req.method, req.originalUrl, err.message);

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    err = handleDuplicateKey(err);
  }

  // MySQL validation error
  if (err.code === 'ER_WRONG_VALUE' || err.name === 'ValidationError') {
    err = handleValidationError(err);
  }

  // If the response has already started we cannot render or redirect.
  if (res.headersSent) return next(err);

  // API / AJAX callers: return JSON
  if (wantsJson(req)) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        statusCode: err.statusCode
      });
    }
    console.error('Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong.',
      statusCode: 500
    });
  }

  const msg = err.isOperational ? err.message : 'Something went wrong. Please try again.';

  // Browser GET/HEAD navigation. A page can fail for the very reason it was
  // requested, so redirecting "back" (which resolves to the current URL when
  // there is no Referer) creates an infinite redirect loop. That is what took
  // the site down when the database was unreachable, so render an error page
  // for navigations instead of redirecting.
  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      statusCode: err.statusCode,
      message: msg
    });
  }

  // State-changing browser submissions: redirect back with a flash error, but
  // only to a different URL than the one that just failed.
  try { req.flash('error', msg); } catch (e) {}

  let target = '/';
  const referrer = req.get('Referrer');
  if (referrer) {
    try {
      const ref = new URL(referrer, `${req.protocol}://${req.get('host')}`);
      if (ref.pathname + ref.search !== req.originalUrl) {
        target = ref.pathname + ref.search;
      }
    } catch (e) { /* ignore malformed referrer */ }
  }
  return res.redirect(target);
}

module.exports = { AppError, errorHandler };
