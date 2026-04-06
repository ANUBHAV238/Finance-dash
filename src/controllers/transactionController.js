const transactionService = require('../services/transactionService');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');

/**
 * GET /api/transactions
 * All authenticated users. Supports filtering, sorting, pagination, and search.
 */
const listTransactions = async (req, res, next) => {
  try {
    const { transactions, meta } = await transactionService.listTransactions(req.query);
    return sendSuccess(res, { message: 'Transactions retrieved.', data: { transactions }, meta });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/transactions/:id
 * All authenticated users.
 */
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id);
    return sendSuccess(res, { message: 'Transaction retrieved.', data: { transaction } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transactions
 * Admin and Analyst only.
 */
const createTransaction = async (req, res, next) => {
  try {
    const { amount, type, category, date, description, notes } = req.body;
    const transaction = await transactionService.createTransaction(
      { amount, type, category, date, description, notes },
      req.user._id
    );
    return sendCreated(res, { message: 'Transaction created.', data: { transaction } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/transactions/:id
 * Admin can update any. Analyst can update their own.
 */
const updateTransaction = async (req, res, next) => {
  try {
    const { amount, type, category, date, description, notes } = req.body;
    const transaction = await transactionService.updateTransaction(
      req.params.id,
      { amount, type, category, date, description, notes },
      req.user
    );
    return sendSuccess(res, { message: 'Transaction updated.', data: { transaction } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/transactions/:id
 * Admin can delete any. Analyst can delete their own.
 * Soft delete — data is retained with isDeleted flag.
 */
const deleteTransaction = async (req, res, next) => {
  try {
    await transactionService.deleteTransaction(req.params.id, req.user);
    return sendSuccess(res, { message: 'Transaction deleted (soft).' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
