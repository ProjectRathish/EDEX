'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateUUID, parsePagination, paginationMeta } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');

// ─── Relationship Normalizer ─────────────────────────────────────────────────
function normalizeRelationship(rel) {
  const r = (rel || '').toLowerCase();
  if (r.includes('mother')) return 'mother';
  if (r.includes('father')) return 'father';
  if (r.includes('guardian')) return 'legal_guardian';
  return 'father'; // Default sensible fallback
}

// ─── Name Splitter ───────────────────────────────────────────────────────────
function splitName(name) {
  const cleaned = (name || '').trim();
  if (!cleaned) return { firstName: 'Parent', lastName: '.' };
  const parts = cleaned.split(/\s+/);
  const firstName = parts[0] || 'Parent';
  const lastName = parts.slice(1).join(' ') || '.';
  return { firstName, lastName };
}

// ─── Clean Phone ─────────────────────────────────────────────────────────────
function cleanPhone(val) {
  if (!val) return '';
  return String(val).replace(/[^0-9]/g, '').slice(-15);
}

// ─── 1. Get Guardian & Parent Stats ──────────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;

    // Total guardians & user account breakdown
    const [guardianCounts] = await pool.execute(
      `SELECT
         COUNT(DISTINCT g.guardian_id) AS total_guardians,
         COUNT(DISTINCT CASE WHEN u.user_id IS NOT NULL AND u.deleted_at IS NULL THEN g.guardian_id END) AS total_with_account,
         COUNT(DISTINCT CASE WHEN u.user_id IS NOT NULL AND u.deleted_at IS NULL AND u.is_active = 1 THEN g.guardian_id END) AS active_accounts,
         COUNT(DISTINCT CASE WHEN u.user_id IS NOT NULL AND u.deleted_at IS NULL AND u.is_active = 0 THEN g.guardian_id END) AS inactive_accounts,
         COUNT(DISTINCT CASE WHEN u.user_id IS NULL OR u.deleted_at IS NOT NULL THEN g.guardian_id END) AS without_account
       FROM core_guardians g
       LEFT JOIN core_user_guardian_links ugl ON ugl.guardian_id = g.guardian_id
       LEFT JOIN core_users u ON ugl.user_id = u.user_id AND u.deleted_at IS NULL
       WHERE g.school_id = ? AND g.deleted_at IS NULL`,
      [schoolId]
    );

    // Total students in school and covered students
    const [studentCounts] = await pool.execute(
      `SELECT
         COUNT(DISTINCT s.student_id) AS total_students,
         COUNT(DISTINCT sg.student_id) AS covered_students
       FROM core_students s
       LEFT JOIN core_student_guardians sg ON sg.student_id = s.student_id AND sg.school_id = ?
       WHERE s.school_id = ? AND s.deleted_at IS NULL`,
      [schoolId, schoolId]
    );

    // Guardians with multiple children (siblings)
    const [siblingCounts] = await pool.execute(
      `SELECT COUNT(*) AS sibling_guardians
       FROM (
         SELECT sg.guardian_id, COUNT(sg.student_id) as c
         FROM core_student_guardians sg
         WHERE sg.school_id = ?
         GROUP BY sg.guardian_id
         HAVING c > 1
       ) sub`,
      [schoolId]
    );

    const stats = {
      total_guardians: parseInt(guardianCounts[0]?.total_guardians || 0, 10),
      total_with_account: parseInt(guardianCounts[0]?.total_with_account || 0, 10),
      active_accounts: parseInt(guardianCounts[0]?.active_accounts || 0, 10),
      inactive_accounts: parseInt(guardianCounts[0]?.inactive_accounts || 0, 10),
      without_account: parseInt(guardianCounts[0]?.without_account || 0, 10),
      total_students: parseInt(studentCounts[0]?.total_students || 0, 10),
      covered_students: parseInt(studentCounts[0]?.covered_students || 0, 10),
      pending_students: Math.max(0, parseInt(studentCounts[0]?.total_students || 0, 10) - parseInt(studentCounts[0]?.covered_students || 0, 10)),
      sibling_guardians: parseInt(siblingCounts[0]?.sibling_guardians || 0, 10),
    };

    return sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
};

