'use strict';

const { pool } = require('../config/db');
const { generateUUID } = require('../utils/helpers');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendError } = require('../utils/response');

// ─── List Academic Years ──────────────────────────────────────────────────────
const list = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const [rows] = await pool.execute(
      `SELECT academic_year_id, school_id, name, start_date, end_date, is_current, status, created_at, updated_at
       FROM core_academic_years
       WHERE school_id = ?
       ORDER BY start_date DESC`,
      [school_id]
    );
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─── Get Current Academic Year ────────────────────────────────────────────────
const getCurrent = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const [rows] = await pool.execute(
      `SELECT academic_year_id, school_id, name, start_date, end_date, is_current, status, created_at, updated_at
       FROM core_academic_years
       WHERE school_id = ? AND is_current = TRUE
       LIMIT 1`,
      [school_id]
    );
    if (rows.length === 0) {
      return sendNotFound(res, 'No active/current academic year configured for this school');
    }
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Get One Academic Year ────────────────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT * FROM core_academic_years
       WHERE academic_year_id = ? AND school_id = ?
       LIMIT 1`,
      [id, school_id]
    );
    if (rows.length === 0) return sendNotFound(res, 'Academic year not found');
    return sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── Create Academic Year ─────────────────────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { name, start_date, end_date, is_current, status } = req.body;

    if (!name || !start_date || !end_date) {
      return sendBadRequest(res, 'name, start_date, and end_date are required');
    }

    const academic_year_id = generateUUID();
    const shouldBeCurrent = is_current === true || is_current === 'true';
    const statusVal = status || (shouldBeCurrent ? 'active' : 'upcoming');

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (shouldBeCurrent) {
        // Enforce single current academic year rule transactionally
        await conn.execute(
          'UPDATE core_academic_years SET is_current = FALSE WHERE school_id = ?',
          [school_id]
        );
      }

      await conn.execute(
        `INSERT INTO core_academic_years
           (academic_year_id, school_id, name, start_date, end_date, is_current, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [academic_year_id, school_id, name, start_date, end_date, shouldBeCurrent, statusVal]
      );

      await conn.commit();
      return sendCreated(res, { academic_year_id, name, is_current: shouldBeCurrent }, 'Academic year created successfully');
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

// ─── Set as Current Academic Year ─────────────────────────────────────────────
const setCurrent = async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id } = req.params;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [check] = await conn.execute(
        'SELECT academic_year_id FROM core_academic_years WHERE academic_year_id = ? AND school_id = ?',
        [id, school_id]
      );
      if (check.length === 0) {
        await conn.rollback();
        return sendNotFound(res, 'Academic year not found');
      }

      // Deactivate all others for this school
      await conn.execute(
        'UPDATE core_academic_years SET is_current = FALSE WHERE school_id = ?',
        [school_id]
      );

      // Activate selected
      await conn.execute(
        "UPDATE core_academic_years SET is_current = TRUE, status = 'active' WHERE academic_year_id = ? AND school_id = ?",
        [id, school_id]
      );

      await conn.commit();
      return sendSuccess(res, { academic_year_id: id, is_current: true }, 'Academic year set as current');
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

module.exports = { list, getCurrent, getOne, create, setCurrent };
