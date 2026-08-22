'use strict';

const bcrypt         = require('bcryptjs');
const { pool }       = require('../config/db');
const { generateUUID, generateSchoolCode } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendForbidden } = require('../utils/response');

// ─── Get Next Available System School Code ─────────────────────────────────────
const getNextCode = async (req, res, next) => {
  try {
    const code = await generateSchoolCode(pool);
    return sendSuccess(res, { code });
  } catch (err) {
    next(err);
  }
};

// ─── List Schools ─────────────────────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { school_id, roles = [] } = req.user;
    const isSuperAdmin = roles.includes('super_admin');

    let query = `
      SELECT s.school_id, s.name, s.code, s.address, s.city, s.state, s.country,
             s.phone, s.email, s.logo_url, s.timezone, s.is_active, s.created_at, s.updated_at,
             (SELECT COUNT(*) FROM core_students st WHERE st.school_id = s.school_id AND st.deleted_at IS NULL) as student_count,
             (SELECT COUNT(*) FROM core_staff sf WHERE sf.school_id = s.school_id AND sf.deleted_at IS NULL) as staff_count,
             (SELECT u.username FROM core_users u
              JOIN core_user_roles ur ON u.user_id = ur.user_id
              JOIN core_roles r ON ur.role_id = r.role_id
              WHERE u.school_id = s.school_id AND r.name = 'school_admin' AND u.deleted_at IS NULL
              LIMIT 1) as admin_username,
             (SELECT u.user_id FROM core_users u
              JOIN core_user_roles ur ON u.user_id = ur.user_id
              JOIN core_roles r ON ur.role_id = r.role_id
              WHERE u.school_id = s.school_id AND r.name = 'school_admin' AND u.deleted_at IS NULL
              LIMIT 1) as admin_user_id
      FROM core_schools s
      WHERE s.deleted_at IS NULL
    `;
    let params = [];

    if (!isSuperAdmin) {
      query += ' AND s.school_id = ?';
      params = [school_id];
    }

    query += ' ORDER BY s.name ASC';
    const [rows] = await pool.execute(query, params);
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─── Get One School ───────────────────────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { school_id, roles = [] } = req.user;
    const isSuperAdmin = roles.includes('super_admin');

    if (!isSuperAdmin && id !== school_id) {
      return sendForbidden(res, 'Access denied. You cannot view other schools.');
    }

    const [rows] = await pool.execute(
      `SELECT s.*,
              (SELECT COUNT(*) FROM core_students st WHERE st.school_id = s.school_id AND st.deleted_at IS NULL) as student_count,
              (SELECT COUNT(*) FROM core_staff sf WHERE sf.school_id = s.school_id AND sf.deleted_at IS NULL) as staff_count,
              (SELECT u.username FROM core_users u
               JOIN core_user_roles ur ON u.user_id = ur.user_id
               JOIN core_roles r ON ur.role_id = r.role_id
               WHERE u.school_id = s.school_id AND r.name = 'school_admin' AND u.deleted_at IS NULL
               LIMIT 1) as admin_username
       FROM core_schools s
       WHERE s.school_id = ? AND s.deleted_at IS NULL LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return sendNotFound(res, 'School not found');
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Create School (Super Admin Only with Unique Name & Code Checks) ──────────
const create = async (req, res, next) => {
  try {
    const {
      name,
      code,
      address,
      city,
      state,
      country,
      phone,
      email,
      timezone,
      admin_username,
      admin_password,
    } = req.body;

    if (!name || !name.trim()) {
      return sendBadRequest(res, 'School name is required');
    }

    const trimmedName = name.trim();

    // 1. Duplication Check: School Name
    const [existingName] = await pool.execute(
      'SELECT school_id, name FROM core_schools WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL LIMIT 1',
      [trimmedName]
    );
    if (existingName.length > 0) {
      return sendBadRequest(res, `A school with the name "${trimmedName}" already exists. School names must be unique.`);
    }

    const conn = await pool.getConnection();

    let formattedCode;
    if (code && code.trim()) {
      formattedCode = code.trim().toUpperCase().replace(/\s+/g, '-');
      // 2. Duplication Check: School Code
      const [existingCode] = await conn.execute(
        'SELECT school_id, code FROM core_schools WHERE UPPER(code) = ? AND deleted_at IS NULL LIMIT 1',
        [formattedCode]
      );
      if (existingCode.length > 0) {
        conn.release();
        return sendBadRequest(res, `A school with code "${formattedCode}" already exists. School code must be unique.`);
      }
    } else {
      // Auto-generate system unique code (SSA followed by 4 digits)
      formattedCode = await generateSchoolCode(conn);
    }

    const school_id = generateUUID();

    try {
      await conn.beginTransaction();

      // Insert School
      await conn.execute(
        `INSERT INTO core_schools
           (school_id, name, code, address, city, state, country, phone, email, timezone, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          school_id,
          trimmedName,
          formattedCode,
          address || null,
          city || null,
          state || null,
          country || 'India',
          phone || null,
          email || null,
          timezone || 'Asia/Kolkata',
        ]
      );

      // Auto-create standard module entries (all enabled or default active)
      const modules = ['id_card', 'voting', 'bus', 'canteen'];
      for (const mod of modules) {
        await conn.execute(
          `INSERT INTO core_school_modules (school_module_id, school_id, module_name, is_enabled)
           VALUES (?, ?, ?, TRUE)`,
          [generateUUID(), school_id, mod]
        );
      }

      // Auto-create default academic year (e.g. 2025-2026)
      const ayId = generateUUID();
      await conn.execute(
        `INSERT INTO core_academic_years
           (academic_year_id, school_id, name, start_date, end_date, is_current)
         VALUES (?, ?, '2025-2026', '2025-04-01', '2026-03-31', TRUE)`,
        [ayId, school_id]
      );

      // Create Initial School Admin user if username & password provided
      let createdAdminUser = null;
      const finalAdminUsername = (admin_username && admin_username.trim()) || `admin_${formattedCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const finalAdminPassword = (admin_password && admin_password.trim()) || 'AdminPass123!';

      const password_hash = await bcrypt.hash(finalAdminPassword, 10);
      const adminUserId = generateUUID();

      await conn.execute(
        `INSERT INTO core_users (user_id, school_id, username, email, phone, password_hash, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [adminUserId, school_id, finalAdminUsername, email || null, phone || null, password_hash]
      );

      // Find role_id for school_admin
      const [roleRow] = await conn.execute(
        "SELECT role_id FROM core_roles WHERE name = 'school_admin' AND (school_id = ? OR school_id IS NULL) LIMIT 1",
        [school_id]
      );
      if (roleRow.length > 0) {
        await conn.execute(
          `INSERT INTO core_user_roles (user_role_id, user_id, role_id, school_id, assigned_by)
           VALUES (?, ?, ?, ?, ?)`,
          [generateUUID(), adminUserId, roleRow[0].role_id, school_id, req.user.user_id]
        );
      }

      createdAdminUser = {
        username: finalAdminUsername,
        temporary_password: finalAdminPassword,
      };

      await conn.commit();

      return sendCreated(
        res,
        {
          school_id,
          name: trimmedName,
          code: formattedCode,
          admin_user: createdAdminUser,
        },
        'School registered and initial administrator account provisioned successfully.'
      );
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

