'use strict';

const { sendForbidden } = require('../utils/response');

/**
 * requirePermission(permission)
 * Middleware factory — checks that the authenticated user has the given permission.
 * Must be used AFTER the authenticate middleware.
 *
 * Usage:
 *   router.get('/students', authenticate, requirePermission('core.students.read'), controller)
 */
const requirePermission = (permission) => (req, res, next) => {
  const userPermissions = req.user?.permissions || [];

  if (userPermissions.includes(permission)) {
    return next();
  }

  return sendForbidden(res, `Access denied. Required permission: ${permission}`);
};

/**
 * requireAnyPermission(permissions[])
 * Passes if the user has AT LEAST ONE of the listed permissions.
 */
const requireAnyPermission = (permissions) => (req, res, next) => {
  const userPermissions = req.user?.permissions || [];
  const hasAny = permissions.some((p) => userPermissions.includes(p));

  if (hasAny) return next();

  return sendForbidden(res, `Access denied. Required one of: ${permissions.join(', ')}`);
};

/**
 * requireRole(role)
 * Checks that the user has the given role (in addition to permission checks).
 */
const requireRole = (role) => (req, res, next) => {
  const userRoles = req.user?.roles || [];

  if (userRoles.includes(role)) return next();

  return sendForbidden(res, `Access denied. Required role: ${role}`);
};

module.exports = { requirePermission, requireAnyPermission, requireRole };
