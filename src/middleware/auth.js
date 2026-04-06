const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const config = require('../config/env');
const { sendUnauthorized, sendForbidden } = require('../utils/apiResponse');

/**
 * Verifies JWT token and attaches user to request.
 * Must run before any route that requires authentication.
 */
const authenticate = async (req, res, next) => {
  try {
    // Support both "Bearer <token>" header and direct token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'No token provided. Please log in.');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError' ? 'Token has expired. Please log in again.' : 'Invalid token.';
      return sendUnauthorized(res, message);
    }

    // Fetch fresh user (to catch deactivated accounts)
    const user = await User.findById(decoded.id).select('+isActive');
    if (!user) {
      return sendUnauthorized(res, 'User no longer exists.');
    }

    if (!user.isActive) {
      return sendForbidden(res, 'Your account has been deactivated. Contact an admin.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('admin', 'analyst')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendForbidden(
        res,
        `Role '${req.user.role}' is not authorized for this action. Required: ${allowedRoles.join(' or ')}.`
      );
    }

    next();
  };
};

module.exports = { authenticate, authorize };
