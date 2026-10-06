'use strict';

const { pool } = require('../config/db');
const { generateUUID, parsePagination, paginationMeta } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendConflict } = require('../utils/response');

// Universal normalizer for uploaded rows (handles any column header variation)
function normalizeStudentRow(rawRow) {
  const normalized = {};
  for (const [key, val] of Object.entries(rawRow)) {
    if (val === undefined || val === null || String(val).trim() === '') continue;
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanVal = String(val).trim();

    if (['admno', 'admissionno', 'admissionnumber', 'admnumber', 'admission'].includes(cleanKey)) {
      normalized.admission_number = cleanVal;
    } else if (['name', 'studentname', 'fullname', 'firstname'].includes(cleanKey)) {
      normalized.name = cleanVal;
    } else if (['classno', 'rollno', 'rollnumber', 'classnumber', 'roll', 'classrollno', 'classroll', 'rno', 'cno', 'classrollnumber'].includes(cleanKey)) {
      normalized.roll_number = cleanVal;
    } else if (['course', 'class', 'classname', 'grade', 'standard', 'std'].includes(cleanKey)) {
      normalized.course = cleanVal;
    } else if (['division', 'section', 'sec', 'div', 'sectionname'].includes(cleanKey)) {
      normalized.division = cleanVal;
    } else if (['dob', 'dateofbirth', 'birthdate'].includes(cleanKey)) {
      normalized.dob = cleanVal;
    } else if (['gender', 'sex'].includes(cleanKey)) {
      normalized.gender = cleanVal;
    } else if (['fathersname', 'fathername', 'parentname', 'father', 'guardianname'].includes(cleanKey)) {
      normalized.father_name = cleanVal;
    } else if (['guardianrelation', 'relation', 'relationship'].includes(cleanKey)) {
      normalized.guardian_relation = cleanVal;
    } else if (['guardianmobileno', 'guardianmobile', 'guardianphone', 'parentphone', 'parentmobile', 'mobile', 'mobileno', 'contact'].includes(cleanKey)) {
      normalized.guardian_mobile = cleanVal;
    } else if (['phone', 'phoneno', 'secondaryphone', 'altphone', 'telephone'].includes(cleanKey)) {
      normalized.phone = cleanVal;
    } else if (['admitaddress', 'address', 'residentialaddress', 'fulladdress'].includes(cleanKey)) {
      normalized.admit_address = cleanVal;
    } else if (['area', 'locality', 'place', 'city'].includes(cleanKey)) {
      normalized.area = cleanVal;
    } else if (['pincode', 'pin', 'postalcode', 'zip'].includes(cleanKey)) {
      normalized.pincode = cleanVal;
    } else if (['bloodgroup', 'bloodgrp', 'blood'].includes(cleanKey)) {
      normalized.blood_group = cleanVal;
    }
  }

  // Fallback direct properties if already normalized
  if (!normalized.admission_number && rawRow.admission_number) normalized.admission_number = String(rawRow.admission_number).trim();
  if (!normalized.name && (rawRow.name || rawRow.first_name)) normalized.name = String(rawRow.name || rawRow.first_name).trim();
  if (!normalized.roll_number && rawRow.roll_number) normalized.roll_number = String(rawRow.roll_number).trim();
  if (!normalized.course && (rawRow.course || rawRow.class_name)) normalized.course = String(rawRow.course || rawRow.class_name).trim();
  if (!normalized.division && (rawRow.division || rawRow.section_name)) normalized.division = String(rawRow.division || rawRow.section_name).trim();
  if (!normalized.dob && rawRow.dob) normalized.dob = rawRow.dob;
  if (!normalized.gender && rawRow.gender) normalized.gender = rawRow.gender;

  return normalized;
}

// Helper to parse date strings like "30/Oct/2018", "21/May/2018", "2018-10-30", or Excel serials
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

  // DD/Mon/YYYY or DD-Mon-YYYY (e.g. 30/Oct/2018, 21-May-2018)
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
  if (val === 'm' || val === 'male' || val === 'boy') return 'male';
  if (val === 'f' || val === 'female' || val === 'girl') return 'female';
  return 'other';
}

