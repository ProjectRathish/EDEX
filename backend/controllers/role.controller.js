'use strict';

const { pool } = require('../config/db');
const { generateUUID } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');

// ─── List Roles ───────────────────────────────────────────────────────────────
const listRoles = async (req, res, next) => {
  try {
    const { school_id } = req.user;

    const [rows] = await pool.execute(
      `SELECT r.role_id, r.school_id, r.name, r.description, r.is_system_role,
              COUNT(rp.permission_id) as permissions_count
       FROM core_roles r
       LEFT JOIN core_role_permissions rp ON r.role_id = rp.role_id
       WHERE r.school_id = ? OR r.school_id IS NULL
       GROUP BY r.role_id
       ORDER BY r.is_system_role DESC, r.name ASC`,
      [school_id]
    );

    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─── Get Role with Permissions ────────────────────────────────────────────────
const getRole = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const [roles] = await pool.execute(
      `SELECT * FROM core_roles
       WHERE role_id = ? AND (school_id = ? OR school_id IS NULL)
       LIMIT 1`,
      [id, school_id]
    );
    if (roles.length === 0) return sendNotFound(res, 'Role not found');

    const [perms] = await pool.execute(
      `SELECT p.permission_id, p.name, p.module, p.resource, p.action, p.description
       FROM core_role_permissions rp
       JOIN core_permissions p ON rp.permission_id = p.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.module, p.name`,
      [id]
    );

    return sendSuccess(res, { ...roles[0], permissions: perms });
  } catch (err) {
    next(err);
  }
};

// ─── List All Platform Permissions (Grouped by module) ────────────────────────
const listPermissions = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT permission_id, name, module, resource, action, description
       FROM core_permissions
       ORDER BY module, resource, action`
    );

    const grouped = {};
    rows.forEach((p) => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });

    return sendSuccess(res, {
      total: rows.length,
      modules: grouped,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Create Custom Role for School ────────────────────────────────────────────
const createRole = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { name, description, permission_ids = [] } = req.body;

    if (!name) return sendBadRequest(res, 'name is required');

    const role_id = generateUUID();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO core_roles (role_id, school_id, name, description, is_system_role)
         VALUES (?, ?, ?, ?, FALSE)`,
        [role_id, school_id, name, description || null]
      );

      for (const permId of permission_ids) {
        await conn.execute(
          `INSERT INTO core_role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [role_id, permId]
        );
      }

      await conn.commit();
      return sendCreated(res, { role_id, name, permissions_count: permission_ids.length }, 'Custom role created successfully');
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
};

// ─── Update Custom Role Permissions ───────────────────────────────────────────
const updateRolePermissions = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    const { permission_ids = [] } = req.body;

    // Verify it's a custom role in the user's school (system roles cannot be modified)
    const [roles] = await pool.execute(
      'SELECT role_id, is_system_role FROM core_roles WHERE role_id = ? AND school_id = ?',
      [id, school_id]
    );
    if (roles.length === 0) return sendNotFound(res, 'Role not found or is a system role that cannot be altered');

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute('DELETE FROM core_role_permissions WHERE role_id = ?', [id]);

      for (const permId of permission_ids) {
        await conn.execute(
          `INSERT INTO core_role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [id, permId]
        );
      }

      await conn.commit();
      return sendSuccess(res, { role_id: id, permissions_count: permission_ids.length }, 'Role permissions updated successfully');
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { listRoles, getRole, listPermissions, createRole, updateRolePermissions };
