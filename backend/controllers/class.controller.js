'use strict';

const { pool } = require('../config/db');
const { generateUUID } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/response');

// ─── List Classes (with optional nested sections) ─────────────────────────────
const listClasses = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const includeSections = req.query.include_sections === 'true' || req.query.include_sections === '1';

    const [classes] = await pool.execute(
      `SELECT class_id, school_id, name, numeric_order, created_at, updated_at
       FROM core_classes
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY numeric_order ASC, name ASC`,
      [school_id]
    );

    if (!includeSections || classes.length === 0) {
      return sendSuccess(res, classes);
    }

    // Fetch sections for all classes in this school
    const [sections] = await pool.execute(
      `SELECT section_id, school_id, class_id, name, max_strength, created_at, updated_at
       FROM core_sections
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY name ASC`,
      [school_id]
    );

    const sectionMap = {};
    sections.forEach((sec) => {
      if (!sectionMap[sec.class_id]) sectionMap[sec.class_id] = [];
      sectionMap[sec.class_id].push(sec);
    });

    const result = classes.map((c) => ({
      ...c,
      sections: sectionMap[c.class_id] || [],
    }));

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Class ─────────────────────────────────────────────────────────
const getClass = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM core_classes
       WHERE class_id = ? AND school_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id, school_id]
    );

    if (rows.length === 0) return sendNotFound(res, 'Class not found');

    const [sections] = await pool.execute(
      `SELECT section_id, class_id, name, max_strength
       FROM core_sections
       WHERE class_id = ? AND school_id = ? AND deleted_at IS NULL
       ORDER BY name ASC`,
      [id, school_id]
    );

    return sendSuccess(res, { ...rows[0], sections });
  } catch (err) {
    next(err);
  }
};

// ─── Create Class ─────────────────────────────────────────────────────────────
const createClass = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { name, numeric_order } = req.body;

    if (!name || numeric_order === undefined) {
      return sendBadRequest(res, 'name and numeric_order are required');
    }

    const class_id = generateUUID();

    await pool.execute(
      `INSERT INTO core_classes (class_id, school_id, name, numeric_order)
       VALUES (?, ?, ?, ?)`,
      [class_id, school_id, name, parseInt(numeric_order)]
    );

    return sendCreated(res, { class_id, name, numeric_order }, 'Class created successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Update Class ─────────────────────────────────────────────────────────────
const updateClass = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;
    const { name, numeric_order } = req.body;

    const [existing] = await pool.execute(
      'SELECT class_id FROM core_classes WHERE class_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, school_id]
    );
    if (existing.length === 0) return sendNotFound(res, 'Class not found');

    await pool.execute(
      'UPDATE core_classes SET name = ?, numeric_order = ? WHERE class_id = ? AND school_id = ?',
      [name, parseInt(numeric_order), id, school_id]
    );

    return sendSuccess(res, { class_id: id }, 'Class updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── List Sections for a Class ────────────────────────────────────────────────
const listSections = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { classId } = req.params;

    const [rows] = await pool.execute(
      `SELECT section_id, school_id, class_id, name, max_strength, created_at, updated_at
       FROM core_sections
       WHERE class_id = ? AND school_id = ? AND deleted_at IS NULL
       ORDER BY name ASC`,
      [classId, school_id]
    );

    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─── Create Section in a Class ────────────────────────────────────────────────
const createSection = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { classId } = req.params;
    const { name, max_strength } = req.body;

    if (!name) return sendBadRequest(res, 'name is required');

    // Verify class belongs to same school
    const [cls] = await pool.execute(
      'SELECT class_id FROM core_classes WHERE class_id = ? AND school_id = ? AND deleted_at IS NULL',
      [classId, school_id]
    );
    if (cls.length === 0) return sendNotFound(res, 'Class not found in this school');

    const section_id = generateUUID();

    await pool.execute(
      `INSERT INTO core_sections (section_id, school_id, class_id, name, max_strength)
       VALUES (?, ?, ?, ?, ?)`,
      [section_id, school_id, classId, name, max_strength ? parseInt(max_strength) : null]
    );

    return sendCreated(res, { section_id, class_id: classId, name }, 'Section created successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Update Section ───────────────────────────────────────────────────────────
const updateSection = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { sectionId } = req.params;
    const { name, max_strength } = req.body;

    const [existing] = await pool.execute(
      'SELECT section_id FROM core_sections WHERE section_id = ? AND school_id = ? AND deleted_at IS NULL',
      [sectionId, school_id]
    );
    if (existing.length === 0) return sendNotFound(res, 'Section not found');

    await pool.execute(
      'UPDATE core_sections SET name = ?, max_strength = ? WHERE section_id = ? AND school_id = ?',
      [name, max_strength ? parseInt(max_strength) : null, sectionId, school_id]
    );

    return sendSuccess(res, { section_id: sectionId }, 'Section updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Delete Class ─────────────────────────────────────────────────────────────
const deleteClass = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const [existing] = await pool.execute(
      'SELECT class_id FROM core_classes WHERE class_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, school_id]
    );
    if (existing.length === 0) return sendNotFound(res, 'Class not found');

    // Soft delete sections in class
    await pool.execute(
      'UPDATE core_sections SET deleted_at = NOW() WHERE class_id = ? AND school_id = ? AND deleted_at IS NULL',
      [id, school_id]
    );

    // Soft delete class
    await pool.execute(
      'UPDATE core_classes SET deleted_at = NOW() WHERE class_id = ? AND school_id = ?',
      [id, school_id]
    );

    return sendSuccess(res, { class_id: id }, 'Class and its sections deleted successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Delete Section ───────────────────────────────────────────────────────────
const deleteSection = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { sectionId } = req.params;

    const [existing] = await pool.execute(
      'SELECT section_id FROM core_sections WHERE section_id = ? AND school_id = ? AND deleted_at IS NULL',
      [sectionId, school_id]
    );
    if (existing.length === 0) return sendNotFound(res, 'Section not found');

    await pool.execute(
      'UPDATE core_sections SET deleted_at = NOW() WHERE section_id = ? AND school_id = ?',
      [sectionId, school_id]
    );

    return sendSuccess(res, { section_id: sectionId }, 'Section deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  listSections,
  createSection,
  updateSection,
  deleteSection,
};
