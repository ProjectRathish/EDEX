'use strict';

const { pool } = require('../config/db');
const { generateUUID, parsePagination, paginationMeta } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');

// ─── List Staff ───────────────────────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { page, limit, offset } = parsePagination(req.query);
    const { status, search, department } = req.query;

    let where = 'WHERE s.school_id = ? AND s.deleted_at IS NULL';
    let params = [school_id];

    if (status) {
      where += ' AND s.status = ?';
      params.push(status);
    }
    if (department) {
      where += ' AND s.department = ?';
      params.push(department);
    }
    if (search) {
      where += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.employee_id LIKE ? OR s.email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM core_staff s ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT s.*
       FROM core_staff s
       ${where}
       ORDER BY s.last_name, s.first_name
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendSuccess(res, {
      staff: rows,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get One Staff (with assignments) ─────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM core_staff WHERE staff_id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, school_id]
    );
    if (rows.length === 0) return sendNotFound(res, 'Staff member not found');

    // Fetch assignments in current academic year
    const [assignments] = await pool.execute(
      `SELECT sa.assignment_id, sa.role_in_class, sa.academic_year_id,
              ay.name as academic_year, c.name as class_name, sec.name as section_name,
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
  try {
    const { school_id } = req.user;
    const {
      employee_id, first_name, last_name, designation,
      department, date_of_joining, phone, email, photo_url
    } = req.body;

    if (!employee_id || !first_name || !last_name) {
      return sendBadRequest(res, 'employee_id, first_name, and last_name are required');
    }

    const staff_id = generateUUID();

    await pool.execute(
      `INSERT INTO core_staff
         (staff_id, school_id, employee_id, first_name, last_name, designation, department, date_of_joining, phone, email, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [staff_id, school_id, employee_id, first_name, last_name, designation || null, department || null, date_of_joining || null, phone || null, email || null, photo_url || null]
    );

    return sendCreated(res, { staff_id, employee_id, first_name, last_name }, 'Staff member created successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Update Staff ─────────────────────────────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    const {
      first_name, last_name, designation, department,
      date_of_joining, phone, email, photo_url, status
    } = req.body;

    const [existing] = await pool.execute(
      'SELECT staff_id FROM core_staff WHERE staff_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, school_id]
    );
    if (existing.length === 0) return sendNotFound(res, 'Staff member not found');

    await pool.execute(
      `UPDATE core_staff
       SET first_name=?, last_name=?, designation=?, department=?, date_of_joining=?, phone=?, email=?, photo_url=?, status=?
       WHERE staff_id = ? AND school_id = ?`,
      [first_name, last_name, designation || null, department || null, date_of_joining || null, phone || null, email || null, photo_url || null, status || 'active', id, school_id]
    );

    return sendSuccess(res, { staff_id: id }, 'Staff member updated successfully');
  } catch (err) {
    next(err);
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
    if (staffCheck.length === 0) return sendNotFound(res, 'Staff not found');

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
         (assignment_id, school_id, staff_id, academic_year_id, class_id, section_id, role_in_class)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [assignment_id, school_id, id, academic_year_id, class_id || null, section_id || null, role_in_class || null]
    );

    return sendCreated(res, { assignment_id, staff_id: id, academic_year_id }, 'Staff assignment created successfully');
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

module.exports = { list, getOne, create, update, createAssignment, deleteAssignment };