// ─── Update School (Super Admin can change name; School Admin CANNOT change name) ─
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { school_id, roles = [] } = req.user;
    const isSuperAdmin = roles.includes('super_admin');

    if (!isSuperAdmin && id !== school_id) {
      return sendForbidden(res, 'Access denied. You cannot modify other schools.');
    }

    const [existing] = await pool.execute(
      'SELECT school_id, name, code FROM core_schools WHERE school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (existing.length === 0) return sendNotFound(res, 'School not found');

    const currentSchool = existing[0];
    const { name, code, address, city, state, country, phone, email, timezone, logo_url, is_active } = req.body;

    // Rule: School Admin CANNOT change school name or code!
    if (!isSuperAdmin) {
      if (name && name.trim().toLowerCase() !== currentSchool.name.toLowerCase()) {
        return sendForbidden(res, 'School Admins cannot change the official school name. Contact platform Super Admin.');
      }
      if (code && code.trim().toUpperCase() !== currentSchool.code.toUpperCase()) {
        return sendForbidden(res, 'School Admins cannot change the school code. Contact platform Super Admin.');
      }
    }

    let finalName = currentSchool.name;
    let finalCode = currentSchool.code;

    // If Super Admin changes name, check duplication
    if (isSuperAdmin && name && name.trim() && name.trim().toLowerCase() !== currentSchool.name.toLowerCase()) {
      const trimmedName = name.trim();
      const [dupName] = await pool.execute(
        'SELECT school_id FROM core_schools WHERE LOWER(name) = LOWER(?) AND school_id != ? AND deleted_at IS NULL LIMIT 1',
        [trimmedName, id]
      );
      if (dupName.length > 0) {
        return sendBadRequest(res, `A school with the name "${trimmedName}" already exists.`);
      }
      finalName = trimmedName;
    }

    // If Super Admin changes code, check duplication
    if (isSuperAdmin && code && code.trim() && code.trim().toUpperCase() !== currentSchool.code.toUpperCase()) {
      const formattedCode = code.trim().toUpperCase().replace(/\s+/g, '-');
      const [dupCode] = await pool.execute(
        'SELECT school_id FROM core_schools WHERE UPPER(code) = ? AND school_id != ? AND deleted_at IS NULL LIMIT 1',
        [formattedCode, id]
      );
      if (dupCode.length > 0) {
        return sendBadRequest(res, `A school with code "${formattedCode}" already exists.`);
      }
      finalCode = formattedCode;
    }

    await pool.execute(
      `UPDATE core_schools
       SET name=?, code=?, address=?, city=?, state=?, country=?, phone=?, email=?, timezone=?, logo_url=?, is_active=?
       WHERE school_id = ?`,
      [
        finalName,
        finalCode,
        address !== undefined ? address : null,
        city !== undefined ? city : null,
        state !== undefined ? state : null,
        country || 'India',
        phone !== undefined ? phone : null,
        email !== undefined ? email : null,
        timezone || 'Asia/Kolkata',
        logo_url !== undefined ? logo_url : (currentSchool.logo_url || null),
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        id,
      ]
    );

    return sendSuccess(res, { school_id: id, name: finalName, code: finalCode, logo_url: logo_url !== undefined ? logo_url : currentSchool.logo_url }, 'School details updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Toggle School Active Status (Super Admin Only) ───────────────────────────
const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const [existing] = await pool.execute(
      'SELECT school_id, name, is_active FROM core_schools WHERE school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (existing.length === 0) return sendNotFound(res, 'School not found');

    const newStatus = is_active !== undefined ? (is_active ? 1 : 0) : (existing[0].is_active ? 0 : 1);

    await pool.execute(
      'UPDATE core_schools SET is_active = ? WHERE school_id = ?',
      [newStatus, id]
    );

    // Also deactivate/activate school users
    await pool.execute(
      'UPDATE core_users SET is_active = ? WHERE school_id = ?',
      [newStatus, id]
    );

    return sendSuccess(
      res,
      { school_id: id, is_active: Boolean(newStatus) },
      `School has been ${newStatus ? 'activated' : 'deactivated'} successfully.`
    );
  } catch (err) {
    next(err);
  }
};

// ─── Delete School (Soft Delete) (Super Admin Only) ───────────────────────────
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      'SELECT school_id, name FROM core_schools WHERE school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (existing.length === 0) return sendNotFound(res, 'School not found');

    // Soft delete school
    await pool.execute('UPDATE core_schools SET deleted_at = NOW(), is_active = FALSE WHERE school_id = ?', [id]);
    // Soft delete associated users
    await pool.execute('UPDATE core_users SET deleted_at = NOW(), is_active = FALSE WHERE school_id = ?', [id]);

    return sendSuccess(res, { school_id: id }, `School "${existing[0].name}" has been deleted.`);
  } catch (err) {
    next(err);
  }
};

