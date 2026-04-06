/**
 * Standardized API response helpers.
 * All responses follow: { success, message, data?, meta?, errors? }
 */

const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendError = (res, { statusCode = 500, message = 'Internal server error', errors = null } = {}) => {
  const response = { success: false, message };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendCreated = (res, { message = 'Created successfully', data = null } = {}) =>
  sendSuccess(res, { statusCode: 201, message, data });

const sendNotFound = (res, message = 'Resource not found') =>
  sendError(res, { statusCode: 404, message });

const sendUnauthorized = (res, message = 'Unauthorized') =>
  sendError(res, { statusCode: 401, message });

const sendForbidden = (res, message = 'Access denied') =>
  sendError(res, { statusCode: 403, message });

const sendBadRequest = (res, { message = 'Bad request', errors = null } = {}) =>
  sendError(res, { statusCode: 400, message, errors });

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest,
};
