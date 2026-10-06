'use strict';

const { pool } = require('../config/db');
const { generateUUID, parsePagination, paginationMeta } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendConflict } = require('../utils/response');

// Universal normalizer for uploaded staff rows (handles StaffList.xlsx variations)
function normalizeStaffRow(rawRow) {
  const normalized = {};
  for (const [key, val] of Object.entries(rawRow)) {
    if (val === undefined || val === null || String(val).trim() === '') continue;
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanVal = String(val).trim();

    if (['shortname', 'short', 'initials', 'codealias', 'staffalias'].includes(cleanKey)) {
      normalized.short_name = cleanVal;
    } else if (['name', 'staffname', 'fullname', 'employeename', 'firstname'].includes(cleanKey)) {
      normalized.name = cleanVal;
    } else if (['code', 'empid', 'employeeid', 'employeecode', 'staffid', 'staffcode', 'empcode', 'id'].includes(cleanKey)) {
      normalized.employee_id = cleanVal;
    } else if (['designation', 'role', 'post', 'title', 'jobtitle', 'position'].includes(cleanKey)) {
      normalized.designation = cleanVal;
    } else if (['categoty', 'category', 'staffcategory', 'stafftype', 'type', 'deptcategory'].includes(cleanKey)) {
      normalized.category = cleanVal;
    } else if (['dob', 'dateofbirth', 'birthdate', 'birthday'].includes(cleanKey)) {
      normalized.dob = cleanVal;
    } else if (['mobileno', 'mobile', 'primarymobile', 'contact', 'contactno', 'primarycontact'].includes(cleanKey)) {
      normalized.phone = cleanVal;
    } else if (['gender', 'sex'].includes(cleanKey)) {
      normalized.gender = cleanVal;
    } else if (['phoneno', 'phone', 'secondaryphone', 'altphone', 'landline', 'altcontact', 'telephone'].includes(cleanKey)) {
      normalized.secondary_phone = cleanVal;
    } else if (['department', 'dept'].includes(cleanKey)) {
      normalized.department = cleanVal;
    } else if (['email', 'emailid', 'mail'].includes(cleanKey)) {
      normalized.email = cleanVal;
    } else if (['doj', 'dateofjoining', 'joiningdate', 'joineddate'].includes(cleanKey)) {
      normalized.date_of_joining = cleanVal;
    } else if (['leadershiprole', 'leadership', 'specialrole', 'roleinschool', 'academicresponsibility'].includes(cleanKey)) {
      normalized.leadership_role = cleanVal;
    } else if (['address', 'residentialaddress', 'fulladdress'].includes(cleanKey)) {
      normalized.address = cleanVal;
    } else if (['bloodgroup', 'bloodgrp', 'blood'].includes(cleanKey)) {
      normalized.blood_group = cleanVal;
    }
  }

  // Fallback direct properties if already normalized
  if (!normalized.employee_id && rawRow.employee_id) normalized.employee_id = String(rawRow.employee_id).trim();
  if (!normalized.name && (rawRow.name || rawRow.first_name)) normalized.name = String(rawRow.name || rawRow.first_name).trim();
  if (!normalized.short_name && rawRow.short_name) normalized.short_name = String(rawRow.short_name).trim();
  if (!normalized.designation && rawRow.designation) normalized.designation = String(rawRow.designation).trim();
  if (!normalized.category && (rawRow.category || rawRow.categoty)) normalized.category = String(rawRow.category || rawRow.categoty).trim();
  if (!normalized.dob && (rawRow.dob || rawRow.date_of_birth)) normalized.dob = rawRow.dob || rawRow.date_of_birth;
  if (!normalized.gender && rawRow.gender) normalized.gender = rawRow.gender;
  if (!normalized.phone && (rawRow.phone || rawRow.mobile)) normalized.phone = String(rawRow.phone || rawRow.mobile).trim();

  return normalized;
}

