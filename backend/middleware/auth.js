'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { sendUnauthorized } = require('../utils/response');

/**
 * authenticate
 * Verifies the JWT in the Authorization header.
 * On success, attaches the decoded payload to req.user:
 *   req.user = { user_id, school_id, roles[], permissions[] }
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res, 'No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;   // { user_id, school_id, roles, permissions }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Token has expired');
    }
    return sendUnauthorized(res, 'Invalid token');
  }
};

module.exports = { authenticate };
