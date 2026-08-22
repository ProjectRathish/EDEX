'use strict';

const { sendError } = require('../utils/response');

/**
 * Global error handler — must be the LAST middleware registered in server.js.
 * Catches any error passed to next(err).
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);

  // MySQL / MariaDB duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return sendError(res, 'A record with this value already exists.', 409);
  }

  // MySQL FK constraint violation
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return sendError(res, 'Referenced record does not exist.', 400);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message    = err.message || 'Internal server error';

  return sendError(res, message, statusCode);
};

/**
 * 404 handler — catches any request that didn't match a route.
 */
const notFound = (req, res) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

module.exports = { errorHandler, notFound };
