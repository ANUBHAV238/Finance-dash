const { body, query, param } = require('express-validator');
const { TRANSACTION_TYPES, CATEGORIES } = require('../models/Transaction');

const createTransactionValidator = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),

  body('type')
    .notEmpty().withMessage('Transaction type is required')
    .isIn(Object.values(TRANSACTION_TYPES))
    .withMessage(`Type must be one of: ${Object.values(TRANSACTION_TYPES).join(', ')}`),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(Object.values(CATEGORIES))
    .withMessage(`Category must be one of: ${Object.values(CATEGORIES).join(', ')}`),

  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid ISO 8601 date'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
];

const updateTransactionValidator = [
  param('id').isMongoId().withMessage('Invalid transaction ID'),

  body('amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),

  body('type')
    .optional()
    .isIn(Object.values(TRANSACTION_TYPES))
    .withMessage(`Type must be one of: ${Object.values(TRANSACTION_TYPES).join(', ')}`),

  body('category')
    .optional()
    .isIn(Object.values(CATEGORIES))
    .withMessage(`Category must be one of: ${Object.values(CATEGORIES).join(', ')}`),

  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid ISO 8601 date'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
];

const listTransactionValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(Object.values(TRANSACTION_TYPES))
    .withMessage(`Type must be one of: ${Object.values(TRANSACTION_TYPES).join(', ')}`),
  query('category')
    .optional()
    .isIn(Object.values(CATEGORIES))
    .withMessage(`Category must be one of: ${Object.values(CATEGORIES).join(', ')}`),
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO 8601 date'),
  query('sortBy')
    .optional()
    .isIn(['date', 'amount', 'createdAt'])
    .withMessage('sortBy must be one of: date, amount, createdAt'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be asc or desc'),
];

const mongoIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

module.exports = {
  createTransactionValidator,
  updateTransactionValidator,
  listTransactionValidator,
  mongoIdParamValidator,
};
