const { body, param } = require('express-validator');
const { ROLES } = require('../models/User');

const updateUserValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('role')
    .optional()
    .isIn(Object.values(ROLES)).withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
];

const mongoIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid user ID format'),
];

module.exports = { updateUserValidator, mongoIdParamValidator };
