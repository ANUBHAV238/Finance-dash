const { Transaction } = require('../models/Transaction');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

/**
 * Build a MongoDB filter object from query params.
 */
const buildFilter = (query) => {
  const filter = {};

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) filter.date.$lte = new Date(query.endDate);
  }

  if (query.search) {
    filter.$or = [
      { description: { $regex: query.search, $options: 'i' } },
      { notes: { $regex: query.search, $options: 'i' } },
    ];
  }

  return filter;
};

/**
 * Build sort object from query params.
 */
const buildSort = (query) => {
  const sortBy = query.sortBy || 'date';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  return { [sortBy]: sortOrder };
};

/**
 * List transactions with filtering, sorting, and pagination.
 */
const listTransactions = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildFilter(query);
  const sort = buildSort(query);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('createdBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return { transactions, meta: buildPaginationMeta({ page, limit, total }) };
};

/**
 * Get a single transaction by ID.
 */
const getTransactionById = async (id) => {
  const transaction = await Transaction.findById(id).populate('createdBy', 'name email role');
  if (!transaction) throw new AppError('Transaction not found.', 404);
  return transaction;
};

/**
 * Create a new transaction.
 */
const createTransaction = async (data, userId) => {
  const transaction = await Transaction.create({ ...data, createdBy: userId });
  await transaction.populate('createdBy', 'name email role');
  return transaction;
};

/**
 * Update an existing transaction.
 * Only admins can update any transaction; analysts/viewers can only update their own.
 */
const updateTransaction = async (id, updates, requestingUser) => {
  const transaction = await Transaction.findById(id);
  if (!transaction) throw new AppError('Transaction not found.', 404);

  const isOwner = transaction.createdBy.toString() === requestingUser._id.toString();
  const isAdmin = requestingUser.role === 'admin';

  if (!isAdmin && !isOwner) {
    throw new AppError('You can only edit your own transactions.', 403);
  }

  Object.assign(transaction, updates);
  await transaction.save();
  await transaction.populate('createdBy', 'name email role');
  return transaction;
};

/**
 * Soft-delete a transaction.
 * Admins can delete any; analysts can delete their own.
 */
const deleteTransaction = async (id, requestingUser) => {
  const transaction = await Transaction.findById(id);
  if (!transaction) throw new AppError('Transaction not found.', 404);

  const isOwner = transaction.createdBy.toString() === requestingUser._id.toString();
  const isAdmin = requestingUser.role === 'admin';

  if (!isAdmin && !isOwner) {
    throw new AppError('You can only delete your own transactions.', 403);
  }

  await transaction.softDelete(requestingUser._id);
  return transaction;
};

module.exports = {
  listTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
