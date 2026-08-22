'use strict';

const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const { pool }    = require('../config/db');
const config      = require('../config/config');
const { sendSuccess, sendUnauthorized, sendBadRequest } = require('../utils/response');

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { username, password, school_code } = req.body;

    if (!username || !password) {
      return sendBadRequest(res, 'Username and password are required');
    }

    // 1. If school_code is provided, handle SYSTEM (Super Admin) vs School-scoped login
    let targetSchoolId = undefined;
    let isSystemLogin = false;

    if (school_code && school_code.trim()) {
      const codeTrimmed = school_code.trim().toUpperCase();
      if (codeTrimmed === 'SYSTEM') {
        isSystemLogin = true;
      } else {
        const [schools] = await pool.execute(
          'SELECT school_id, is_active, name FROM core_schools WHERE UPPER(code) = ? AND deleted_at IS NULL LIMIT 1',
          [codeTrimmed]
        );
        if (schools.length === 0) {
          return sendUnauthorized(res, `Invalid School Code: "${school_code}". School not found.`);
        }
        if (!schools[0].is_active) {
          return sendUnauthorized(res, `School "${schools[0].name}" is currently deactivated. Please contact platform administration.`);
        }
        targetSchoolId = schools[0].school_id;
      }
    }

    // 2. Find user by username
    let query = `SELECT u.user_id, u.school_id, u.username, u.email, u.phone, u.password_hash, u.is_active
                 FROM core_users u
                 WHERE u.username = ? AND u.deleted_at IS NULL`;
    const params = [username];

    if (isSystemLogin) {
      query += ' AND u.school_id IS NULL';
    } else if (targetSchoolId) {
      query += ' AND u.school_id = ?';
      params.push(targetSchoolId);
    }

    query += ' LIMIT 1';

    const [users] = await pool.execute(query, params);

    if (users.length === 0) {
      if (isSystemLogin) {
        return sendUnauthorized(res, 'Invalid SYSTEM super admin credentials');
      }
      return sendUnauthorized(res, 'Invalid username, password, or school code');
    }

    const user = users[0];

    if (!user.is_active) {
      return sendUnauthorized(res, 'Your account has been deactivated. Contact your administrator.');
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendUnauthorized(res, 'Invalid username or password');
    }

    // 4. Fetch roles for this user
    const [roleRows] = await pool.execute(
      `SELECT r.name FROM core_user_roles ur
       JOIN core_roles r ON ur.role_id = r.role_id
       WHERE ur.user_id = ? AND (ur.school_id = ? OR ur.school_id IS NULL)`,
      [user.user_id, user.school_id]
    );
    const roles = roleRows.map((r) => r.name);

    if (isSystemLogin && !roles.includes('super_admin')) {
      return sendUnauthorized(res, 'Access denied. You do not have Super Admin permissions.');
    }

    // 5. Fetch permissions for those roles
    const [permRows] = await pool.execute(
      `SELECT DISTINCT p.name FROM core_role_permissions rp
       JOIN core_permissions p ON rp.permission_id = p.permission_id
       JOIN core_user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = ?`,
      [user.user_id]
    );
    const permissions = permRows.map((p) => p.name);

    // 6. Build JWT payload
    const payload = {
      user_id  : user.user_id,
      school_id: user.school_id,   // null for super_admin
      username : user.username,
      roles,
      permissions,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    // 7. Update last_login_at
    await pool.execute(
      'UPDATE core_users SET last_login_at = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    return sendSuccess(res, {
      token,
      user: {
        user_id  : user.user_id,
        school_id: user.school_id,
        username : user.username,
        email    : user.email,
        phone    : user.phone,
        roles,
      },
    }, 'Login successful');

  } catch (err) {
    next(err);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = (req, res) => {
  return sendSuccess(res, null, 'Logged out successfully');
};

// ─── Me ───────────────────────────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const [rows] = await pool.execute(
      `SELECT user_id, school_id, username, email, phone, last_login_at, created_at
       FROM core_users WHERE user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [user_id]
    );
    if (rows.length === 0) return sendUnauthorized(res, 'User not found');
    return sendSuccess(res, {
      ...rows[0],
      roles      : req.user.roles,
      permissions: req.user.permissions,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Change Password ─────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return sendBadRequest(res, 'Current password and new password are required');
    }

    if (new_password.length < 6) {
      return sendBadRequest(res, 'New password must be at least 6 characters long');
    }

    const [users] = await pool.execute(
      'SELECT password_hash FROM core_users WHERE user_id = ? AND deleted_at IS NULL LIMIT 1',
      [user_id]
    );

    if (users.length === 0) {
      return sendUnauthorized(res, 'User not found');
    }

    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) {
      return sendBadRequest(res, 'Current password does not match');
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.execute('UPDATE core_users SET password_hash = ? WHERE user_id = ?', [newHash, user_id]);

    return sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Update Profile ──────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { email, phone } = req.body;

    await pool.execute(
      'UPDATE core_users SET email = ?, phone = ? WHERE user_id = ?',
      [email || null, phone || null, user_id]
    );

    return sendSuccess(res, { email, phone }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, logout, me, changePassword, updateProfile };
