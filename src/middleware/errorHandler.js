const { sendError } = require('../utils/apiResponse');

/**
 * Handle Mongoose validation errors (e.g., required fields, enum mismatches).
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return { statusCode: 400, message: 'Validation failed', errors };
};

/**
 * Handle Mongoose duplicate key errors (e.g., duplicate email).
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return {
    statusCode: 409,
    message: `Duplicate value: '${value}' already exists for field '${field}'.`,
  };
};

/**
 * Handle Mongoose cast errors (e.g., invalid ObjectId).
 */
const handleCastError = (err) => ({
  statusCode: 400,
  message: `Invalid value '${err.value}' for field '${err.path}'.`,
});

/**
 * Global error handling middleware.
 * Must be the last middleware registered in Express.
 */
const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = null;

  // Translate known Mongoose/DB errors into clean responses
  if (err.name === 'ValidationError') {
    ({ statusCode, message, errors } = handleValidationError(err));
  } else if (err.code === 11000) {
    ({ statusCode, message } = handleDuplicateKeyError(err));
  } else if (err.name === 'CastError') {
    ({ statusCode, message } = handleCastError(err));
  }

  // In production, don't leak internal error details for unknown errors
  if (process.env.NODE_ENV === 'production' && statusCode === 500 && !err.isOperational) {
    message = 'Something went wrong. Please try again later.';
  } else if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('🔥 Unhandled Error:', err);
  }

  return sendError(res, { statusCode, message, errors });
};

/**
 * 404 handler for unmatched routes.
 */
const notFoundHandler = (req, res) => {
  return sendError(res, {
    statusCode: 404,
    message: `Route '${req.method} ${req.originalUrl}' not found.`,
  });
};

module.exports = { globalErrorHandler, notFoundHandler };
