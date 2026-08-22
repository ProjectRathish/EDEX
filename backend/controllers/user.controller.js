'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateUUID, parsePagination, paginationMeta } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendForbidden } = require('../utils/response');

// ─── List Users ───────────────────────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { school_id, roles = [] } = req.user;
    const isSuperAdmin = roles.includes('super_admin');
    const { page, limit, offset } = parsePagination(req.query);
    const { search, is_active } = req.query;

    let where = 'WHERE u.deleted_at IS NULL';
    let params = [];

    if (!isSuperAdmin) {
      where += ' AND u.school_id = ?';
      params.push(school_id);
    }

    if (is_active !== undefined) {
      where += ' AND u.is_active = ?';
      params.push(is_active === 'true' || is_active === '1');
    }

    if (search) {
      where += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM core_users u ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT u.user_id, u.school_id, u.username, u.email, u.phone, u.is_active, u.last_login_at, u.created_at,
              s.name as school_name
       FROM core_users u
       LEFT JOIN core_schools s ON u.school_id = s.school_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Fetch roles for each user
    const userIds = rows.map((r) => r.user_id);
    let userRolesMap = {};

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const [roleRows] = await pool.execute(
        `SELECT ur.user_id, r.role_id, r.name as role_name
         FROM core_user_roles ur
         JOIN core_roles r ON ur.role_id = r.role_id
         WHERE ur.user_id IN (${placeholders})`,
        userIds
      );
      roleRows.forEach((r) => {
        if (!userRolesMap[r.user_id]) userRolesMap[r.user_id] = [];
        userRolesMap[r.user_id].push(r.role_name);
      });
    }

    const result = rows.map((u) => ({
      ...u,
      roles: userRolesMap[u.user_id] || [],
    }));

    return sendSuccess(res, {
      users: result,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get One User ─────────────────────────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const { school_id, roles = [] } = req.user;
    const isSuperAdmin = roles.includes('super_admin');
    const { id } = req.params;

    let where = 'WHERE u.user_id = ? AND u.deleted_at IS NULL';
    let params = [id];

    if (!isSuperAdmin) {
      where += ' AND u.school_id = ?';
      params.push(school_id);
    }

    const [users] = await pool.execute(
      `SELECT u.user_id, u.school_id, u.username, u.email, u.phone, u.is_active, u.last_login_at, u.created_at,
              s.name as school_name
       FROM core_users u
       LEFT JOIN core_schools s ON u.school_id = s.school_id
       ${where} LIMIT 1`,
      params
    );
    if (users.length === 0) return sendNotFound(res, 'User not found');
    const user = users[0];

    // Fetch user roles
    const [rolesList] = await pool.execute(
      `SELECT r.role_id, r.name, r.description
       FROM core_user_roles ur
       JOIN core_roles r ON ur.role_id = r.role_id
       WHERE ur.user_id = ?`,
      [id]
    );

    // Fetch staff link if any
    const [staffLinks] = await pool.execute(
      `SELECT st.staff_id, st.employee_id, st.first_name, st.last_name, st.designation
       FROM core_user_staff_links usl
       JOIN core_staff st ON usl.staff_id = st.staff_id
       WHERE usl.user_id = ?`,
      [id]
    );

    // Fetch guardian link if any
    const [guardianLinks] = await pool.execute(
      `SELECT g.guardian_id, g.first_name, g.last_name, g.relationship_type
       FROM core_user_guardian_links ugl
       JOIN core_guardians g ON ugl.guardian_id = g.guardian_id
       WHERE ugl.user_id = ?`,
      [id]
    );

    return sendSuccess(res, {
      ...user,
      roles: rolesList,
      staff_profile: staffLinks[0] || null,
      guardian_profile: guardianLinks[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Create User ──────────────────────────────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const { roles: requesterRoles = [] } = req.user;
    const isSuperAdmin = requesterRoles.includes('super_admin');
    const { username, email, phone, password, role_names = [], target_school_id, staff_id, guardian_id } = req.body;

    if (!username || !password) {
      return sendBadRequest(res, 'username and password are required');
    }

    const assignedSchoolId = isSuperAdmin ? (target_school_id || null) : req.user.school_id;

    // Backend rule: school_id can only be null for super_admin
    if (!assignedSchoolId && !role_names.includes('super_admin')) {
      return sendBadRequest(res, 'A school_id is required for non-super_admin users');
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user_id = generateUUID();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO core_users (user_id, school_id, username, email, phone, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, assignedSchoolId, username, email || null, phone || null, password_hash]
      );

      // Assign Roles
      for (const roleName of role_names) {
        const [r] = await conn.execute(
          'SELECT role_id FROM core_roles WHERE name = ? AND (school_id = ? OR school_id IS NULL) LIMIT 1',
          [roleName, assignedSchoolId]
        );
        if (r.length > 0) {
          await conn.execute(
            `INSERT INTO core_user_roles (user_role_id, user_id, role_id, school_id, assigned_by)
             VALUES (?, ?, ?, ?, ?)`,
            [generateUUID(), user_id, r[0].role_id, assignedSchoolId, req.user.user_id]
          );
        }
      }

      // Link Staff profile if provided
      if (staff_id && assignedSchoolId) {
        await conn.execute(
          `INSERT INTO core_user_staff_links (link_id, user_id, staff_id, school_id)
           VALUES (?, ?, ?, ?)`,
          [generateUUID(), user_id, staff_id, assignedSchoolId]
        );
      }

      // Link Guardian profile if provided
      if (guardian_id && assignedSchoolId) {
        await conn.execute(
          `INSERT INTO core_user_guardian_links (link_id, user_id, guardian_id, school_id)
           VALUES (?, ?, ?, ?)`,
          [generateUUID(), user_id, guardian_id, assignedSchoolId]
        );
      }

      await conn.commit();
      return sendCreated(res, { user_id, username, email, school_id: assignedSchoolId }, 'User created successfully');
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

// ─── Update User (Status, Roles, Password) ────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const { school_id, roles: requesterRoles = [] } = req.user;
    const isSuperAdmin = requesterRoles.includes('super_admin');
    const { id } = req.params;
    const { email, phone, password, is_active, role_names } = req.body;

    let checkWhere = 'WHERE user_id = ? AND deleted_at IS NULL';
    let checkParams = [id];
    if (!isSuperAdmin) {
      checkWhere += ' AND school_id = ?';
      checkParams.push(school_id);
    }

    const [existing] = await pool.execute(`SELECT user_id, school_id FROM core_users ${checkWhere}`, checkParams);
    if (existing.length === 0) return sendNotFound(res, 'User not found');
    const user = existing[0];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (password) {
        const password_hash = await bcrypt.hash(password, 10);
        await conn.execute('UPDATE core_users SET password_hash = ? WHERE user_id = ?', [password_hash, id]);
      }

      if (email !== undefined || phone !== undefined || is_active !== undefined) {
        await conn.execute(
          'UPDATE core_users SET email = ?, phone = ?, is_active = ? WHERE user_id = ?',
          [email || null, phone || null, is_active !== undefined ? is_active : true, id]
        );
      }

      if (Array.isArray(role_names)) {
        // Replace roles
        await conn.execute('DELETE FROM core_user_roles WHERE user_id = ?', [id]);
        for (const roleName of role_names) {
          const [r] = await conn.execute(
            'SELECT role_id FROM core_roles WHERE name = ? AND (school_id = ? OR school_id IS NULL) LIMIT 1',
            [roleName, user.school_id]
          );
          if (r.length > 0) {
            await conn.execute(
              `INSERT INTO core_user_roles (user_role_id, user_id, role_id, school_id, assigned_by)
               VALUES (?, ?, ?, ?, ?)`,
              [generateUUID(), id, r[0].role_id, user.school_id, req.user.user_id]
            );
          }
        }
      }

      await conn.commit();
      return sendSuccess(res, { user_id: id }, 'User updated successfully');
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

module.exports = { list, getOne, create, update };
