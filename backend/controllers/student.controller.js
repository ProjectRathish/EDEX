'use strict';

const { pool }      = require('../config/db');
const { generateUUID, parsePagination, paginationMeta } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');

// ─── List Students ────────────────────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { page, limit, offset } = parsePagination(req.query);
    const { status, search } = req.query;

    let where  = 'WHERE s.school_id = ? AND s.deleted_at IS NULL';
    let params = [school_id];

    if (status) {
      where  += ' AND s.status = ?';
      params.push(status);
    }

    if (search) {
      where  += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM core_students s ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT s.student_id, s.admission_number,
              s.first_name, s.middle_name, s.last_name,
              s.date_of_birth, s.gender, s.blood_group,
              s.photo_url, s.admission_date, s.status,
              saa.class_id, saa.section_id, saa.roll_number,
              c.name AS class_name, sec.name AS section_name
       FROM core_students s
       LEFT JOIN core_academic_years ay
         ON ay.school_id = s.school_id AND ay.is_current = TRUE
       LEFT JOIN core_student_academic_assignments saa
         ON saa.student_id = s.student_id AND saa.academic_year_id = ay.academic_year_id
       LEFT JOIN core_classes c   ON c.class_id   = saa.class_id
       LEFT JOIN core_sections sec ON sec.section_id = saa.section_id
       ${where}
       ORDER BY s.last_name, s.first_name
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendSuccess(res, {
      students: rows,
      pagination: paginationMeta(total, page, limit),
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
              saa.class_id, saa.section_id, saa.roll_number, saa.status AS assignment_status,
              c.name AS class_name, sec.name AS section_name,
              ay.name AS academic_year
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
  try {
    const { school_id } = req.user;
    const {
      admission_number, first_name, last_name, middle_name,
      date_of_birth, gender, blood_group, nationality,
      admission_date, photo_url,
    } = req.body;

    if (!admission_number || !first_name || !last_name || !date_of_birth || !gender || !admission_date) {
      return sendBadRequest(res, 'admission_number, first_name, last_name, date_of_birth, gender, admission_date are required');
    }

    const student_id = generateUUID();

    await pool.execute(
      `INSERT INTO core_students
         (student_id, school_id, admission_number, first_name, middle_name, last_name,
          date_of_birth, gender, blood_group, nationality, photo_url, admission_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, school_id, admission_number, first_name, middle_name || null,
       last_name, date_of_birth, gender, blood_group || null,
       nationality || 'Indian', photo_url || null, admission_date]
    );

    return sendCreated(res, { student_id, admission_number, first_name, last_name },
      'Student enrolled successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Update Student ───────────────────────────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const [existing] = await pool.execute(
      'SELECT student_id FROM core_students WHERE student_id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, school_id]
    );
    if (existing.length === 0) return sendNotFound(res, 'Student not found');

    const {
      first_name, middle_name, last_name, date_of_birth, gender,
      blood_group, nationality, photo_url, status,
    } = req.body;

    await pool.execute(
      `UPDATE core_students
       SET first_name=?, middle_name=?, last_name=?, date_of_birth=?,
           gender=?, blood_group=?, nationality=?, photo_url=?, status=?
       WHERE student_id = ? AND school_id = ?`,
      [first_name, middle_name || null, last_name, date_of_birth,
       gender, blood_group || null, nationality || 'Indian',
       photo_url || null, status || 'active', id, school_id]
    );

    return sendSuccess(res, { student_id: id }, 'Student updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update };
