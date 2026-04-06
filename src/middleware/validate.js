const { validationResult } = require('express-validator');
const { sendBadRequest } = require('../utils/apiResponse');

/**
 * Runs after express-validator chains.
 * If errors exist, responds with 400 and all field-level errors.
 * Otherwise, calls next().
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return sendBadRequest(res, {
      message: 'Validation failed',
      errors: formatted,
    });
  }
  next();
};

module.exports = { validate };