// ─── Reset Admin Password (Super Admin Only) ──────────────────────────────────
const resetAdminPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_password, user_id } = req.body;

    if (!new_password || new_password.length < 6) {
      return sendBadRequest(res, 'New password must be at least 6 characters');
    }

    const [schoolRows] = await pool.execute(
      'SELECT school_id, name, code FROM core_schools WHERE school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    );
    if (schoolRows.length === 0) return sendNotFound(res, 'School not found');

    const school = schoolRows[0];

    // Find school admin user
    let targetUserId = user_id;
    if (!targetUserId) {
      const [adminUserRows] = await pool.execute(
        `SELECT u.user_id, u.username
         FROM core_users u
         JOIN core_user_roles ur ON u.user_id = ur.user_id
         JOIN core_roles r ON ur.role_id = r.role_id
         WHERE u.school_id = ? AND r.name = 'school_admin' AND u.deleted_at IS NULL
         LIMIT 1`,
        [id]
      );
      if (adminUserRows.length > 0) {
        targetUserId = adminUserRows[0].user_id;
      }
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    if (targetUserId) {
      await pool.execute(
        'UPDATE core_users SET password_hash = ?, is_active = TRUE WHERE user_id = ?',
        [password_hash, targetUserId]
      );
      return sendSuccess(res, { school_id: id, user_id: targetUserId }, `Admin password reset successfully.`);
    } else {
      // Create admin user if not present
      const newAdminId = generateUUID();
      const adminUsername = `admin_${school.code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      await pool.execute(
        `INSERT INTO core_users (user_id, school_id, username, email, password_hash, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [newAdminId, id, adminUsername, school.email || null, password_hash]
      );

      const [roleRow] = await pool.execute(
        "SELECT role_id FROM core_roles WHERE name = 'school_admin' AND (school_id = ? OR school_id IS NULL) LIMIT 1",
        [id]
      );
      if (roleRow.length > 0) {
        await pool.execute(
          `INSERT INTO core_user_roles (user_role_id, user_id, role_id, school_id, assigned_by)
           VALUES (?, ?, ?, ?, ?)`,
          [generateUUID(), newAdminId, roleRow[0].role_id, id, req.user.user_id]
        );
      }

      return sendSuccess(res, { school_id: id, username: adminUsername }, `New admin user "${adminUsername}" created with password.`);
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { getNextCode, list, getOne, create, update, toggleStatus, remove, resetAdminPassword };