// Helper to parse date strings like "30/May/1984", "1984-05-30", or Excel numbers
function parseDate(input) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input)) {
    return input.toISOString().split('T')[0];
  }
  const str = String(input).trim();
  if (!str) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/Mon/YYYY or DD-Mon-YYYY (e.g. 30/May/1984, 15-Dec-1991)
  const monthNames = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const parts = str.split(/[/ -]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    d = d.padStart(2, '0');
    const mLower = m.toLowerCase().slice(0, 3);
    if (monthNames[mLower]) {
      m = monthNames[mLower];
    } else if (!isNaN(parseInt(m))) {
      m = m.padStart(2, '0');
    }
    if (y && y.length === 4 && d && m) {
      return `${y}-${m}-${d}`;
    }
  }

  // Try standard Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

// Helper to normalize gender
function normalizeGender(g) {
  if (!g) return 'other';
  const val = String(g).trim().toLowerCase();
  if (val === 'm' || val === 'male' || val === 'man' || val === 'boy') return 'male';
  if (val === 'f' || val === 'female' || val === 'woman' || val === 'girl') return 'female';
  return 'other';
}

// Helper to normalize category
function normalizeCategory(cat) {
  if (!cat) return 'Teaching';
  const val = String(cat).trim();
  const lower = val.toLowerCase();
  if (lower.includes('non') || lower.includes('non-teaching')) return 'Non-Teaching';
  if (lower.includes('teach')) return 'Teaching';
  if (lower.includes('admin')) return 'Administrative';
  if (lower.includes('support')) return 'Support';
  return val;
}

// ─── List Staff ───────────────────────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { page, limit, offset } = parsePagination(req.query);
    const {
      status,
      search,
      department,
      category,
      gender,
      leadership_role,
      class_id,
      section_id,
      all
    } = req.query;

    let where = 'WHERE s.school_id = ? AND s.deleted_at IS NULL';
    let params = [school_id];

    if (status) {
      where += ' AND s.status = ?';
      params.push(status);
    }
    if (category) {
      where += ' AND s.category = ?';
      params.push(category);
    }
    if (gender) {
      where += ' AND s.gender = ?';
      params.push(normalizeGender(gender));
    }
    if (department) {
      where += ' AND s.department = ?';
      params.push(department);
    }
    if (leadership_role) {
      where += ' AND (s.leadership_role LIKE ? OR sa.role_in_class LIKE ?)';
      params.push(`%${leadership_role}%`, `%${leadership_role}%`);
    }
    if (class_id) {
      where += ' AND sa.class_id = ?';
      params.push(class_id);
    }
    if (section_id) {
      where += ' AND sa.section_id = ?';
      params.push(section_id);
    }
    if (search) {
      where += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.short_name LIKE ? OR s.employee_id LIKE ? OR s.designation LIKE ? OR s.phone LIKE ? OR s.secondary_phone LIKE ? OR s.email LIKE ? OR s.leadership_role LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term, term, term, term);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(DISTINCT s.staff_id) as total
       FROM core_staff s
       LEFT JOIN core_academic_years ay
         ON ay.school_id = s.school_id AND ay.is_current = TRUE
       LEFT JOIN core_staff_assignments sa
         ON sa.staff_id = s.staff_id AND sa.academic_year_id = ay.academic_year_id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    let query = `
      SELECT s.staff_id, s.school_id, s.employee_id, s.short_name,
             s.first_name, s.last_name, s.designation, s.category,
             s.leadership_role, s.department, s.date_of_birth, s.gender,
             s.blood_group, s.date_of_joining, s.phone, s.secondary_phone,
             s.email, s.photo_url, s.address, s.status, s.created_at, s.updated_at,
             sa.assignment_id, sa.role_in_class, sa.class_id, sa.section_id,
             c.name AS class_name, sec.name AS section_name,
             ay.academic_year_id, ay.name AS academic_year_name
      FROM core_staff s
      LEFT JOIN core_academic_years ay
        ON ay.school_id = s.school_id AND ay.is_current = TRUE
      LEFT JOIN core_staff_assignments sa
        ON sa.staff_id = s.staff_id AND sa.academic_year_id = ay.academic_year_id
      LEFT JOIN core_classes c ON c.class_id = sa.class_id
      LEFT JOIN core_sections sec ON sec.section_id = sa.section_id
      ${where}
      ORDER BY
        CASE
          WHEN s.leadership_role = 'Principal' OR s.designation LIKE '%Principal%' THEN 1
          WHEN s.leadership_role = 'Vice Principal' OR s.designation LIKE '%Vice Principal%' THEN 2
          WHEN s.leadership_role LIKE 'Section Head%' THEN 3
          WHEN s.leadership_role = 'Class Teacher' THEN 4
          WHEN s.category = 'Teaching' THEN 5
          ELSE 6
        END ASC,
        s.first_name ASC, s.last_name ASC
    `;

    let rows;
    if (all === 'true' || all === '1' || req.query.limit === 'all') {
      [rows] = await pool.execute(query, params);
    } else {
      query += ' LIMIT ? OFFSET ?';
      [rows] = await pool.execute(query, [...params, limit, offset]);
    }

    return sendSuccess(res, {
      staff: rows,
      pagination: (all === 'true' || all === '1' || req.query.limit === 'all')
        ? { total, page: 1, limit: total, totalPages: 1 }
        : paginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get One Staff (with all assignments) ─────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM core_staff WHERE staff_id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, school_id]
    );
    if (rows.length === 0) return sendNotFound(res, 'Staff member not found');

    // Fetch assignments across all academic years
    const [assignments] = await pool.execute(
      `SELECT sa.assignment_id, sa.role_in_class, sa.academic_year_id,
              ay.name as academic_year, ay.is_current,
              c.name as class_name, sec.name as section_name,
              sa.class_id, sa.section_id
       FROM core_staff_assignments sa
       JOIN core_academic_years ay ON sa.academic_year_id = ay.academic_year_id
       LEFT JOIN core_classes c ON sa.class_id = c.class_id
       LEFT JOIN core_sections sec ON sa.section_id = sec.section_id
       WHERE sa.staff_id = ? AND sa.school_id = ?
       ORDER BY ay.start_date DESC`,
      [id, school_id]
    );

    return sendSuccess(res, { ...rows[0], assignments });
  } catch (err) {
    next(err);
  }
};

