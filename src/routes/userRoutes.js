const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { updateUserValidator, mongoIdParamValidator } = require('../validators/userValidators');
const { ROLES } = require('../models/User');

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    List all users with optional filters (role, isActive) and pagination
 * @access  Admin only
 */
router.get('/', authorize(ROLES.ADMIN), userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get a single user by ID
 * @access  Admin (any user), others (own profile only — enforced in service)
 */
router.get('/:id', mongoIdParamValidator, validate, userController.getUserById);

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user name, role, or active status
 * @access  Admin (any field, any user), others (own name only)
 */
router.patch('/:id', updateUserValidator, validate, userController.updateUser);

/**
 * @route   PATCH /api/users/:id/deactivate
 * @desc    Deactivate a user account (sets isActive = false)
 * @access  Admin only
 */
router.patch(
  '/:id/deactivate',
  authorize(ROLES.ADMIN),
  mongoIdParamValidator,
  validate,
  userController.deactivateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Permanently delete a user
 * @access  Admin only
 */
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  mongoIdParamValidator,
  validate,
  userController.deleteUser
);

module.exports = router;
