/**
 * Custom operational error class.
 * Distinguishes between operational errors (expected, safe to expose)
 * and programming errors (unexpected bugs).
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Mark as a known, safe error
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
