const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const config = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Generates a signed JWT for the given user ID.
 */
const generateToken = (userId) =>
  jwt.sign({ id: userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

/**
 * Register a new user.
 * Only admins can assign non-default roles (enforced at controller layer).
 */
const register = async ({ name, email, password, role }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email is already registered.', 409);
  }

  const user = await User.create({ name, email, password, role });
  const token = generateToken(user._id);

  return { user, token };
};

/**
 * Authenticate a user by email and password.
 */
const login = async ({ email, password }) => {
  // Explicitly select password field (excluded by default in schema)
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact an admin.', 403);
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);

  return { user, token };
};

module.exports = { register, login };
