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

    const userProfile = await buildUserProfile(user, roles, permissions);

    return sendSuccess(res, {
      token,
      user: userProfile,
    }, 'Login successful');

  } catch (err) {
    next(err);
  }
};

// ─── Helper: Build Complete User Profile & Module Access ───────────────────────
async function buildUserProfile(user, roles = [], permissions = []) {
  const isSuperAdmin = roles.includes('super_admin');
  
  // Calculate accessible modules
  let accessible_modules = [];
  if (isSuperAdmin) {
    accessible_modules = ['super_admin', 'core', 'id_card', 'voting', 'bus', 'canteen', 'attendance', 'fees'];
  } else {
    const fromPerms = [...new Set(permissions.map(p => p.split('.')[0]))];
    const set = new Set(fromPerms);
    if (roles.includes('bus_driver')) set.add('bus');
    if (roles.includes('canteen_operator')) set.add('canteen');
    if (roles.includes('parent')) {
      set.add('bus');
      set.add('canteen');
      set.add('attendance');
    }
    accessible_modules = Array.from(set);
  }

  // Fetch school details if applicable
  let school = null;
  if (user.school_id) {
    const [schools] = await pool.execute(
      'SELECT school_id, code, name, city, state, logo_url FROM core_schools WHERE school_id = ? LIMIT 1',
      [user.school_id]
    );
    if (schools.length > 0) school = schools[0];
  }

  // Fetch linked staff profile if any
  let staff_profile = null;
  let driver_info = null;
  const [staffRows] = await pool.execute(
    `SELECT st.staff_id, st.employee_id, st.first_name, st.last_name, st.designation, st.phone, st.email
     FROM core_user_staff_links usl
     JOIN core_staff st ON usl.staff_id = st.staff_id
     WHERE usl.user_id = ? LIMIT 1`,
    [user.user_id]
  );
  if (staffRows.length > 0) {
    staff_profile = staffRows[0];
    const isDriverRole = roles.includes('bus_driver');
    const isDriverDesig = staff_profile.designation && staff_profile.designation.toLowerCase().includes('driver');
    if (isDriverRole || isDriverDesig) {
      const [routeRows] = await pool.execute(
        `SELECT bsa.bus_id, bsa.role,
                v.vehicle_number, v.vehicle_name, v.capacity,
                r.route_id, r.route_name, r.route_code, r.start_point, r.end_point
         FROM bus_staff_assignments bsa
         JOIN bus_vehicles v ON bsa.bus_id = v.bus_id
         LEFT JOIN bus_routes r ON r.assigned_bus_id = v.bus_id AND r.deleted_at IS NULL
         WHERE bsa.staff_id = ? AND bsa.is_active = 1
         LIMIT 1`,
        [staff_profile.staff_id]
      );
      if (routeRows.length > 0) {
        driver_info = routeRows[0];
      }
    }
  }

  // Fetch linked guardian profile if any
  let guardian_profile = null;
  let children = [];
  const [guardianRows] = await pool.execute(
    `SELECT g.guardian_id, g.first_name, g.last_name, g.relationship_type, g.phone, g.email
     FROM core_user_guardian_links ugl
     JOIN core_guardians g ON ugl.guardian_id = g.guardian_id
     WHERE ugl.user_id = ? LIMIT 1`,
    [user.user_id]
  );
  if (guardianRows.length > 0) {
    guardian_profile = guardianRows[0];
    const [childRows] = await pool.execute(
      `SELECT s.student_id, s.admission_number, s.first_name, s.last_name, s.photo_url,
              sg.is_primary_contact, sg.can_pickup,
              c.name as class_name, sec.name as section_name,
              bsa.assignment_id as bus_assignment_id,
              bsa.direction as bus_direction,
              bsa.route_id, r.route_name, r.route_code,
              r.assigned_bus_id as bus_id,
              v.vehicle_number, v.vehicle_name,
              bsa.stop_id, st.stop_name, st.latitude as stop_lat, st.longitude as stop_lng,
              st.morning_time, st.evening_time
       FROM core_student_guardians sg
       JOIN core_students s ON sg.student_id = s.student_id
       LEFT JOIN core_student_academic_assignments sa ON s.student_id = sa.student_id AND sa.status = 'active'
       LEFT JOIN core_classes c ON sa.class_id = c.class_id
       LEFT JOIN core_sections sec ON sa.section_id = sec.section_id
       LEFT JOIN bus_student_assignments bsa ON s.student_id = bsa.student_id AND bsa.status = 'active'
       LEFT JOIN bus_routes r ON bsa.route_id = r.route_id
       LEFT JOIN bus_vehicles v ON r.assigned_bus_id = v.bus_id
       LEFT JOIN bus_stops st ON bsa.stop_id = st.stop_id
       WHERE sg.guardian_id = ? AND s.deleted_at IS NULL`,
      [guardian_profile.guardian_id]
    );
    children = childRows;
  }

  return {
    user_id: user.user_id,
    school_id: user.school_id,
    school,
    username: user.username,
    email: user.email,
    phone: user.phone,
    roles,
    permissions,
    accessible_modules,
    staff_profile,
    driver_info,
    guardian_profile,
    children,
  };
}

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
    
    const userProfile = await buildUserProfile(rows[0], req.user.roles, req.user.permissions);
    return sendSuccess(res, userProfile);
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
