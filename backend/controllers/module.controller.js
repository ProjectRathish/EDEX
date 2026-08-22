'use strict';

const { pool } = require('../config/db');
const { generateUUID } = require('../utils/helpers');
const { sendSuccess, sendNotFound, sendBadRequest } = require('../utils/response');

// ─── List Modules for School ──────────────────────────────────────────────────
const listModules = async (req, res, next) => {
  try {
    const { school_id, roles = [] } = req.user;
    const isSuperAdmin = roles.includes('super_admin');
    const targetSchoolId = (isSuperAdmin && req.query.school_id) ? req.query.school_id : school_id;

    if (!targetSchoolId) {
      return sendBadRequest(res, 'school_id is required');
    }

    const [rows] = await pool.execute(
      `SELECT sm.school_module_id, sm.school_id, sm.module_name, sm.is_enabled,
              sm.activated_at, sm.activated_by, sm.expires_at, sm.notes,
              u.username as activated_by_username
       FROM core_school_modules sm
       LEFT JOIN core_users u ON sm.activated_by = u.user_id
       WHERE sm.school_id = ?
       ORDER BY sm.module_name ASC`,
      [targetSchoolId]
    );

    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─── Toggle Module (Enable/Disable) ───────────────────────────────────────────
const toggleModule = async (req, res, next) => {
  try {
    const { target_school_id, is_enabled, notes, expires_at } = req.body;
    const { moduleName } = req.params;

    const validModules = ['id_card', 'voting', 'bus', 'canteen'];
    if (!validModules.includes(moduleName)) {
      return sendBadRequest(res, `Invalid module name. Supported: ${validModules.join(', ')}`);
    }

    if (!target_school_id) {
      return sendBadRequest(res, 'target_school_id is required');
    }

    const shouldEnable = is_enabled === true || is_enabled === 'true';

    // Check if record exists
    const [existing] = await pool.execute(
      'SELECT school_module_id FROM core_school_modules WHERE school_id = ? AND module_name = ?',
      [target_school_id, moduleName]
    );

    if (existing.length === 0) {
      // Insert if missing
      await pool.execute(
        `INSERT INTO core_school_modules
           (school_module_id, school_id, module_name, is_enabled, activated_at, activated_by, notes, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          target_school_id,
          moduleName,
          shouldEnable,
          shouldEnable ? new Date() : null,
          shouldEnable ? req.user.user_id : null,
          notes || null,
          expires_at || null,
        ]
      );
    } else {
      await pool.execute(
        `UPDATE core_school_modules
         SET is_enabled = ?,
             activated_at = CASE WHEN ? = TRUE THEN NOW() ELSE activated_at END,
             activated_by = CASE WHEN ? = TRUE THEN ? ELSE activated_by END,
             notes = COALESCE(?, notes),
             expires_at = COALESCE(?, expires_at)
         WHERE school_id = ? AND module_name = ?`,
        [
          shouldEnable,
          shouldEnable,
          shouldEnable,
          req.user.user_id,
          notes || null,
          expires_at || null,
          target_school_id,
          moduleName,
        ]
      );
    }

    return sendSuccess(res, {
      school_id: target_school_id,
      module_name: moduleName,
      is_enabled: shouldEnable,
    }, `Module '${moduleName}' ${shouldEnable ? 'activated' : 'deactivated'} successfully`);
  } catch (err) {
    next(err);
  }
};

module.exports = { listModules, toggleModule };