// ─── List Students ────────────────────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { page, limit, offset } = parsePagination(req.query);
    const { status, search, class_id, section_id, gender, all } = req.query;

    let where = 'WHERE s.school_id = ? AND s.deleted_at IS NULL';
    let params = [school_id];

    if (status) {
      where += ' AND s.status = ?';
      params.push(status);
    }

    if (gender) {
      where += ' AND s.gender = ?';
      params.push(normalizeGender(gender));
    }

    if (class_id) {
      where += ' AND saa.class_id = ?';
      params.push(class_id);
    }

    if (section_id) {
      where += ' AND saa.section_id = ?';
      params.push(section_id);
    }

    if (search) {
      where += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ? OR s.father_name LIKE ? OR s.phone LIKE ? OR s.area LIKE ? OR c.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term, term);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(DISTINCT s.student_id) AS total
       FROM core_students s
       LEFT JOIN core_academic_years ay
         ON ay.school_id = s.school_id AND ay.is_current = TRUE
       LEFT JOIN core_student_academic_assignments saa
         ON saa.student_id = s.student_id AND saa.academic_year_id = ay.academic_year_id
       LEFT JOIN core_classes c ON c.class_id = saa.class_id
       LEFT JOIN core_sections sec ON sec.section_id = saa.section_id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    let query = `
      SELECT s.student_id, s.school_id, s.admission_number,
             s.first_name, s.middle_name, s.last_name,
             s.date_of_birth, s.gender, s.blood_group, s.nationality,
             s.photo_url, s.address, s.area, s.pincode, s.phone,
             s.father_name, s.guardian_relation, s.guardian_phone,
             s.admission_date, s.status, s.created_at, s.updated_at,
             saa.assignment_id, saa.class_id, saa.section_id, saa.roll_number,
             c.name AS class_name, sec.name AS section_name,
             ay.academic_year_id, ay.name AS academic_year_name
      FROM core_students s
      LEFT JOIN core_academic_years ay
        ON ay.school_id = s.school_id AND ay.is_current = TRUE
      LEFT JOIN core_student_academic_assignments saa
        ON saa.student_id = s.student_id AND saa.academic_year_id = ay.academic_year_id
      LEFT JOIN core_classes c   ON c.class_id   = saa.class_id
      LEFT JOIN core_sections sec ON sec.section_id = saa.section_id
      ${where}
      ORDER BY c.numeric_order ASC, sec.name ASC, CAST(saa.roll_number AS UNSIGNED) ASC, s.first_name ASC
    `;

    let rows;
    if (all === 'true' || all === '1' || req.query.limit === 'all') {
      [rows] = await pool.execute(query, params);
    } else {
      query += ' LIMIT ? OFFSET ?';
      [rows] = await pool.execute(query, [...params, limit, offset]);
    }

    return sendSuccess(res, {
      students: rows,
      pagination: (all === 'true' || all === '1' || req.query.limit === 'all')
        ? { total, page: 1, limit: total, totalPages: 1 }
        : paginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get One Student ──────────────────────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT s.*,
              saa.assignment_id, saa.class_id, saa.section_id, saa.roll_number, saa.status AS assignment_status,
              c.name AS class_name, sec.name AS section_name,
              ay.academic_year_id, ay.name AS academic_year
       FROM core_students s
       LEFT JOIN core_academic_years ay
         ON ay.school_id = s.school_id AND ay.is_current = TRUE
       LEFT JOIN core_student_academic_assignments saa
         ON saa.student_id = s.student_id AND saa.academic_year_id = ay.academic_year_id
       LEFT JOIN core_classes c   ON c.class_id   = saa.class_id
       LEFT JOIN core_sections sec ON sec.section_id = saa.section_id
       WHERE s.student_id = ? AND s.school_id = ? AND s.deleted_at IS NULL
       LIMIT 1`,
      [id, school_id]
    );

    if (rows.length === 0) return sendNotFound(res, 'Student not found');
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Create Student ───────────────────────────────────────────────────────────
const create = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const {
      admission_number, first_name, last_name, middle_name,
      date_of_birth, gender, blood_group, nationality,
      address, area, pincode, phone,
      father_name, guardian_relation, guardian_phone,
      admission_date, photo_url, status,
      class_id, section_id, roll_number, academic_year_id
    } = req.body;

    if (!admission_number || !first_name || !last_name || !date_of_birth) {
      await connection.rollback();
      return sendBadRequest(res, 'admission_number, first_name, last_name, and date_of_birth are required');
    }

    const cleanAdmNo = String(admission_number).trim();

    // 1. Strict Uniqueness Check
    const [existing] = await connection.execute(
      'SELECT student_id FROM core_students WHERE school_id = ? AND admission_number = ? AND deleted_at IS NULL LIMIT 1',
      [school_id, cleanAdmNo]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return sendConflict(res, `Admission number "${cleanAdmNo}" is already assigned to another student in this school.`);
    }

    const student_id = generateUUID();
    const formattedDob = parseDate(date_of_birth) || date_of_birth;
    const formattedAdmDate = parseDate(admission_date) || new Date().toISOString().split('T')[0];

    // 2. Insert master student record
    await connection.execute(
      `INSERT INTO core_students
         (student_id, school_id, admission_number, first_name, middle_name, last_name,
          date_of_birth, gender, blood_group, nationality, photo_url,
          address, area, pincode, phone, father_name, guardian_relation, guardian_phone,
          admission_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id, school_id, cleanAdmNo, first_name.trim(), middle_name?.trim() || null,
        last_name.trim(), formattedDob, normalizeGender(gender), blood_group || 'O+',
        nationality || 'Indian', photo_url || null,
        address || null, area || null, pincode || null, phone || null,
        father_name || null, guardian_relation || 'Father', guardian_phone || phone || null,
        formattedAdmDate, status || 'active'
      ]
    );

    // 3. Assign Academic Placement if class_id and section_id are provided
    if (class_id && section_id) {
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
          `INSERT INTO core_student_academic_assignments
             (assignment_id, school_id, student_id, academic_year_id, class_id, section_id, roll_number, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
           ON DUPLICATE KEY UPDATE class_id = VALUES(class_id), section_id = VALUES(section_id), roll_number = VALUES(roll_number)`,
          [assignment_id, school_id, student_id, activeAyId, class_id, section_id, roll_number || null]
        );
      }
    }

    // 4. Create/Link Guardian Record if father_name or guardian_phone provided
    if (father_name || guardian_phone) {
      const guardian_id = generateUUID();
      const gRelation = (guardian_relation || 'father').toLowerCase();
      const validRelation = ['father', 'mother', 'legal_guardian', 'other'].includes(gRelation) ? gRelation : 'other';

      await connection.execute(
        `INSERT INTO core_guardians
           (guardian_id, school_id, first_name, last_name, relationship_type, phone, address, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [guardian_id, school_id, father_name || 'Guardian', '', validRelation, guardian_phone || phone || null, address || null]
      );

      await connection.execute(
        `INSERT INTO core_student_guardians
           (student_guardian_id, school_id, student_id, guardian_id, is_primary_contact, is_emergency_contact, can_pickup)
         VALUES (?, ?, ?, ?, TRUE, TRUE, TRUE)`,
        [generateUUID(), school_id, student_id, guardian_id]
      );
    }

    await connection.commit();
    return sendCreated(res, { student_id, admission_number: cleanAdmNo, first_name, last_name }, 'Student enrolled successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// ─── Update Student ───────────────────────────────────────────────────────────
const update = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const { id } = req.params;

    const [existing] = await connection.execute(
      'SELECT student_id, admission_number FROM core_students WHERE student_id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, school_id]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return sendNotFound(res, 'Student not found');
    }

    const {
      admission_number, first_name, middle_name, last_name, date_of_birth, gender,
      blood_group, nationality, photo_url, address, area, pincode, phone,
      father_name, guardian_relation, guardian_phone,
      admission_date, status,
      class_id, section_id, roll_number, academic_year_id
    } = req.body;

    const cleanAdmNo = admission_number ? String(admission_number).trim() : existing[0].admission_number;

    // 1. Strict Uniqueness Check (if changed)
    if (cleanAdmNo !== existing[0].admission_number) {
      const [dup] = await connection.execute(
        'SELECT student_id FROM core_students WHERE school_id = ? AND admission_number = ? AND student_id != ? AND deleted_at IS NULL LIMIT 1',
        [school_id, cleanAdmNo, id]
      );
      if (dup.length > 0) {
        await connection.rollback();
        return sendConflict(res, `Admission number "${cleanAdmNo}" is already in use by another student.`);
      }
    }

    const formattedDob = parseDate(date_of_birth) || date_of_birth;

    // 2. Update Student Master
    await connection.execute(
      `UPDATE core_students
       SET admission_number = ?, first_name = ?, middle_name = ?, last_name = ?,
           date_of_birth = ?, gender = ?, blood_group = ?, nationality = ?, photo_url = ?,
           address = ?, area = ?, pincode = ?, phone = ?, father_name = ?,
           guardian_relation = ?, guardian_phone = ?, status = ?
       WHERE student_id = ? AND school_id = ?`,
      [
        cleanAdmNo, first_name?.trim(), middle_name?.trim() || null, last_name?.trim(),
        formattedDob, normalizeGender(gender), blood_group || 'O+', nationality || 'Indian',
        photo_url || null, address || null, area || null, pincode || null, phone || null,
        father_name || null, guardian_relation || 'Father', guardian_phone || phone || null,
        status || 'active', id, school_id
      ]
    );

    // 3. Update Academic Assignment & Roll Number
    if (class_id && section_id) {
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
          'SELECT assignment_id FROM core_student_academic_assignments WHERE student_id = ? AND academic_year_id = ? LIMIT 1',
          [id, activeAyId]
        );

        if (existingAssignment.length > 0) {
          await connection.execute(
            `UPDATE core_student_academic_assignments
             SET class_id = ?, section_id = ?, roll_number = ?, status = 'active'
             WHERE assignment_id = ?`,
            [class_id, section_id, roll_number || null, existingAssignment[0].assignment_id]
          );
        } else {
          await connection.execute(
            `INSERT INTO core_student_academic_assignments
               (assignment_id, school_id, student_id, academic_year_id, class_id, section_id, roll_number, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [generateUUID(), school_id, id, activeAyId, class_id, section_id, roll_number || null]
          );
        }
      }
    }

    await connection.commit();
    return sendSuccess(res, { student_id: id }, 'Student updated successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// ─── Delete Student ───────────────────────────────────────────────────────────
const deleteStudent = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const { id } = req.params;

    const [existing] = await connection.execute(
      'SELECT student_id FROM core_students WHERE student_id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, school_id]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return sendNotFound(res, 'Student not found');
    }

    // Soft delete student
    await connection.execute(
      'UPDATE core_students SET deleted_at = NOW(), status = \'inactive\' WHERE student_id = ? AND school_id = ?',
      [id, school_id]
    );

    // Mark assignment as withdrawn
    await connection.execute(
      'UPDATE core_student_academic_assignments SET status = \'withdrawn\' WHERE student_id = ? AND school_id = ?',
      [id, school_id]
    );

    await connection.commit();
    return sendSuccess(res, { student_id: id }, 'Student removed successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// ─── Bulk Delete Students ─────────────────────────────────────────────────────
const bulkDelete = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const { student_ids } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      await connection.rollback();
      return sendBadRequest(res, 'Please provide an array of student_ids to delete.');
    }

    const validIds = student_ids.filter((id) => typeof id === 'string' && id.trim().length > 0);
    if (validIds.length === 0) {
      await connection.rollback();
      return sendBadRequest(res, 'No valid student_ids provided.');
    }

    const placeholders = validIds.map(() => '?').join(',');

    const [delResult] = await connection.execute(
      `UPDATE core_students
       SET deleted_at = NOW(), status = 'inactive'
       WHERE school_id = ? AND student_id IN (${placeholders}) AND deleted_at IS NULL`,
      [school_id, ...validIds]
    );

    await connection.execute(
      `UPDATE core_student_academic_assignments
       SET status = 'withdrawn'
       WHERE school_id = ? AND student_id IN (${placeholders})`,
      [school_id, ...validIds]
    );

    await connection.commit();
    return sendSuccess(res, { count: delResult.affectedRows }, `${delResult.affectedRows} student(s) deleted successfully.`);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// ─── Bulk Upload Students with Universal Normalization & Class/Division Resolution ─
const bulkUpload = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { school_id } = req.user;
    const { students = [], upsert = false } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      await connection.rollback();
      return sendBadRequest(res, 'Please provide an array of student records to import.');
    }

    // 1. Fetch or create Current Academic Year
    let [ays] = await connection.execute(
      'SELECT academic_year_id FROM core_academic_years WHERE school_id = ? AND is_current = TRUE LIMIT 1',
      [school_id]
    );
    let academic_year_id = ays[0]?.academic_year_id;
    if (!academic_year_id) {
      academic_year_id = generateUUID();
      await connection.execute(
        `INSERT INTO core_academic_years (academic_year_id, school_id, name, start_date, end_date, is_current)
         VALUES (?, ?, '2025-2026', '2025-04-01', '2026-03-31', TRUE)`,
        [academic_year_id, school_id]
      );
    }

    // 2. Fetch existing classes and sections for this school
    const [existingClasses] = await connection.execute(
      'SELECT class_id, name, numeric_order FROM core_classes WHERE school_id = ? AND deleted_at IS NULL',
      [school_id]
    );
    const classMap = new Map(); // normalized name -> class object
    existingClasses.forEach((c) => classMap.set(c.name.trim().toLowerCase(), c));

    const [existingSections] = await connection.execute(
      'SELECT section_id, class_id, name FROM core_sections WHERE school_id = ? AND deleted_at IS NULL',
      [school_id]
    );
    const sectionMap = new Map(); // `${class_id}:${normalized_section_name}` -> section object
    existingSections.forEach((s) => sectionMap.set(`${s.class_id}:${s.name.trim().toLowerCase()}`, s));

    // Class numeric order map helper
    const getNumericOrder = (name) => {
      const n = name.toLowerCase();
      if (n.includes('prekg') || n.includes('pre-kg') || n.includes('kg-1')) return 1;
      if (n.includes('lkg') || n.includes('kg-2')) return 2;
      if (n.includes('ukg') || n.includes('kg-3')) return 3;
      const match = n.match(/\d+/);
      if (match) return parseInt(match[0]) + 3;
      return 50;
    };

    // Helper to get or create class
    const getOrCreateClass = async (rawClassName) => {
      if (!rawClassName) return null;
      const normalized = rawClassName.trim().toLowerCase();
      if (classMap.has(normalized)) return classMap.get(normalized);

      const class_id = generateUUID();
      const numeric_order = getNumericOrder(rawClassName);
      const cleanName = rawClassName.trim();

      await connection.execute(
        'INSERT INTO core_classes (class_id, school_id, name, numeric_order) VALUES (?, ?, ?, ?)',
        [class_id, school_id, cleanName, numeric_order]
      );
      const newClass = { class_id, name: cleanName, numeric_order };
      classMap.set(normalized, newClass);
      return newClass;
    };

    // Helper to get or create section
    const getOrCreateSection = async (class_id, rawSectionName) => {
      if (!class_id || !rawSectionName) return null;
      const cleanSection = rawSectionName.trim().toUpperCase();
      const key = `${class_id}:${cleanSection.toLowerCase()}`;
      if (sectionMap.has(key)) return sectionMap.get(key);

      const section_id = generateUUID();
      await connection.execute(
        'INSERT INTO core_sections (section_id, school_id, class_id, name, max_strength) VALUES (?, ?, ?, ?, 60)',
        [section_id, school_id, class_id, cleanSection]
      );
      const newSection = { section_id, class_id, name: cleanSection };
      sectionMap.set(key, newSection);
      return newSection;
    };

    // 3. Pre-check for duplicate admission numbers within the incoming batch
    const batchAdmSet = new Set();
    const normalizedList = [];

    for (let i = 0; i < students.length; i++) {
      const norm = normalizeStudentRow(students[i]);
      if (!norm.admission_number) {
        await connection.rollback();
        return sendBadRequest(res, `Row ${i + 1} has an empty admission number.`);
      }
      const lowerAdm = norm.admission_number.toLowerCase();
      if (batchAdmSet.has(lowerAdm)) {
        await connection.rollback();
        return sendBadRequest(res, `Duplicate admission number "${norm.admission_number}" found inside the upload file at row ${i + 1}.`);
      }
      batchAdmSet.add(lowerAdm);
      normalizedList.push(norm);
    }

    // 4. Fetch existing students in DB for this school
    const [dbStudents] = await connection.execute(
      'SELECT student_id, admission_number FROM core_students WHERE school_id = ? AND deleted_at IS NULL',
      [school_id]
    );
    const existingStudentMap = new Map();
    dbStudents.forEach((s) => existingStudentMap.set(s.admission_number.toLowerCase(), s));

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // 5. Process each normalized student row
    for (const row of normalizedList) {
      const adm = row.admission_number;
      const rawName = row.name || '';

      let firstName = '';
      let lastName = '.';
      let middleName = null;

      if (rawName) {
        const nameParts = rawName.split(/\s+/);
        if (nameParts.length === 1) {
          firstName = nameParts[0];
          lastName = '.';
        } else {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }
      }

      const rollNo = row.roll_number || null;
      const formattedDob = parseDate(row.dob) || '2015-01-01';
      const gender = normalizeGender(row.gender);
      const address = row.admit_address || null;
      const area = row.area || null;
      const pincode = row.pincode || null;
      const fatherName = row.father_name || null;
      const guardianRelation = row.guardian_relation || 'Father';
      const guardianMobile = row.guardian_mobile || row.phone || null;
      const phone = row.phone || guardianMobile || null;

      // Resolve Class & Section
      let resolvedClass = null;
      let resolvedSection = null;
      if (row.course) {
        resolvedClass = await getOrCreateClass(row.course);
        if (resolvedClass && row.division) {
          resolvedSection = await getOrCreateSection(resolvedClass.class_id, row.division);
        }
      }

      const existingRecord = existingStudentMap.get(adm.toLowerCase());

      let student_id;
      if (existingRecord) {
        if (!upsert) {
          skippedCount++;
          continue;
        }
        // Update existing student
        student_id = existingRecord.student_id;
        await connection.execute(
          `UPDATE core_students
           SET first_name = ?, last_name = ?, middle_name = ?, date_of_birth = ?,
               gender = ?, address = ?, area = ?, pincode = ?, phone = ?,
               father_name = ?, guardian_relation = ?, guardian_phone = ?, status = 'active'
           WHERE student_id = ?`,
          [
            firstName, lastName, middleName, formattedDob,
            gender, address, area, pincode, phone,
            fatherName, guardianRelation, guardianMobile || phone, student_id
          ]
        );
        updatedCount++;
      } else {
        // Insert new student
        student_id = generateUUID();
        await connection.execute(
          `INSERT INTO core_students
             (student_id, school_id, admission_number, first_name, middle_name, last_name,
              date_of_birth, gender, blood_group, nationality,
              address, area, pincode, phone, father_name, guardian_relation, guardian_phone,
              admission_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'O+', 'Indian', ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'active')`,
          [
            student_id, school_id, adm, firstName, middleName, lastName,
            formattedDob, gender, address, area, pincode, phone,
            fatherName, guardianRelation, guardianMobile || phone
          ]
        );
        existingStudentMap.set(adm.toLowerCase(), { student_id, admission_number: adm });
        importedCount++;
      }

      // Assign academic placement and ensure roll_number is explicitly set
      if (resolvedClass && resolvedSection) {
        const assignment_id = generateUUID();
        await connection.execute(
          `INSERT INTO core_student_academic_assignments
             (assignment_id, school_id, student_id, academic_year_id, class_id, section_id, roll_number, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
           ON DUPLICATE KEY UPDATE
             class_id = VALUES(class_id),
             section_id = VALUES(section_id),
             roll_number = VALUES(roll_number),
             status = 'active'`,
          [assignment_id, school_id, student_id, academic_year_id, resolvedClass.class_id, resolvedSection.section_id, rollNo]
        );
      }
    }

    await connection.commit();

    return sendSuccess(res, {
      total: students.length,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total_classes: classMap.size,
      total_sections: sectionMap.size,
    }, `Bulk import finished: ${importedCount} enrolled, ${updatedCount} updated, ${skippedCount} skipped.`);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = {
  list,
  getOne,
  create,
  update,
  deleteStudent,
  bulkDelete,
  bulkUpload,
};
