'use strict';

const { pool } = require('../config/db');
const { generateUUID, parsePagination, paginationMeta } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');

// ─── List Student Academic Assignments ────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { page, limit, offset } = parsePagination(req.query);
    const { academic_year_id, class_id, section_id, status } = req.query;

    let where = 'WHERE saa.school_id = ?';
    let params = [school_id];

    if (academic_year_id) {
      where += ' AND saa.academic_year_id = ?';
      params.push(academic_year_id);
    } else {
      // Default to current academic year if none specified
      where += ' AND ay.is_current = TRUE';
    }

    if (class_id) {
      where += ' AND saa.class_id = ?';
      params.push(class_id);
    }
    if (section_id) {
      where += ' AND saa.section_id = ?';
      params.push(section_id);
    }
    if (status) {
      where += ' AND saa.status = ?';
      params.push(status);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM core_student_academic_assignments saa
       JOIN core_academic_years ay ON saa.academic_year_id = ay.academic_year_id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT saa.assignment_id, saa.student_id, saa.academic_year_id,
              saa.class_id, saa.section_id, saa.roll_number, saa.status,
              s.admission_number, s.first_name, s.last_name, s.photo_url,
              c.name as class_name, sec.name as section_name, ay.name as academic_year
       FROM core_student_academic_assignments saa
       JOIN core_students s ON saa.student_id = s.student_id
       JOIN core_academic_years ay ON saa.academic_year_id = ay.academic_year_id
       JOIN core_classes c ON saa.class_id = c.class_id
       JOIN core_sections sec ON saa.section_id = sec.section_id
       ${where}
       ORDER BY c.numeric_order ASC, sec.name ASC, saa.roll_number ASC, s.last_name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendSuccess(res, {
      assignments: rows,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Assign Student to Class/Section/Year ─────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { student_id, academic_year_id, class_id, section_id, roll_number, status } = req.body;

    if (!student_id || !academic_year_id || !class_id || !section_id) {
      return sendBadRequest(res, 'student_id, academic_year_id, class_id, and section_id are required');
    }

    // Backend cross-school validation
    const [student] = await pool.execute(
      'SELECT student_id FROM core_students WHERE student_id = ? AND school_id = ? AND deleted_at IS NULL',
      [student_id, school_id]
    );
    if (student.length === 0) return sendNotFound(res, 'Student not found in this school');

    const [year] = await pool.execute(
      'SELECT academic_year_id FROM core_academic_years WHERE academic_year_id = ? AND school_id = ?',
      [academic_year_id, school_id]
    );
    if (year.length === 0) return sendNotFound(res, 'Academic year not found in this school');

    const [cls] = await pool.execute(
      'SELECT class_id FROM core_classes WHERE class_id = ? AND school_id = ? AND deleted_at IS NULL',
      [class_id, school_id]
    );
    if (cls.length === 0) return sendNotFound(res, 'Class not found in this school');

    const [sec] = await pool.execute(
      'SELECT section_id FROM core_sections WHERE section_id = ? AND class_id = ? AND school_id = ? AND deleted_at IS NULL',
      [section_id, class_id, school_id]
    );
    if (sec.length === 0) return sendNotFound(res, 'Section not found for the selected class in this school');

    const assignment_id = generateUUID();

    await pool.execute(
      `INSERT INTO core_student_academic_assignments
         (assignment_id, school_id, student_id, academic_year_id, class_id, section_id, roll_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         class_id = VALUES(class_id),
         section_id = VALUES(section_id),
         roll_number = VALUES(roll_number),
         status = VALUES(status)`,
      [assignment_id, school_id, student_id, academic_year_id, class_id, section_id, roll_number || null, status || 'active']
    );

    return sendCreated(res, { assignment_id, student_id, academic_year_id, class_id, section_id }, 'Student assigned to class successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Bulk Assign Students to a Class/Section ──────────────────────────────────
const bulkAssign = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { academic_year_id, class_id, section_id, assignments } = req.body;

    if (!academic_year_id || !class_id || !section_id || !Array.isArray(assignments) || assignments.length === 0) {
      return sendBadRequest(res, 'academic_year_id, class_id, section_id, and an array of assignments are required');
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const item of assignments) {
        const { student_id, roll_number } = item;
        const assignment_id = generateUUID();

        await conn.execute(
          `INSERT INTO core_student_academic_assignments
             (assignment_id, school_id, student_id, academic_year_id, class_id, section_id, roll_number, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
           ON DUPLICATE KEY UPDATE
             class_id = VALUES(class_id),
             section_id = VALUES(section_id),
             roll_number = VALUES(roll_number)`,
          [assignment_id, school_id, student_id, academic_year_id, class_id, section_id, roll_number || null]
        );
      }

      await conn.commit();
      return sendSuccess(res, { count: assignments.length }, 'Students assigned successfully in bulk');
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

module.exports = { list, create, bulkAssign };
