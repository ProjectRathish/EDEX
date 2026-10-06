'use strict';

const bcrypt         = require('bcryptjs');
const { pool }       = require('../config/db');
const { generateUUID, generateSchoolCode } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendForbidden } = require('../utils/response');

// ─── Ensure Table Exists Helper ───────────────────────────────────────────────
let tableInitialized = false;
async function ensureEnquiryTable() {
  if (tableInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS \`core_school_enquiries\` (
        \`enquiry_id\`           CHAR(36)     NOT NULL,
        \`school_name\`          VARCHAR(255) NOT NULL,
        \`proposed_code\`        VARCHAR(50)  NULL,
        \`contact_person_name\`  VARCHAR(150) NOT NULL,
        \`email\`                VARCHAR(255) NOT NULL,
        \`phone\`                VARCHAR(20)  NOT NULL,
        \`city\`                 VARCHAR(100) NULL,
        \`state\`                VARCHAR(100) NULL,
        \`country\`              VARCHAR(100) NOT NULL DEFAULT 'India',
        \`estimated_students\`   INT          NULL     DEFAULT 500,
        \`message\`              TEXT         NULL,
        \`status\`               ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        \`admin_notes\`          TEXT         NULL,
        \`approved_school_id\`   CHAR(36)     NULL,
        \`approved_by\`          CHAR(36)     NULL,
        \`approved_at\`          TIMESTAMP    NULL     DEFAULT NULL,
        \`created_at\`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`enquiry_id\`),
        KEY \`idx_enquiries_status\` (\`status\`),
        KEY \`idx_enquiries_email\`  (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    tableInitialized = true;
  } catch (e) {
    console.error('Error ensuring core_school_enquiries table:', e.message);
  }
}

// ─── Public: Submit New School Enquiry ────────────────────────────────────────
const createPublic = async (req, res, next) => {
  try {
    await ensureEnquiryTable();

    const {
      school_name,
      proposed_code,
      contact_person_name,
      email,
      phone,
      city,
      state,
      country,
      estimated_students,
      message,
    } = req.body;

    if (!school_name || !school_name.trim()) {
      return sendBadRequest(res, 'School Name is required');
    }
    if (!contact_person_name || !contact_person_name.trim()) {
      return sendBadRequest(res, 'Contact Person / Principal Name is required');
    }
    if (!email || !email.trim()) {
      return sendBadRequest(res, 'Valid Email is required');
    }
    if (!phone || !phone.trim()) {
      return sendBadRequest(res, 'Contact Phone number is required');
    }

    const trimmedName = school_name.trim();

    // Check if an active school already uses this name
    const [existingSchool] = await pool.execute(
      'SELECT school_id FROM core_schools WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL LIMIT 1',
      [trimmedName]
    );
    if (existingSchool.length > 0) {
      return sendBadRequest(res, `A school with the name "${trimmedName}" is already registered on EDEX.`);
    }

    // Check if a pending enquiry already exists for this school name or email
    const [existingEnquiry] = await pool.execute(
      `SELECT enquiry_id, status FROM core_school_enquiries
       WHERE (LOWER(school_name) = LOWER(?) OR email = ?) AND status = 'pending'
       LIMIT 1`,
      [trimmedName, email.trim()]
    );
    if (existingEnquiry.length > 0) {
      return sendBadRequest(res, 'An enquiry for this school or contact email is already pending review by platform administrators.');
    }

    const enquiry_id = generateUUID();

    await pool.execute(
      `INSERT INTO core_school_enquiries
         (enquiry_id, school_name, proposed_code, contact_person_name, email, phone, city, state, country, estimated_students, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        enquiry_id,
        trimmedName,
        proposed_code ? proposed_code.trim().toUpperCase() : null,
        contact_person_name.trim(),
        email.trim(),
        phone.trim(),
        city ? city.trim() : null,
        state ? state.trim() : null,
        country ? country.trim() : 'India',
        estimated_students ? parseInt(estimated_students, 10) : 500,
        message ? message.trim() : null,
      ]
    );

    return sendCreated(
      res,
      { enquiry_id, school_name: trimmedName, status: 'pending' },
      'Thank you! Your school registration enquiry has been received. Our Super Admin team will review and contact you shortly.'
    );
  } catch (err) {
    next(err);
  }
};

