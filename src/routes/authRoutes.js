const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerValidator, loginValidator } = require('../validators/authValidators');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (role defaults to viewer; admin can assign any role)
 * @access  Public
 */
router.post('/register', registerValidator, validate, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login and receive a JWT
 * @access  Public
 */
router.post('/login', loginValidator, validate, authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get the currently authenticated user's profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

module.exports = router;