// ─── 2. List Guardians with Linked Users and Students ────────────────────────
const list = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { page, limit, offset } = parsePagination(req.query);
    const {
      search,
      class_id,
      section_id,
      has_account,
      account_status,
      is_bus_rider,
    } = req.query;

    let whereConditions = ['g.school_id = ?', 'g.deleted_at IS NULL'];
    let params = [schoolId];

    // Filter by search (guardian name, phone, email, username, or student name/adm)
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(`(
        g.first_name LIKE ? OR
        g.last_name LIKE ? OR
        g.phone LIKE ? OR
        g.email LIKE ? OR
        u.username LIKE ? OR
        EXISTS (
          SELECT 1 FROM core_student_guardians sg2
          JOIN core_students s2 ON sg2.student_id = s2.student_id
          WHERE sg2.guardian_id = g.guardian_id
            AND (s2.first_name LIKE ? OR s2.last_name LIKE ? OR s2.admission_number LIKE ?)
        )
      )`);
      params.push(term, term, term, term, term, term, term, term);
    }

    // Filter by Account Existence
    if (has_account === 'true') {
      whereConditions.push('u.user_id IS NOT NULL AND u.deleted_at IS NULL');
    } else if (has_account === 'false') {
      whereConditions.push('(u.user_id IS NULL OR u.deleted_at IS NOT NULL)');
    }

    // Filter by Account Status (active / inactive)
    if (account_status === 'active') {
      whereConditions.push('u.user_id IS NOT NULL AND u.deleted_at IS NULL AND u.is_active = 1');
    } else if (account_status === 'inactive') {
      whereConditions.push('u.user_id IS NOT NULL AND u.deleted_at IS NULL AND u.is_active = 0');
    }

    // Filter by Student Class
    if (class_id) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM core_student_guardians sg3
        JOIN core_student_academic_assignments saa3 ON sg3.student_id = saa3.student_id AND saa3.status = 'active'
        WHERE sg3.guardian_id = g.guardian_id AND saa3.class_id = ?
      )`);
      params.push(class_id);
    }

    // Filter by Student Section
    if (section_id) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM core_student_guardians sg4
        JOIN core_student_academic_assignments saa4 ON sg4.student_id = saa4.student_id AND saa4.status = 'active'
        WHERE sg4.guardian_id = g.guardian_id AND saa4.section_id = ?
      )`);
      params.push(section_id);
    }

    // Filter by Bus Rider status
    if (is_bus_rider === 'true') {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM core_student_guardians sg5
        JOIN bus_student_assignments bsa5 ON sg5.student_id = bsa5.student_id AND bsa5.status = 'active'
        WHERE sg5.guardian_id = g.guardian_id
      )`);
    } else if (is_bus_rider === 'false') {
      whereConditions.push(`NOT EXISTS (
        SELECT 1 FROM core_student_guardians sg6
        JOIN bus_student_assignments bsa6 ON sg6.student_id = bsa6.student_id AND bsa6.status = 'active'
        WHERE sg6.guardian_id = g.guardian_id
      )`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Count query
    const countSql = `
      SELECT COUNT(DISTINCT g.guardian_id) AS total
      FROM core_guardians g
      LEFT JOIN core_user_guardian_links ugl ON ugl.guardian_id = g.guardian_id
      LEFT JOIN core_users u ON ugl.user_id = u.user_id AND u.deleted_at IS NULL
      WHERE ${whereClause}
    `;
    const [countRows] = await pool.execute(countSql, params);
    const total = countRows[0]?.total || 0;

    // Data query without JSON_ARRAYAGG for full MariaDB / MySQL compatibility
    const dataSql = `
      SELECT
        g.guardian_id,
        g.school_id,
        g.first_name,
        g.last_name,
        g.relationship_type,
        g.phone,
        g.email,
        g.address,
        g.occupation,
        g.is_active AS guardian_is_active,
        g.created_at,
        u.user_id,
        u.username,
        u.is_active AS user_is_active,
        u.last_login_at
      FROM core_guardians g
      LEFT JOIN core_user_guardian_links ugl ON ugl.guardian_id = g.guardian_id
      LEFT JOIN core_users u ON ugl.user_id = u.user_id AND u.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY g.created_at DESC, g.first_name ASC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.execute(dataSql, [...params, limit, offset]);

    // Fetch linked students for these guardians
    const guardianIds = rows.map((r) => r.guardian_id);
    const studentsByGuardian = new Map();

    if (guardianIds.length > 0) {
      const [studentLinks] = await pool.query(
        `SELECT
           sg.guardian_id,
           s.student_id,
           s.admission_number,
           s.first_name,
           s.last_name,
           s.gender,
           c.class_id,
           c.name AS class_name,
           sec.section_id,
           sec.name AS section_name,
           br.route_code,
           br.route_name,
           bs.stop_name,
           sg.is_primary_contact,
           sg.can_pickup
         FROM core_student_guardians sg
         JOIN core_students s ON sg.student_id = s.student_id AND s.deleted_at IS NULL
         LEFT JOIN core_student_academic_assignments saa ON saa.student_id = s.student_id AND saa.status = 'active'
         LEFT JOIN core_classes c ON saa.class_id = c.class_id
         LEFT JOIN core_sections sec ON saa.section_id = sec.section_id
         LEFT JOIN bus_student_assignments bsa ON bsa.student_id = s.student_id AND bsa.status = 'active'
         LEFT JOIN bus_routes br ON bsa.route_id = br.route_id
         LEFT JOIN bus_stops bs ON bsa.stop_id = bs.stop_id
         WHERE sg.guardian_id IN (?) AND sg.school_id = ?`,
        [guardianIds, schoolId]
      );

      for (const sl of studentLinks) {
        if (!studentsByGuardian.has(sl.guardian_id)) {
          studentsByGuardian.set(sl.guardian_id, []);
        }
        studentsByGuardian.get(sl.guardian_id).push({
          student_id: sl.student_id,
          admission_number: sl.admission_number,
          first_name: sl.first_name,
          last_name: sl.last_name,
          gender: sl.gender,
          class_id: sl.class_id,
          class_name: sl.class_name,
          section_id: sl.section_id,
          section_name: sl.section_name,
          route_code: sl.route_code,
          route_name: sl.route_name,
          stop_name: sl.stop_name,
          is_primary_contact: sl.is_primary_contact,
          can_pickup: sl.can_pickup,
        });
      }
    }

    // Assemble final response
    const guardians = rows.map((r) => {
      const students = studentsByGuardian.get(r.guardian_id) || [];
      return {
        guardian_id: r.guardian_id,
        school_id: r.school_id,
        first_name: r.first_name,
        last_name: r.last_name,
        full_name: `${r.first_name} ${r.last_name || ''}`.trim(),
        relationship_type: r.relationship_type,
        phone: r.phone,
        email: r.email,
        address: r.address,
        occupation: r.occupation,
        is_active: Boolean(r.guardian_is_active),
        created_at: r.created_at,
        user_account: r.user_id ? {
          user_id: r.user_id,
          username: r.username,
          is_active: Boolean(r.user_is_active),
          last_login_at: r.last_login_at,
        } : null,
        has_login: Boolean(r.user_id),
        students,
        student_count: students.length,
      };
    });

    return sendSuccess(res, {
      guardians,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── 3. Get One Guardian (with linked students & login) ──────────────────────
const getOne = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT g.*, u.user_id, u.username, u.is_active as user_is_active, u.last_login_at
       FROM core_guardians g
       LEFT JOIN core_user_guardian_links ugl ON ugl.guardian_id = g.guardian_id
       LEFT JOIN core_users u ON ugl.user_id = u.user_id AND u.deleted_at IS NULL
       WHERE g.guardian_id = ? AND g.school_id = ? AND g.deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (rows.length === 0) return sendNotFound(res, 'Guardian not found');

    const g = rows[0];

    // Fetch linked students
    const [students] = await pool.execute(
      `SELECT s.student_id, s.admission_number, s.first_name, s.last_name, s.gender, s.phone,
              c.class_id, c.name as class_name, sec.section_id, sec.name as section_name,
              br.route_code, br.route_name, bs.stop_name,
              sg.is_primary_contact, sg.is_emergency_contact, sg.can_pickup
       FROM core_student_guardians sg
       JOIN core_students s ON sg.student_id = s.student_id
       LEFT JOIN core_student_academic_assignments saa ON saa.student_id = s.student_id AND saa.status = 'active'
       LEFT JOIN core_classes c ON saa.class_id = c.class_id
       LEFT JOIN core_sections sec ON saa.section_id = sec.section_id
       LEFT JOIN bus_student_assignments bsa ON bsa.student_id = s.student_id AND bsa.status = 'active'
       LEFT JOIN bus_routes br ON bsa.route_id = br.route_id
       LEFT JOIN bus_stops bs ON bsa.stop_id = bs.stop_id
       WHERE sg.guardian_id = ? AND sg.school_id = ? AND s.deleted_at IS NULL`,
      [id, schoolId]
    );

    return sendSuccess(res, {
      ...g,
      full_name: `${g.first_name} ${g.last_name || ''}`.trim(),
      has_login: Boolean(g.user_id),
      user_account: g.user_id ? {
        user_id: g.user_id,
        username: g.username,
        is_active: Boolean(g.user_is_active),
        last_login_at: g.last_login_at,
      } : null,
      students,
    });
  } catch (err) {
    next(err);
  }
};

