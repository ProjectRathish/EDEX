'use strict';

const { pool } = require('../config/db');
const { generateUUID, parsePagination, paginationMeta } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');

// ─── List Guardians ───────────────────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { page, limit, offset } = parsePagination(req.query);
    const { search } = req.query;

    let where = 'WHERE g.school_id = ? AND g.deleted_at IS NULL';
    let params = [school_id];

    if (search) {
      where += ' AND (g.first_name LIKE ? OR g.last_name LIKE ? OR g.phone LIKE ? OR g.email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM core_guardians g ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT g.*
       FROM core_guardians g
       ${where}
       ORDER BY g.last_name, g.first_name
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendSuccess(res, {
      guardians: rows,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get One Guardian (with linked students) ──────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM core_guardians WHERE guardian_id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, school_id]
    );
    if (rows.length === 0) return sendNotFound(res, 'Guardian not found');

    // Fetch linked students
    const [students] = await pool.execute(
      `SELECT s.student_id, s.admission_number, s.first_name, s.last_name,
              sg.student_guardian_id, sg.is_primary_contact, sg.is_emergency_contact, sg.can_pickup
       FROM core_student_guardians sg
       JOIN core_students s ON sg.student_id = s.student_id
       WHERE sg.guardian_id = ? AND sg.school_id = ? AND s.deleted_at IS NULL`,
      [id, school_id]
    );

    return sendSuccess(res, { ...rows[0], students });
  } catch (err) {
    next(err);
  }
};

// ─── Create Guardian ──────────────────────────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { first_name, last_name, relationship_type, phone, email, address, occupation, photo_url } = req.body;

    if (!first_name || !last_name || !relationship_type) {
      return sendBadRequest(res, 'first_name, last_name, and relationship_type are required');
    }

    const guardian_id = generateUUID();

    await pool.execute(
      `INSERT INTO core_guardians
         (guardian_id, school_id, first_name, last_name, relationship_type, phone, email, address, occupation, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [guardian_id, school_id, first_name, last_name, relationship_type, phone || null, email || null, address || null, occupation || null, photo_url || null]
    );

    return sendCreated(res, { guardian_id, first_name, last_name }, 'Guardian created successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Update Guardian ──────────────────────────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    const { first_name, last_name, relationship_type, phone, email, address, occupation, photo_url, is_active } = req.body;

    const [existing] = await pool.execute(
      'SELECT guardian_id FROM core_guardians WHERE guardian_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, school_id]
    );
    if (existing.length === 0) return sendNotFound(res, 'Guardian not found');

    await pool.execute(
      `UPDATE core_guardians
       SET first_name=?, last_name=?, relationship_type=?, phone=?, email=?, address=?, occupation=?, photo_url=?, is_active=?
       WHERE guardian_id = ? AND school_id = ?`,
      [first_name, last_name, relationship_type, phone || null, email || null, address || null, occupation || null, photo_url || null, is_active !== undefined ? is_active : true, id, school_id]
    );

    return sendSuccess(res, { guardian_id: id }, 'Guardian updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Link Student to Guardian ─────────────────────────────────────────────────
const linkStudent = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params; // guardian_id
    const { student_id, is_primary_contact, is_emergency_contact, can_pickup } = req.body;

    if (!student_id) return sendBadRequest(res, 'student_id is required');

    // Cross-school validation
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

// ─── Unlink Student from Guardian ─────────────────────────────────────────────
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

module.exports = { list, getOne, create, update, linkStudent, unlinkStudent };
