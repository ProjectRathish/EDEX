'use strict';

const { pool } = require('../config/db');
const { sendForbidden } = require('../utils/response');

/**
 * requireModule(moduleName)
 * Middleware factory — checks that the given module is activated for the
 * authenticated user's school in core_school_modules.
 *
 * Must be used AFTER authenticate middleware (requires req.user.school_id).
 *
 * Usage:
 *   router.get('/cards', authenticate, requireModule('id_card'), requirePermission('id_card.cards.read'), controller)
 *
 * Super Admins (school_id = null) bypass this check.
 */
const requireModule = (moduleName) => async (req, res, next) => {
  try {
    const { school_id, roles = [] } = req.user || {};

    // Super admins bypass module gate
    if (!school_id || roles.includes('super_admin')) {
      return next();
    }

    const [rows] = await pool.execute(
      `SELECT is_enabled FROM core_school_modules
       WHERE school_id = ? AND module_name = ?
       LIMIT 1`,
      [school_id, moduleName]
    );

    if (rows.length === 0 || !rows[0].is_enabled) {
      return sendForbidden(
        res,
        `The '${moduleName}' module is not activated for your school.`
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireModule };
