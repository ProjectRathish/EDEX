'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a new UUID v4.
 * Use this everywhere a new primary key is needed before INSERT.
 */
const generateUUID = () => uuidv4();

/**
 * Validate that a string looks like a UUID v4.
 */
const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Parse pagination parameters from query string.
 * Returns { page, limit, offset }
 */
const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build a pagination meta object for responses.
 */
const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext    : page * limit < total,
  hasPrev    : page > 1,
});

/**
 * Generate a unique school code with format SSA + 4-digit unique number (e.g. SSA0001, SSA0002).
 * Inspects existing codes in core_schools and returns the next guaranteed unique code.
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} db
 * @returns {Promise<string>}
 */
const generateSchoolCode = async (db) => {
  const [rows] = await db.execute(
    "SELECT code FROM core_schools WHERE code REGEXP '^SSA[0-9]{4}$'"
  );

  let maxNum = 0;
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const numPart = parseInt(row.code.substring(3), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidateCode = `SSA${String(nextNum).padStart(4, '0')}`;

  while (true) {
    const [existing] = await db.execute(
      'SELECT school_id FROM core_schools WHERE code = ? LIMIT 1',
      [candidateCode]
    );
    if (existing.length === 0) {
      break;
    }
    nextNum++;
    candidateCode = `SSA${String(nextNum).padStart(4, '0')}`;
  }

  return candidateCode;
};

module.exports = {
  generateUUID,
  isValidUUID,
  parsePagination,
  paginationMeta,
  generateSchoolCode,
};