// ─── 4. Bulk Generate Parent Accounts (by Class or Student Selection) ─────────
const bulkGenerateAccounts = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const schoolId = req.user.school_id;
    const adminUserId = req.user.user_id;
    const {
      student_ids = [],
      class_ids = [],
      username_format = 'phone', // 'phone' | 'adm_no'
      default_password = 'Parent@123',
      merge_siblings_by_phone = true,
      create_login_accounts = true,
    } = req.body;

    // Lookup Parent Role ID
    const [roles] = await conn.execute(
      "SELECT role_id FROM core_roles WHERE name = 'parent' LIMIT 1"
    );
    if (roles.length === 0) {
      return sendBadRequest(res, "System role 'parent' not found in database.");
    }
    const parentRoleId = roles[0].role_id;

    // Fetch Target Students
    let studentSql = `
      SELECT
        s.student_id, s.admission_number, s.first_name, s.last_name,
        s.father_name, s.guardian_relation, s.guardian_phone, s.phone,
        s.address, s.area,
        saa.class_id, c.name AS class_name
      FROM core_students s
      LEFT JOIN core_student_academic_assignments saa ON saa.student_id = s.student_id AND saa.status = 'active'
      LEFT JOIN core_classes c ON saa.class_id = c.class_id
      WHERE s.school_id = ? AND s.deleted_at IS NULL
    `;
    const studentParams = [schoolId];

    if (Array.isArray(student_ids) && student_ids.length > 0) {
      studentSql += ` AND s.student_id IN (${student_ids.map(() => '?').join(',')})`;
      studentParams.push(...student_ids);
    } else if (Array.isArray(class_ids) && class_ids.length > 0) {
      studentSql += ` AND saa.class_id IN (${class_ids.map(() => '?').join(',')})`;
      studentParams.push(...class_ids);
    }

    const [students] = await conn.execute(studentSql, studentParams);
    if (students.length === 0) {
      return sendBadRequest(res, 'No eligible students found matching the selected criteria.');
    }

    await conn.beginTransaction();

    const passwordHash = await bcrypt.hash(default_password || 'Parent@123', 10);

    // Track existing guardians by phone for sibling grouping
    const phoneToGuardianMap = new Map();

    // Preload existing guardians in school to avoid duplicates
    const [existingGuardians] = await conn.execute(
      'SELECT guardian_id, phone, first_name, last_name FROM core_guardians WHERE school_id = ? AND deleted_at IS NULL',
      [schoolId]
    );
    for (const eg of existingGuardians) {
      if (eg.phone) {
        phoneToGuardianMap.set(cleanPhone(eg.phone), eg.guardian_id);
      }
    }

    // Preload existing user links
    const [existingUserLinks] = await conn.execute(
      'SELECT guardian_id, user_id FROM core_user_guardian_links WHERE school_id = ?',
      [schoolId]
    );
    const guardianUserMap = new Map();
    for (const link of existingUserLinks) {
      guardianUserMap.set(link.guardian_id, link.user_id);
    }

    // Preload existing usernames in this school
    const [existingUsers] = await conn.execute(
      'SELECT user_id, username FROM core_users WHERE school_id = ? AND deleted_at IS NULL',
      [schoolId]
    );
    const existingUsernames = new Set(existingUsers.map((u) => u.username.toLowerCase()));

    let guardiansCreated = 0;
    let accountsCreated = 0;
    let studentsLinked = 0;
    let siblingsMerged = 0;
    const errors = [];

    for (const s of students) {
      const parentName = s.father_name || `Parent of ${s.first_name}`;
      const { firstName, lastName } = splitName(parentName);
      const rawPhone = s.guardian_phone || s.phone || '';
      const phoneDigits = cleanPhone(rawPhone);
      const relationship = normalizeRelationship(s.guardian_relation);

      let guardianId = null;

      // Check if we should reuse guardian by phone (sibling merge)
      if (merge_siblings_by_phone && phoneDigits && phoneDigits.length >= 7) {
        if (phoneToGuardianMap.has(phoneDigits)) {
          guardianId = phoneToGuardianMap.get(phoneDigits);
          siblingsMerged++;
        }
      }

      // If no existing guardian found, create new guardian record
      if (!guardianId) {
        guardianId = generateUUID();
        await conn.execute(
          `INSERT INTO core_guardians
             (guardian_id, school_id, first_name, last_name, relationship_type, phone, address, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [guardianId, schoolId, firstName, lastName, relationship, phoneDigits || null, s.address || null]
        );
        guardiansCreated++;
        if (phoneDigits && phoneDigits.length >= 7) {
          phoneToGuardianMap.set(phoneDigits, guardianId);
        }
      }

      // Link student to guardian
      const studentGuardianId = generateUUID();
      await conn.execute(
        `INSERT INTO core_student_guardians
           (student_guardian_id, school_id, student_id, guardian_id, is_primary_contact, is_emergency_contact, can_pickup)
         VALUES (?, ?, ?, ?, 1, 1, 1)
         ON DUPLICATE KEY UPDATE is_primary_contact = 1, can_pickup = 1`,
        [studentGuardianId, schoolId, s.student_id, guardianId]
      );
      studentsLinked++;

      // Create login account if requested and guardian doesn't have one
      if (create_login_accounts && !guardianUserMap.has(guardianId)) {
        let baseUsername = '';
        if (username_format === 'phone' && phoneDigits && phoneDigits.length >= 7) {
          baseUsername = phoneDigits;
        } else {
          const admClean = String(s.admission_number || '').trim().replace(/[^a-zA-Z0-9]/g, '');
          baseUsername = `p_${admClean || s.student_id.slice(0, 6)}`;
        }

        let finalUsername = baseUsername;
        let counter = 1;
        while (existingUsernames.has(finalUsername.toLowerCase())) {
          finalUsername = `${baseUsername}_${counter}`;
          counter++;
        }

        const newUserId = generateUUID();
        await conn.execute(
          `INSERT INTO core_users
             (user_id, school_id, username, phone, password_hash, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [newUserId, schoolId, finalUsername, phoneDigits || null, passwordHash]
        );

        // Assign 'parent' role
        const userRoleId = generateUUID();
        await conn.execute(
          `INSERT INTO core_user_roles
             (user_role_id, user_id, role_id, school_id, assigned_by)
           VALUES (?, ?, ?, ?, ?)`,
          [userRoleId, newUserId, parentRoleId, schoolId, adminUserId]
        );

        // Link user to guardian
        const linkId = generateUUID();
        await conn.execute(
          `INSERT INTO core_user_guardian_links
             (link_id, user_id, guardian_id, school_id)
           VALUES (?, ?, ?, ?)`,
          [linkId, newUserId, guardianId, schoolId]
        );

        existingUsernames.add(finalUsername.toLowerCase());
        guardianUserMap.set(guardianId, newUserId);
        accountsCreated++;
      }
    }

    await conn.commit();

    return sendSuccess(res, {
      students_processed: students.length,
      guardians_created: guardiansCreated,
      accounts_created: accountsCreated,
      students_linked: studentsLinked,
      siblings_merged: siblingsMerged,
      errors,
    }, `Successfully processed ${students.length} students: created ${guardiansCreated} guardians and ${accountsCreated} parent login accounts.`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ─── 5. Create Single Guardian Record ─────────────────────────────────────────
const create = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const schoolId = req.user.school_id;
    const adminUserId = req.user.user_id;
    const {
      first_name,
      last_name,
      relationship_type,
      phone,
      email,
      address,
      occupation,
      student_ids = [],
      create_account = false,
      username,
      password,
    } = req.body;

    if (!first_name || !relationship_type) {
      return sendBadRequest(res, 'first_name and relationship_type are required');
    }

    await conn.beginTransaction();

    const guardian_id = generateUUID();
    const phoneDigits = cleanPhone(phone);
    const rel = normalizeRelationship(relationship_type);

    await conn.execute(
      `INSERT INTO core_guardians
         (guardian_id, school_id, first_name, last_name, relationship_type, phone, email, address, occupation, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [guardian_id, schoolId, first_name.trim(), (last_name || '.').trim(), rel, phoneDigits || null, email || null, address || null, occupation || null]
    );

    // Link students if provided
    if (Array.isArray(student_ids) && student_ids.length > 0) {
      for (const sid of student_ids) {
        const studentGuardianId = generateUUID();
        await conn.execute(
          `INSERT INTO core_student_guardians
             (student_guardian_id, school_id, student_id, guardian_id, is_primary_contact, can_pickup)
           VALUES (?, ?, ?, ?, 1, 1)
           ON DUPLICATE KEY UPDATE is_primary_contact = 1`,
          [studentGuardianId, schoolId, sid, guardian_id]
        );
      }
    }

    // Create login account if requested
    let createdUser = null;
    if (create_account) {
      const rawUsername = (username || phoneDigits || `parent_${first_name.toLowerCase()}`).trim();
      const [existingUsers] = await conn.execute(
        'SELECT user_id FROM core_users WHERE school_id = ? AND username = ? AND deleted_at IS NULL LIMIT 1',
        [schoolId, rawUsername]
      );
      if (existingUsers.length > 0) {
        await conn.rollback();
        return sendBadRequest(res, `Username "${rawUsername}" is already taken.`);
      }

      const [roles] = await conn.execute("SELECT role_id FROM core_roles WHERE name = 'parent' LIMIT 1");
      const parentRoleId = roles[0]?.role_id;

      const passwordHash = await bcrypt.hash(password || 'Parent@123', 10);
      const newUserId = generateUUID();

      await conn.execute(
        `INSERT INTO core_users (user_id, school_id, username, phone, email, password_hash, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [newUserId, schoolId, rawUsername, phoneDigits || null, email || null, passwordHash]
      );

      if (parentRoleId) {
        await conn.execute(
          `INSERT INTO core_user_roles (user_role_id, user_id, role_id, school_id, assigned_by)
           VALUES (?, ?, ?, ?, ?)`,
          [generateUUID(), newUserId, parentRoleId, schoolId, adminUserId]
        );
      }

      await conn.execute(
        `INSERT INTO core_user_guardian_links (link_id, user_id, guardian_id, school_id)
         VALUES (?, ?, ?, ?)`,
        [generateUUID(), newUserId, guardian_id, schoolId]
      );

      createdUser = { user_id: newUserId, username: rawUsername };
    }

    await conn.commit();
    return sendCreated(res, { guardian_id, first_name, last_name, user_account: createdUser }, 'Guardian created successfully');
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ─── 6. Update Guardian ───────────────────────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;
    const { first_name, last_name, relationship_type, phone, email, address, occupation, is_active } = req.body;

    const [existing] = await pool.execute(
      'SELECT guardian_id FROM core_guardians WHERE guardian_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, schoolId]
    );
    if (existing.length === 0) return sendNotFound(res, 'Guardian not found');

    const rel = relationship_type ? normalizeRelationship(relationship_type) : undefined;
    const phoneDigits = phone !== undefined ? cleanPhone(phone) : undefined;

    await pool.execute(
      `UPDATE core_guardians SET
         first_name = COALESCE(?, first_name),
         last_name = COALESCE(?, last_name),
         relationship_type = COALESCE(?, relationship_type),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email),
         address = COALESCE(?, address),
         occupation = COALESCE(?, occupation),
         is_active = COALESCE(?, is_active),
         updated_at = NOW()
       WHERE guardian_id = ? AND school_id = ?`,
      [
        first_name ? first_name.trim() : null,
        last_name ? last_name.trim() : null,
        rel || null,
        phoneDigits !== undefined ? (phoneDigits || null) : null,
        email !== undefined ? (email || null) : null,
        address !== undefined ? (address || null) : null,
        occupation !== undefined ? (occupation || null) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id,
        schoolId,
      ]
    );

    // If phone or email changed, sync with linked user account
    if (phoneDigits || email) {
      await pool.execute(
        `UPDATE core_users u
         JOIN core_user_guardian_links ugl ON ugl.user_id = u.user_id
         SET u.phone = COALESCE(?, u.phone), u.email = COALESCE(?, u.email)
         WHERE ugl.guardian_id = ? AND u.school_id = ?`,
        [phoneDigits || null, email || null, id, schoolId]
      );
    }

    return sendSuccess(res, { guardian_id: id }, 'Guardian updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 7. Create Login Account for Existing Guardian ────────────────────────────
const createAccount = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const schoolId = req.user.school_id;
    const adminUserId = req.user.user_id;
    const { id } = req.params; // guardian_id
    const { username, password = 'Parent@123', email, phone } = req.body;

    const [guardians] = await conn.execute(
      'SELECT guardian_id, first_name, last_name, phone, email FROM core_guardians WHERE guardian_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, schoolId]
    );
    if (guardians.length === 0) return sendNotFound(res, 'Guardian not found');
    const g = guardians[0];

    // Check if account already exists
    const [existingLinks] = await conn.execute(
      `SELECT ugl.user_id, u.username
       FROM core_user_guardian_links ugl
       JOIN core_users u ON ugl.user_id = u.user_id AND u.deleted_at IS NULL
       WHERE ugl.guardian_id = ? AND ugl.school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (existingLinks.length > 0) {
      return sendBadRequest(res, `This guardian already has a login account with username "${existingLinks[0].username}".`);
    }

    const finalUsername = (username || cleanPhone(phone || g.phone) || `p_${g.first_name.toLowerCase()}`).trim();
    if (!finalUsername) return sendBadRequest(res, 'Username or valid phone number is required');

    // Check if username taken in this school
    const [existingUsername] = await conn.execute(
      'SELECT user_id FROM core_users WHERE school_id = ? AND username = ? AND deleted_at IS NULL LIMIT 1',
      [schoolId, finalUsername]
    );
    if (existingUsername.length > 0) {
      return sendBadRequest(res, `Username "${finalUsername}" is already taken in this school.`);
    }

    await conn.beginTransaction();

    const passwordHash = await bcrypt.hash(password || 'Parent@123', 10);
    const newUserId = generateUUID();

    await conn.execute(
      `INSERT INTO core_users (user_id, school_id, username, phone, email, password_hash, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [newUserId, schoolId, finalUsername, cleanPhone(phone || g.phone) || null, email || g.email || null, passwordHash]
    );

    // Assign 'parent' role
    const [roles] = await conn.execute("SELECT role_id FROM core_roles WHERE name = 'parent' LIMIT 1");
    if (roles.length > 0) {
      await conn.execute(
        `INSERT INTO core_user_roles (user_role_id, user_id, role_id, school_id, assigned_by)
         VALUES (?, ?, ?, ?, ?)`,
        [generateUUID(), newUserId, roles[0].role_id, schoolId, adminUserId]
      );
    }

    // Link user to guardian
    await conn.execute(
      `INSERT INTO core_user_guardian_links (link_id, user_id, guardian_id, school_id)
       VALUES (?, ?, ?, ?)`,
      [generateUUID(), newUserId, id, schoolId]
    );

    await conn.commit();
    return sendCreated(res, { user_id: newUserId, username: finalUsername }, `Login account created for ${g.first_name}`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ─── 8. Reset Guardian Password ───────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;
    const { new_password = 'Parent@123' } = req.body;

    if (!new_password || new_password.trim().length < 6) {
      return sendBadRequest(res, 'Password must be at least 6 characters.');
    }

    const [links] = await pool.execute(
      `SELECT ugl.user_id, u.username
       FROM core_user_guardian_links ugl
       JOIN core_users u ON ugl.user_id = u.user_id AND u.deleted_at IS NULL
       WHERE ugl.guardian_id = ? AND ugl.school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (links.length === 0) {
      return sendNotFound(res, 'No active login account found for this guardian.');
    }

    const passwordHash = await bcrypt.hash(new_password.trim(), 10);
    await pool.execute(
      'UPDATE core_users SET password_hash = ?, updated_at = NOW() WHERE user_id = ? AND school_id = ?',
      [passwordHash, links[0].user_id, schoolId]
    );

    return sendSuccess(res, { username: links[0].username }, `Password reset successfully for "${links[0].username}".`);
  } catch (err) {
    next(err);
  }
};

// ─── 9. Toggle Account Active / Inactive Status ────────────────────────────────
const toggleAccountStatus = async (req, res, next) => {
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;
    const { is_active } = req.body;

    const [links] = await pool.execute(
      `SELECT ugl.user_id, u.username
       FROM core_user_guardian_links ugl
       JOIN core_users u ON ugl.user_id = u.user_id AND u.deleted_at IS NULL
       WHERE ugl.guardian_id = ? AND ugl.school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (links.length === 0) {
      return sendNotFound(res, 'No active login account found for this guardian.');
    }

    const activeVal = is_active ? 1 : 0;
    await pool.execute(
      'UPDATE core_users SET is_active = ?, updated_at = NOW() WHERE user_id = ? AND school_id = ?',
      [activeVal, links[0].user_id, schoolId]
    );

    return sendSuccess(res, { is_active: Boolean(activeVal), username: links[0].username }, `Account status updated to ${activeVal ? 'Active' : 'Inactive'}.`);
  } catch (err) {
    next(err);
  }
};

// ─── 10. Delete / Revoke Login Account ────────────────────────────────────────
const deleteAccount = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;

    const [links] = await conn.execute(
      `SELECT ugl.user_id, u.username
       FROM core_user_guardian_links ugl
       JOIN core_users u ON ugl.user_id = u.user_id
       WHERE ugl.guardian_id = ? AND ugl.school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (links.length === 0) {
      return sendNotFound(res, 'No login account linked to this guardian.');
    }

    const userId = links[0].user_id;

    await conn.beginTransaction();
    await conn.execute('DELETE FROM core_user_guardian_links WHERE guardian_id = ?', [id]);
    await conn.execute('DELETE FROM core_user_roles WHERE user_id = ?', [userId]);
    await conn.execute('UPDATE core_users SET deleted_at = NOW(), is_active = 0 WHERE user_id = ?', [userId]);
    await conn.commit();

    return sendSuccess(res, null, `Login account for "${links[0].username}" has been removed.`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ─── 11. Delete Guardian Record ───────────────────────────────────────────────
const deleteGuardian = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const schoolId = req.user.school_id;
    const { id } = req.params;

    const [existing] = await conn.execute(
      'SELECT guardian_id FROM core_guardians WHERE guardian_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, schoolId]
    );
    if (existing.length === 0) return sendNotFound(res, 'Guardian not found');

    await conn.beginTransaction();

    // 1. Remove user account if linked
    const [links] = await conn.execute(
      'SELECT user_id FROM core_user_guardian_links WHERE guardian_id = ? AND school_id = ?',
      [id, schoolId]
    );
    if (links.length > 0) {
      const uid = links[0].user_id;
      await conn.execute('DELETE FROM core_user_guardian_links WHERE guardian_id = ?', [id]);
      await conn.execute('DELETE FROM core_user_roles WHERE user_id = ?', [uid]);
      await conn.execute('UPDATE core_users SET deleted_at = NOW(), is_active = 0 WHERE user_id = ?', [uid]);
    }

    // 2. Unlink all students
    await conn.execute('DELETE FROM core_student_guardians WHERE guardian_id = ? AND school_id = ?', [id, schoolId]);

    // 3. Soft-delete guardian
    await conn.execute('UPDATE core_guardians SET deleted_at = NOW(), is_active = 0 WHERE guardian_id = ?', [id]);

    await conn.commit();
    return sendSuccess(res, null, 'Guardian and associated accounts removed successfully.');
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ─── 12. Bulk Action on Guardians ─────────────────────────────────────────────
const bulkAction = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const schoolId = req.user.school_id;
    const { action, guardian_ids = [], data = {} } = req.body;

    if (!Array.isArray(guardian_ids) || guardian_ids.length === 0) {
      return sendBadRequest(res, 'guardian_ids array is required and must not be empty.');
    }

    const placeholders = guardian_ids.map(() => '?').join(',');

    await conn.beginTransaction();

    if (action === 'activate' || action === 'deactivate') {
      const activeVal = action === 'activate' ? 1 : 0;
      // Update users linked to these guardians
      await conn.execute(
        `UPDATE core_users u
         JOIN core_user_guardian_links ugl ON ugl.user_id = u.user_id
         SET u.is_active = ?, u.updated_at = NOW()
         WHERE ugl.guardian_id IN (${placeholders}) AND u.school_id = ?`,
        [activeVal, ...guardian_ids, schoolId]
      );
      // Also update guardians
      await conn.execute(
        `UPDATE core_guardians SET is_active = ?, updated_at = NOW()
         WHERE guardian_id IN (${placeholders}) AND school_id = ?`,
        [activeVal, ...guardian_ids, schoolId]
      );
    } else if (action === 'reset_password') {
      const password = data.default_password || 'Parent@123';
      const passwordHash = await bcrypt.hash(password, 10);
      await conn.execute(
        `UPDATE core_users u
         JOIN core_user_guardian_links ugl ON ugl.user_id = u.user_id
         SET u.password_hash = ?, u.updated_at = NOW()
         WHERE ugl.guardian_id IN (${placeholders}) AND u.school_id = ?`,
        [passwordHash, ...guardian_ids, schoolId]
      );
    } else if (action === 'delete_accounts') {
      // Find user_ids
      const [users] = await conn.execute(
        `SELECT DISTINCT ugl.user_id
         FROM core_user_guardian_links ugl
         WHERE ugl.guardian_id IN (${placeholders}) AND ugl.school_id = ?`,
        [...guardian_ids, schoolId]
      );
      if (users.length > 0) {
        const uids = users.map((u) => u.user_id);
        const uPlaceholders = uids.map(() => '?').join(',');
        await conn.execute(`DELETE FROM core_user_guardian_links WHERE guardian_id IN (${placeholders})`, guardian_ids);
        await conn.execute(`DELETE FROM core_user_roles WHERE user_id IN (${uPlaceholders})`, uids);
        await conn.execute(`UPDATE core_users SET deleted_at = NOW(), is_active = 0 WHERE user_id IN (${uPlaceholders})`, uids);
      }
    } else if (action === 'delete_guardians') {
      // 1. Delete users
      const [users] = await conn.execute(
        `SELECT DISTINCT ugl.user_id
         FROM core_user_guardian_links ugl
         WHERE ugl.guardian_id IN (${placeholders}) AND ugl.school_id = ?`,
        [...guardian_ids, schoolId]
      );
      if (users.length > 0) {
        const uids = users.map((u) => u.user_id);
        const uPlaceholders = uids.map(() => '?').join(',');
        await conn.execute(`DELETE FROM core_user_guardian_links WHERE guardian_id IN (${placeholders})`, guardian_ids);
        await conn.execute(`DELETE FROM core_user_roles WHERE user_id IN (${uPlaceholders})`, uids);
        await conn.execute(`UPDATE core_users SET deleted_at = NOW(), is_active = 0 WHERE user_id IN (${uPlaceholders})`, uids);
      }
      // 2. Unlink students
      await conn.execute(`DELETE FROM core_student_guardians WHERE guardian_id IN (${placeholders}) AND school_id = ?`, [...guardian_ids, schoolId]);
      // 3. Soft delete guardians
      await conn.execute(`UPDATE core_guardians SET deleted_at = NOW(), is_active = 0 WHERE guardian_id IN (${placeholders}) AND school_id = ?`, [...guardian_ids, schoolId]);
    } else {
      await conn.rollback();
      return sendBadRequest(res, `Unsupported bulk action: ${action}`);
    }

    await conn.commit();
    return sendSuccess(res, { affected: guardian_ids.length }, `Bulk action "${action}" completed for ${guardian_ids.length} records.`);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ─── 13. Link Student to Guardian ─────────────────────────────────────────────
const linkStudent = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params; // guardian_id
    const { student_id, is_primary_contact, is_emergency_contact, can_pickup } = req.body;

    if (!student_id) return sendBadRequest(res, 'student_id is required');

    const [guardianCheck] = await pool.execute(
      'SELECT guardian_id FROM core_guardians WHERE guardian_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, school_id]
    );
    if (guardianCheck.length === 0) return sendNotFound(res, 'Guardian not found');

    const [studentCheck] = await pool.execute(
      'SELECT student_id FROM core_students WHERE student_id = ? AND school_id = ? AND deleted_at IS NULL',
      [student_id, school_id]
    );
    if (studentCheck.length === 0) return sendNotFound(res, 'Student not found in this school');

    const student_guardian_id = generateUUID();

    await pool.execute(
      `INSERT INTO core_student_guardians
         (student_guardian_id, student_id, guardian_id, school_id, is_primary_contact, is_emergency_contact, can_pickup)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_primary_contact = VALUES(is_primary_contact),
         is_emergency_contact = VALUES(is_emergency_contact),
         can_pickup = VALUES(can_pickup)`,
      [
        student_guardian_id,
        student_id,
        id,
        school_id,
        is_primary_contact === true || is_primary_contact === 'true',
        is_emergency_contact === true || is_emergency_contact === 'true',
        can_pickup === true || can_pickup === 'true',
      ]
    );

    return sendSuccess(res, { student_guardian_id, guardian_id: id, student_id }, 'Student linked to guardian successfully');
  } catch (err) {
    next(err);
  }
};

// ─── 14. Unlink Student from Guardian ─────────────────────────────────────────
const unlinkStudent = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id, studentId } = req.params;

    await pool.execute(
      'DELETE FROM core_student_guardians WHERE guardian_id = ? AND student_id = ? AND school_id = ?',
      [id, studentId, school_id]
    );

    return sendSuccess(res, null, 'Student unlinked from guardian');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  list,
  getOne,
  create,
  update,
  createAccount,
  resetPassword,
  toggleAccountStatus,
  deleteAccount,
  deleteGuardian,
  bulkGenerateAccounts,
  bulkAction,
  linkStudent,
  unlinkStudent,
};