// ─── Super Admin: List Enquiries ──────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    await ensureEnquiryTable();

    const { status, search } = req.query;

    let query = `
      SELECT e.*,
             s.name as approved_school_name,
             s.code as approved_school_code,
             u.username as approver_username
      FROM core_school_enquiries e
      LEFT JOIN core_schools s ON e.approved_school_id = s.school_id
      LEFT JOIN core_users u ON e.approved_by = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query += ' AND e.status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      query += ' AND (e.school_name LIKE ? OR e.contact_person_name LIKE ? OR e.email LIKE ? OR e.city LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY e.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─── Super Admin: 1-Click Approve & Auto-Provision School ─────────────────────
const approve = async (req, res, next) => {
  try {
    await ensureEnquiryTable();

    const { id } = req.params;
    const {
      custom_school_name,
      custom_school_code,
      admin_username,
      admin_password,
      admin_notes,
    } = req.body;

    const [enquiryRows] = await pool.execute(
      'SELECT * FROM core_school_enquiries WHERE enquiry_id = ? LIMIT 1',
      [id]
    );
    if (enquiryRows.length === 0) return sendNotFound(res, 'Enquiry not found');

    const enquiry = enquiryRows[0];
    if (enquiry.status === 'approved') {
      return sendBadRequest(res, 'This enquiry has already been approved.');
    }

    const finalSchoolName = (custom_school_name && custom_school_name.trim()) || enquiry.school_name;
    let finalCode = (custom_school_code && custom_school_code.trim()) || enquiry.proposed_code;

    // 1. Uniqueness check for school name
    const [dupName] = await pool.execute(
      'SELECT school_id FROM core_schools WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL LIMIT 1',
      [finalSchoolName]
    );
    if (dupName.length > 0) {
      return sendBadRequest(res, `A school named "${finalSchoolName}" already exists. Please choose a unique name.`);
    }

    const conn = await pool.getConnection();

    // If code provided, format and check uniqueness; otherwise generate unique SSA 4-digit code
    if (finalCode) {
      finalCode = finalCode.trim().toUpperCase().replace(/\s+/g, '-');
      const [dupCode] = await conn.execute(
        'SELECT school_id FROM core_schools WHERE UPPER(code) = ? AND deleted_at IS NULL LIMIT 1',
        [finalCode]
      );
      if (dupCode.length > 0) {
        conn.release();
        return sendBadRequest(res, `A school with code "${finalCode}" already exists. Please customize the school code.`);
      }
    } else {
      finalCode = await generateSchoolCode(conn);
    }

    const school_id = generateUUID();
    const finalAdminUsername = (admin_username && admin_username.trim()) || `admin_${finalCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const finalAdminPassword = (admin_password && admin_password.trim()) || 'AdminPass123!';

    const password_hash = await bcrypt.hash(finalAdminPassword, 10);
    const adminUserId = generateUUID();
    try {
      await conn.beginTransaction();

      // 1. Create School Record
      await conn.execute(
        `INSERT INTO core_schools
           (school_id, name, code, address, city, state, country, phone, email, timezone, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Asia/Kolkata', TRUE)`,
        [
          school_id,
          finalSchoolName,
          finalCode,
          enquiry.city ? `${enquiry.city}, ${enquiry.state || ''}` : null,
          enquiry.city || null,
          enquiry.state || null,
          enquiry.country || 'India',
          enquiry.phone || null,
          enquiry.email || null,
        ]
      );

      // 2. Auto-initialize modules
      const modules = ['id_card', 'voting', 'bus', 'canteen'];
      for (const mod of modules) {
        await conn.execute(
          `INSERT INTO core_school_modules (school_module_id, school_id, module_name, is_enabled)
           VALUES (?, ?, ?, TRUE)`,
          [generateUUID(), school_id, mod]
        );
      }

      // 3. Auto-initialize Academic Year (2025-2026)
      await conn.execute(
        `INSERT INTO core_academic_years
           (academic_year_id, school_id, name, start_date, end_date, is_current)
         VALUES (?, ?, '2025-2026', '2025-04-01', '2026-03-31', TRUE)`,
        [generateUUID(), school_id]
      );

      // 4. Create School Admin User Account
      await conn.execute(
        `INSERT INTO core_users (user_id, school_id, username, email, phone, password_hash, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [adminUserId, school_id, finalAdminUsername, enquiry.email, enquiry.phone, password_hash]
      );

      // 5. Assign school_admin role
      const [roleRows] = await conn.execute(
        "SELECT role_id FROM core_roles WHERE name = 'school_admin' AND (school_id = ? OR school_id IS NULL) LIMIT 1",
        [school_id]
      );
      if (roleRows.length > 0) {
        await conn.execute(
          `INSERT INTO core_user_roles (user_role_id, user_id, role_id, school_id, assigned_by)
           VALUES (?, ?, ?, ?, ?)`,
          [generateUUID(), adminUserId, roleRows[0].role_id, school_id, req.user.user_id]
        );
      }

      // 6. Mark enquiry as approved
      await conn.execute(
        `UPDATE core_school_enquiries
         SET status = 'approved',
             approved_school_id = ?,
             approved_by = ?,
             approved_at = NOW(),
             admin_notes = ?
         WHERE enquiry_id = ?`,
        [school_id, req.user.user_id, admin_notes || 'Approved and provisioned by Super Admin', id]
      );

      await conn.commit();

      return sendSuccess(
        res,
        {
          enquiry_id: id,
          school: {
            school_id,
            name: finalSchoolName,
            code: finalCode,
          },
          admin_credentials: {
            username: finalAdminUsername,
            password: finalAdminPassword,
            email: enquiry.email,
          },
        },
        `School "${finalSchoolName}" approved and fully provisioned with admin login "${finalAdminUsername}".`
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

// ─── Super Admin: Reject Enquiry ──────────────────────────────────────────────
const reject = async (req, res, next) => {
  try {
    await ensureEnquiryTable();

    const { id } = req.params;
    const { admin_notes } = req.body;

    const [enquiryRows] = await pool.execute(
      'SELECT enquiry_id, school_name, status FROM core_school_enquiries WHERE enquiry_id = ? LIMIT 1',
      [id]
    );
    if (enquiryRows.length === 0) return sendNotFound(res, 'Enquiry not found');

    await pool.execute(
      `UPDATE core_school_enquiries
       SET status = 'rejected',
           approved_by = ?,
           admin_notes = ?
       WHERE enquiry_id = ?`,
      [req.user.user_id, admin_notes || 'Rejected by Super Admin', id]
    );

    return sendSuccess(res, { enquiry_id: id, status: 'rejected' }, 'School enquiry marked as rejected.');
  } catch (err) {
    next(err);
  }
};

module.exports = { createPublic, list, approve, reject };