// ─── Create Staff ─────────────────────────────────────────────────────────────
const create = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const {
      employee_id, short_name, first_name, last_name, designation,
      category, leadership_role, department, date_of_birth, gender,
      blood_group, date_of_joining, phone, secondary_phone, email,
      photo_url, address, status,
      class_id, section_id, role_in_class, academic_year_id
    } = req.body;

    if (!employee_id || !first_name || !last_name) {
      await connection.rollback();
      return sendBadRequest(res, 'employee_id, first_name, and last_name are required');
    }

    const cleanEmpId = String(employee_id).trim();

    // Check Employee ID uniqueness per school
    const [existing] = await connection.execute(
      'SELECT staff_id FROM core_staff WHERE school_id = ? AND employee_id = ? AND deleted_at IS NULL LIMIT 1',
      [school_id, cleanEmpId]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return sendConflict(res, `Employee ID/Code "${cleanEmpId}" is already assigned to another staff member.`);
    }

    const staff_id = generateUUID();
    const formattedDob = parseDate(date_of_birth) || date_of_birth || null;
    const formattedDoj = parseDate(date_of_joining) || date_of_joining || null;
    const cleanCategory = normalizeCategory(category);
    const cleanGender = normalizeGender(gender);

    await connection.execute(
      `INSERT INTO core_staff
         (staff_id, school_id, employee_id, short_name, first_name, last_name,
          designation, category, leadership_role, department, date_of_birth, gender,
          blood_group, date_of_joining, phone, secondary_phone, email, photo_url,
          address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        staff_id, school_id, cleanEmpId, short_name ? short_name.trim() : null,
        first_name.trim(), last_name.trim(), designation ? designation.trim() : null,
        cleanCategory, leadership_role ? leadership_role.trim() : null,
        department ? department.trim() : null, formattedDob, cleanGender,
        blood_group || null, formattedDoj, phone ? phone.trim() : null,
        secondary_phone ? secondary_phone.trim() : null, email ? email.trim() : null,
        photo_url || null, address || null, status || 'active'
      ]
    );

    // Create Academic Assignment if class_id or role_in_class is provided
    if (class_id || section_id || role_in_class) {
      let activeAyId = academic_year_id;
      if (!activeAyId) {
        const [ays] = await connection.execute(
          'SELECT academic_year_id FROM core_academic_years WHERE school_id = ? AND is_current = TRUE LIMIT 1',
          [school_id]
        );
        activeAyId = ays[0]?.academic_year_id || null;
      }

      if (activeAyId) {
        const assignment_id = generateUUID();
        await connection.execute(
          `INSERT INTO core_staff_assignments
             (assignment_id, school_id, staff_id, academic_year_id, class_id, section_id, role_in_class)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [assignment_id, school_id, staff_id, activeAyId, class_id || null, section_id || null, role_in_class || leadership_role || 'class_teacher']
        );
      }
    }

    await connection.commit();
    return sendCreated(res, { staff_id, employee_id: cleanEmpId, first_name, last_name }, 'Staff member enrolled successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// ─── Update Staff ─────────────────────────────────────────────────────────────
const update = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const { id } = req.params;

    const [existing] = await connection.execute(
      'SELECT staff_id, employee_id FROM core_staff WHERE staff_id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, school_id]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return sendNotFound(res, 'Staff member not found');
    }

    const {
      employee_id, short_name, first_name, last_name, designation,
      category, leadership_role, department, date_of_birth, gender,
      blood_group, date_of_joining, phone, secondary_phone, email,
      photo_url, address, status,
      class_id, section_id, role_in_class, academic_year_id
    } = req.body;

    const cleanEmpId = employee_id ? String(employee_id).trim() : existing[0].employee_id;

    // Check Employee ID uniqueness if changed
    if (cleanEmpId !== existing[0].employee_id) {
      const [dup] = await connection.execute(
        'SELECT staff_id FROM core_staff WHERE school_id = ? AND employee_id = ? AND staff_id != ? AND deleted_at IS NULL LIMIT 1',
        [school_id, cleanEmpId, id]
      );
      if (dup.length > 0) {
        await connection.rollback();
        return sendConflict(res, `Employee Code "${cleanEmpId}" is already assigned to another staff member.`);
      }
    }

    const formattedDob = parseDate(date_of_birth) || date_of_birth || null;
    const formattedDoj = parseDate(date_of_joining) || date_of_joining || null;
    const cleanCategory = normalizeCategory(category);
    const cleanGender = normalizeGender(gender);

    await connection.execute(
      `UPDATE core_staff
       SET employee_id = ?, short_name = ?, first_name = ?, last_name = ?,
           designation = ?, category = ?, leadership_role = ?, department = ?,
           date_of_birth = ?, gender = ?, blood_group = ?, date_of_joining = ?,
           phone = ?, secondary_phone = ?, email = ?, photo_url = ?,
           address = ?, status = ?
       WHERE staff_id = ? AND school_id = ?`,
      [
        cleanEmpId, short_name ? short_name.trim() : null,
        first_name?.trim(), last_name?.trim(),
        designation ? designation.trim() : null, cleanCategory,
        leadership_role ? leadership_role.trim() : null,
        department ? department.trim() : null,
        formattedDob, cleanGender, blood_group || null, formattedDoj,
        phone ? phone.trim() : null, secondary_phone ? secondary_phone.trim() : null,
        email ? email.trim() : null, photo_url || null,
        address || null, status || 'active', id, school_id
      ]
    );

    // Manage Academic / Class Assignment if provided
    if (class_id !== undefined || section_id !== undefined || role_in_class !== undefined) {
      let activeAyId = academic_year_id;
      if (!activeAyId) {
        const [ays] = await connection.execute(
          'SELECT academic_year_id FROM core_academic_years WHERE school_id = ? AND is_current = TRUE LIMIT 1',
          [school_id]
        );
        activeAyId = ays[0]?.academic_year_id || null;
      }

      if (activeAyId) {
        const [existingAssignment] = await connection.execute(
          'SELECT assignment_id FROM core_staff_assignments WHERE staff_id = ? AND academic_year_id = ? LIMIT 1',
          [id, activeAyId]
        );

        if (class_id || section_id || role_in_class) {
          if (existingAssignment.length > 0) {
            await connection.execute(
              `UPDATE core_staff_assignments
               SET class_id = ?, section_id = ?, role_in_class = ?
               WHERE assignment_id = ?`,
              [class_id || null, section_id || null, role_in_class || leadership_role || 'class_teacher', existingAssignment[0].assignment_id]
            );
          } else {
            await connection.execute(
              `INSERT INTO core_staff_assignments
                 (assignment_id, school_id, staff_id, academic_year_id, class_id, section_id, role_in_class)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [generateUUID(), school_id, id, activeAyId, class_id || null, section_id || null, role_in_class || leadership_role || 'class_teacher']
            );
          }
        } else if (existingAssignment.length > 0) {
          // If all assignment fields are cleared, delete current assignment
          await connection.execute(
            'DELETE FROM core_staff_assignments WHERE assignment_id = ?',
            [existingAssignment[0].assignment_id]
          );
        }
      }
    }

    await connection.commit();
    return sendSuccess(res, { staff_id: id }, 'Staff member updated successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// ─── Delete Staff ─────────────────────────────────────────────────────────────
const deleteStaff = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const { id } = req.params;

    const [existing] = await connection.execute(
      'SELECT staff_id FROM core_staff WHERE staff_id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, school_id]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return sendNotFound(res, 'Staff member not found');
    }

    // Soft delete staff member
    await connection.execute(
      `UPDATE core_staff SET deleted_at = NOW(), status = 'inactive' WHERE staff_id = ? AND school_id = ?`,
      [id, school_id]
    );

    // Remove active assignments
    await connection.execute(
      `DELETE FROM core_staff_assignments WHERE staff_id = ? AND school_id = ?`,
      [id, school_id]
    );

    await connection.commit();
    return sendSuccess(res, { staff_id: id }, 'Staff member removed successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// ─── Bulk Delete Staff ────────────────────────────────────────────────────────
const bulkDelete = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const { staff_ids } = req.body;

    if (!Array.isArray(staff_ids) || staff_ids.length === 0) {
      await connection.rollback();
      return sendBadRequest(res, 'Please provide an array of staff_ids to delete.');
    }

    const validIds = staff_ids.filter((id) => typeof id === 'string' && id.trim().length > 0);
    if (validIds.length === 0) {
      await connection.rollback();
      return sendBadRequest(res, 'No valid staff_ids provided.');
    }

    const placeholders = validIds.map(() => '?').join(',');

    const [delResult] = await connection.execute(
      `UPDATE core_staff
       SET deleted_at = NOW(), status = 'inactive'
       WHERE school_id = ? AND staff_id IN (${placeholders}) AND deleted_at IS NULL`,
      [school_id, ...validIds]
    );

    await connection.execute(
      `DELETE FROM core_staff_assignments
       WHERE school_id = ? AND staff_id IN (${placeholders})`,
      [school_id, ...validIds]
    );

    await connection.commit();
    return sendSuccess(res, { count: delResult.affectedRows }, `${delResult.affectedRows} staff member(s) deleted successfully.`);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// ─── Bulk Upload Staff (tailored for StaffList.xlsx) ──────────────────────────
const bulkUpload = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const { staff = [], upsert = true } = req.body;

    if (!Array.isArray(staff) || staff.length === 0) {
      await connection.rollback();
      return sendBadRequest(res, 'Please provide an array of staff records to import.');
    }

    // 1. Fetch existing staff for this school
    const [dbStaff] = await connection.execute(
      'SELECT staff_id, employee_id FROM core_staff WHERE school_id = ? AND deleted_at IS NULL',
      [school_id]
    );
    const existingStaffMap = new Map();
    dbStaff.forEach((s) => existingStaffMap.set(s.employee_id.toLowerCase(), s));

    // 2. Validate batch and normalize rows
    const batchEmpSet = new Set();
    const normalizedList = [];

    for (let i = 0; i < staff.length; i++) {
      const norm = normalizeStaffRow(staff[i]);
      if (!norm.employee_id) {
        const rawSlNo = staff[i]['Sl.No.'] || staff[i].sl_no || staff[i].slno;
        if (rawSlNo) {
          norm.employee_id = `EMP-${String(rawSlNo).trim().padStart(3, '0')}`;
        } else if (norm.short_name) {
          norm.employee_id = `EMP-${norm.short_name.trim()}`;
        } else {
          norm.employee_id = `EMP-${String(i + 1).padStart(3, '0')}`;
        }
      }
      if (!norm.name) {
        await connection.rollback();
        return sendBadRequest(res, `Row ${i + 1} has an empty Staff Name.`);
      }
      const lowerEmp = norm.employee_id.toLowerCase();
      if (batchEmpSet.has(lowerEmp)) {
        await connection.rollback();
        return sendBadRequest(res, `Duplicate Employee Code "${norm.employee_id}" found inside upload file at row ${i + 1}.`);
      }
      batchEmpSet.add(lowerEmp);
      normalizedList.push(norm);
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // 3. Process normalized staff records
    for (const row of normalizedList) {
      const empId = row.employee_id;
      const rawName = row.name || '';

      let firstName = '';
      let lastName = '.';

      if (rawName) {
        const nameParts = rawName.trim().split(/\s+/);
        if (nameParts.length === 1) {
          firstName = nameParts[0];
          lastName = '.';
        } else {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }
      }

      const shortName = row.short_name || null;
      const designation = row.designation || 'Staff Member';
      const category = normalizeCategory(row.category);
      const gender = normalizeGender(row.gender);
      const formattedDob = parseDate(row.dob) || null;
      const phone = row.phone || null;
      const secondaryPhone = row.secondary_phone || null;
      const department = row.department || (category === 'Teaching' ? 'Academics' : 'Administration');
      const leadershipRole = row.leadership_role || null;
      const address = row.address || null;
      const bloodGroup = row.blood_group || null;
      const email = row.email || null;
      const formattedDoj = parseDate(row.date_of_joining) || null;

      const existingRecord = existingStaffMap.get(empId.toLowerCase());

      if (existingRecord) {
        if (!upsert) {
          skippedCount++;
          continue;
        }
        // Update existing staff
        await connection.execute(
          `UPDATE core_staff
           SET short_name = ?, first_name = ?, last_name = ?, designation = ?,
               category = ?, leadership_role = COALESCE(?, leadership_role),
               department = ?, date_of_birth = ?, gender = ?,
               phone = ?, secondary_phone = ?, email = COALESCE(?, email),
               address = COALESCE(?, address), blood_group = COALESCE(?, blood_group),
               status = 'active'
           WHERE staff_id = ?`,
          [
            shortName, firstName, lastName, designation,
            category, leadershipRole, department, formattedDob, gender,
            phone, secondaryPhone, email, address, bloodGroup,
            existingRecord.staff_id
          ]
        );
        updatedCount++;
      } else {
        // Insert new staff member
        const staff_id = generateUUID();
        await connection.execute(
          `INSERT INTO core_staff
             (staff_id, school_id, employee_id, short_name, first_name, last_name,
              designation, category, leadership_role, department, date_of_birth, gender,
              blood_group, date_of_joining, phone, secondary_phone, email, photo_url,
              address, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'active')`,
          [
            staff_id, school_id, empId, shortName, firstName, lastName,
            designation, category, leadershipRole, department, formattedDob, gender,
            bloodGroup, formattedDoj, phone, secondaryPhone, email, address
          ]
        );
        existingStaffMap.set(empId.toLowerCase(), { staff_id, employee_id: empId });
        importedCount++;
      }
    }

    await connection.commit();

    return sendSuccess(res, {
      total: staff.length,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
    }, `Bulk import finished: ${importedCount} staff enrolled, ${updatedCount} updated, ${skippedCount} skipped.`);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// ─── Assign Staff to Class/Section/Year ───────────────────────────────────────
const createAssignment = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params; // staff_id
    const { academic_year_id, class_id, section_id, role_in_class } = req.body;

    if (!academic_year_id) {
      return sendBadRequest(res, 'academic_year_id is required');
    }

    // Backend cross-school validation
    const [staffCheck] = await pool.execute(
      'SELECT staff_id FROM core_staff WHERE staff_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, school_id]
    );
    if (staffCheck.length === 0) return sendNotFound(res, 'Staff member not found');

    const [yearCheck] = await pool.execute(
      'SELECT academic_year_id FROM core_academic_years WHERE academic_year_id = ? AND school_id = ?',
      [academic_year_id, school_id]
    );
    if (yearCheck.length === 0) return sendNotFound(res, 'Academic year not found in this school');

    if (class_id) {
      const [classCheck] = await pool.execute(
        'SELECT class_id FROM core_classes WHERE class_id = ? AND school_id = ? AND deleted_at IS NULL',
        [class_id, school_id]
      );
      if (classCheck.length === 0) return sendNotFound(res, 'Class not found in this school');
    }

    if (section_id) {
      const [secCheck] = await pool.execute(
        'SELECT section_id FROM core_sections WHERE section_id = ? AND school_id = ? AND deleted_at IS NULL',
        [section_id, school_id]
      );
      if (secCheck.length === 0) return sendNotFound(res, 'Section not found in this school');
    }

    const assignment_id = generateUUID();

    await pool.execute(
      `INSERT INTO core_staff_assignments
         (assignment_id, school_id, staff_id, academic_year_id, class_id, section_id, role_in_class, subject_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [assignment_id, school_id, id, academic_year_id, class_id || null, section_id || null, role_in_class || 'class_teacher', req.body.subject_name || null]
    );

    return sendCreated(res, { assignment_id, staff_id: id, academic_year_id }, 'Staff assignment created successfully');
  } catch (err) {
    next(err);
  }
};

// ─── List All Staff Assignments (School & Academic Year) ──────────────────────
const listAssignments = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { academic_year_id, class_id, section_id, staff_id } = req.query;

    let where = 'WHERE sa.school_id = ?';
    let params = [school_id];

    if (academic_year_id) {
      where += ' AND sa.academic_year_id = ?';
      params.push(academic_year_id);
    }
    if (class_id) {
      where += ' AND sa.class_id = ?';
      params.push(class_id);
    }
    if (section_id) {
      where += ' AND sa.section_id = ?';
      params.push(section_id);
    }
    if (staff_id) {
      where += ' AND sa.staff_id = ?';
      params.push(staff_id);
    }

    const [rows] = await pool.execute(
      `SELECT sa.assignment_id, sa.school_id, sa.staff_id, sa.academic_year_id,
              sa.class_id, sa.section_id, sa.role_in_class, sa.subject_name,
              sa.created_at, sa.updated_at,
              s.first_name, s.last_name, s.short_name, s.employee_id, s.designation,
              s.category, s.leadership_role, s.photo_url, s.phone,
              c.name AS class_name,
              sec.name AS section_name,
              ay.name AS academic_year_name
       FROM core_staff_assignments sa
       JOIN core_staff s ON s.staff_id = sa.staff_id
       LEFT JOIN core_classes c ON c.class_id = sa.class_id
       LEFT JOIN core_sections sec ON sec.section_id = sa.section_id
       LEFT JOIN core_academic_years ay ON ay.academic_year_id = sa.academic_year_id
       ${where}
       ORDER BY c.sort_order ASC, sec.name ASC, sa.role_in_class ASC`,
      params
    );

    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─── Save Class Assignments (Class In-Charge, Asst In-Charge, Subject Teachers) ──
const saveClassAssignments = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const {
      academic_year_id,
      class_id,
      section_id,
      class_teacher_id,
      assistant_class_teacher_id,
      subject_assignments = []
    } = req.body;

    if (!class_id || !academic_year_id) {
      return sendBadRequest(res, 'class_id and academic_year_id are required');
    }

    // Delete existing assignments for this class & section in this academic year
    let deleteQuery = 'DELETE FROM core_staff_assignments WHERE school_id = ? AND academic_year_id = ? AND class_id = ?';
    let deleteParams = [school_id, academic_year_id, class_id];
    if (section_id) {
      deleteQuery += ' AND section_id = ?';
      deleteParams.push(section_id);
    } else {
      deleteQuery += ' AND section_id IS NULL';
    }
    await pool.execute(deleteQuery, deleteParams);

    const inserted = [];

    // 1. Class Teacher (Class In-Charge)
    if (class_teacher_id) {
      const asgnId = generateUUID();
      await pool.execute(
        `INSERT INTO core_staff_assignments
           (assignment_id, school_id, staff_id, academic_year_id, class_id, section_id, role_in_class, subject_name)
         VALUES (?, ?, ?, ?, ?, ?, 'class_teacher', NULL)`,
        [asgnId, school_id, class_teacher_id, academic_year_id, class_id, section_id || null]
      );
      inserted.push({ assignment_id: asgnId, staff_id: class_teacher_id, role: 'class_teacher' });
    }

    // 2. Assistant Class Teacher (Asst. Class In-Charge)
    if (assistant_class_teacher_id) {
      const asgnId = generateUUID();
      await pool.execute(
        `INSERT INTO core_staff_assignments
           (assignment_id, school_id, staff_id, academic_year_id, class_id, section_id, role_in_class, subject_name)
         VALUES (?, ?, ?, ?, ?, ?, 'assistant_class_teacher', NULL)`,
        [asgnId, school_id, assistant_class_teacher_id, academic_year_id, class_id, section_id || null]
      );
      inserted.push({ assignment_id: asgnId, staff_id: assistant_class_teacher_id, role: 'assistant_class_teacher' });
    }

    // 3. Subject Teachers
    for (const item of subject_assignments) {
      if (item.staff_id && item.subject_name) {
        const asgnId = generateUUID();
        await pool.execute(
          `INSERT INTO core_staff_assignments
             (assignment_id, school_id, staff_id, academic_year_id, class_id, section_id, role_in_class, subject_name)
           VALUES (?, ?, ?, ?, ?, ?, 'subject_teacher', ?)`,
          [asgnId, school_id, item.staff_id, academic_year_id, class_id, section_id || null, String(item.subject_name).trim()]
        );
        inserted.push({ assignment_id: asgnId, staff_id: item.staff_id, role: 'subject_teacher', subject: item.subject_name });
      }
    }

    return sendSuccess(res, { inserted_count: inserted.length, assignments: inserted }, 'Class academic assignments updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Delete Staff Assignment ──────────────────────────────────────────────────
const deleteAssignment = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { assignmentId } = req.params;

    const [resDelete] = await pool.execute(
      'DELETE FROM core_staff_assignments WHERE assignment_id = ? AND school_id = ?',
      [assignmentId, school_id]
    );

    if (resDelete.affectedRows === 0) return sendNotFound(res, 'Assignment not found');
    return sendSuccess(res, null, 'Assignment removed');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getOne,
  create,
  update,
  deleteStaff,
  bulkDelete,
  bulkUpload,
  createAssignment,
  deleteAssignment,
  listAssignments,
  saveClassAssignments
};
