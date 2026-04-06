const { User } = require('../models/User');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * Get all users with optional pagination.
 */
const getAllUsers = async (query) => {
  const { page, limit, skip } = parsePagination(query);

  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, meta: buildPaginationMeta({ page, limit, total }) };
};

/**
 * Get a single user by ID.
 */
const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

/**
 * Update user profile or role/status (admin only for role/status changes).
 *
 * Uses findByIdAndUpdate to avoid triggering the password pre-save hook
 * on documents fetched without the password field (select: false).
 */
const updateUser = async (id, updates, requestingUser) => {
  // Check existence first so we can return a clean 404
  const exists = await User.findById(id).lean();
  if (!exists) throw new AppError('User not found.', 404);

  // Non-admins can only update their own profile
  if (requestingUser.role !== 'admin' && requestingUser._id.toString() !== id) {
    throw new AppError('You can only update your own profile.', 403);
  }

  // Only admins can change role or active status
  if (requestingUser.role !== 'admin') {
    delete updates.role;
    delete updates.isActive;
  }

  // Prevent admin from self-deactivating
  if (requestingUser._id.toString() === id && updates.isActive === false) {
    throw new AppError('You cannot deactivate your own account.', 400);
  }

  // Strip undefined fields so we don't accidentally unset anything
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );

  const user = await User.findByIdAndUpdate(
    id,
    { $set: cleanUpdates },
    { new: true, runValidators: true }
  );

  return user;
};

/**
 * Soft-deactivate a user (admin only).
 */
const deactivateUser = async (id, requestingUser) => {
  if (requestingUser._id.toString() === id) {
    throw new AppError('You cannot deactivate your own account.', 400);
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true }
  );
  if (!user) throw new AppError('User not found.', 404);

  return user;
};

/**
 * Permanently delete a user (admin only). Use with caution.
 */
const deleteUser = async (id, requestingUser) => {
  if (requestingUser._id.toString() === id) {
    throw new AppError('You cannot delete your own account.', 400);
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

module.exports = { getAllUsers, getUserById, updateUser, deactivateUser, deleteUser };
