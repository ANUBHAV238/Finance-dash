const authService = require('../services/authService');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { ROLES } = require('../models/User');

/**
 * POST /api/auth/register
 * Public route. Role assignment restricted: only admins can assign non-viewer roles.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // If caller is not an authenticated admin, force role to viewer
    const assignedRole =
      req.user?.role === ROLES.ADMIN && role ? role : ROLES.VIEWER;

    const { user, token } = await authService.register({ name, email, password, role: assignedRole });

    return sendCreated(res, {
      message: 'Registration successful.',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Public route.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });

    return sendSuccess(res, {
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      message: 'Profile retrieved.',
      data: { user: req.user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
