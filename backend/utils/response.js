'use strict';

// ─── Standard API Response Helpers ───────────────────────────────────────────
// Use these in every controller to keep response shape consistent.

/**
 * Send a successful response.
 * @param {object} res   - Express response object
 * @param {*}      data  - Payload to send
 * @param {string} message
 * @param {number} statusCode - HTTP status (default 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send a created (201) response.
 */
const sendCreated = (res, data = null, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send an error response.
 */
const sendError = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Send a 400 Bad Request.
 */
const sendBadRequest = (res, message = 'Bad request', errors = null) =>
  sendError(res, message, 400, errors);

/**
 * Send a 401 Unauthorized.
 */
const sendUnauthorized = (res, message = 'Unauthorized') =>
  sendError(res, message, 401);

/**
 * Send a 403 Forbidden.
 */
const sendForbidden = (res, message = 'Forbidden') =>
  sendError(res, message, 403);

/**
 * Send a 404 Not Found.
 */
const sendNotFound = (res, message = 'Resource not found') =>
  sendError(res, message, 404);

/**
 * Send a 409 Conflict.
 */
const sendConflict = (res, message = 'Conflict: Resource already exists') =>
  sendError(res, message, 409);

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
};
