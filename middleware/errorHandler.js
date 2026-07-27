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
 * Send error response in development
 * @param {Object} err
 * @param {Object} res
 */
function sendErrorDev(err, res) {
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500
  });
}

/**
 * Send error response in production
 * @param {Object} err
 * @param {Object} res
 */
function sendErrorProd(err, res) {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode
    });
  } else {
    console.error('Unexpected error:', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong.',
      statusCode: 500
    });
  }
}

/**
 * Global error handling middleware
 * @param {Object} err
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const isDev = process.env.NODE_ENV !== 'production';

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    err = handleDuplicateKey(err);
  }

  // MySQL validation error
  if (err.code === 'ER_WRONG_VALUE' || err.name === 'ValidationError') {
    err = handleValidationError(err);
  }

  if (isDev) {
    return sendErrorDev(err, res);
  }

  // Production: handle specific error types
  let error = { ...err, message: err.message };

  sendErrorProd(error, res);
}

module.exports = { AppError, errorHandler };
