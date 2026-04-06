const express = require('express');
const router = express.Router();

const transactionController = require('../controllers/transactionController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createTransactionValidator,
  updateTransactionValidator,
  listTransactionValidator,
  mongoIdParamValidator,
} = require('../validators/transactionValidators');
const { ROLES } = require('../models/User');

// All transaction routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/transactions
 * @desc    List transactions with filtering (type, category, date range, search), sorting, and pagination
 * @access  Viewer, Analyst, Admin
 */
router.get('/', listTransactionValidator, validate, transactionController.listTransactions);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get a single transaction by ID
 * @access  Viewer, Analyst, Admin
 */
router.get('/:id', mongoIdParamValidator, validate, transactionController.getTransactionById);

/**
 * @route   POST /api/transactions
 * @desc    Create a new financial transaction
 * @access  Analyst, Admin
 */
router.post(
  '/',
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  createTransactionValidator,
  validate,
  transactionController.createTransaction
);

/**
 * @route   PATCH /api/transactions/:id
 * @desc    Update a transaction (admin: any; analyst: own only)
 * @access  Analyst, Admin
 */
router.patch(
  '/:id',
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  updateTransactionValidator,
  validate,
  transactionController.updateTransaction
);

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Soft-delete a transaction (admin: any; analyst: own only)
 * @access  Analyst, Admin
 */
router.delete(
  '/:id',
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  mongoIdParamValidator,
  validate,
  transactionController.deleteTransaction
);

module.exports = router;
