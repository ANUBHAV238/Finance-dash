const userService = require('../services/userService');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/apiResponse');

/**
 * GET /api/users
 * Admin only. List all users with optional filters and pagination.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { users, meta } = await userService.getAllUsers(req.query);
    return sendSuccess(res, { message: 'Users retrieved.', data: { users }, meta });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Admin can view any user. Others can only view themselves (enforced in service).
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, { message: 'User retrieved.', data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id
 * Admins can update any user's name, role, or isActive.
 * Non-admins can only update their own name.
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, role, isActive } = req.body;
    const user = await userService.updateUser(req.params.id, { name, role, isActive }, req.user);
    return sendSuccess(res, { message: 'User updated.', data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id/deactivate
 * Admin only. Soft-deactivate a user account.
 */
const deactivateUser = async (req, res, next) => {
  try {
    const user = await userService.deactivateUser(req.params.id, req.user);
    return sendSuccess(res, { message: 'User deactivated.', data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Admin only. Permanently delete a user.
 */
const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user);
    return sendSuccess(res, { message: 'User permanently deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deactivateUser, deleteUser };
