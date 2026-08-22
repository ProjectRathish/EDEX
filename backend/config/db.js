'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

// ─── Connection Pool ──────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host              : process.env.DB_HOST     || '127.0.0.1',
  port              : parseInt(process.env.DB_PORT) || 3306,
  user              : process.env.DB_USER     || 'root',
  password          : process.env.DB_PASSWORD || '',
  database          : process.env.DB_NAME     || 'saarthi_db',
  connectionLimit   : parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  charset           : 'utf8mb4',
  timezone          : '+00:00',         // store UTC — convert at app layer
  waitForConnections: true,
  queueLimit        : 0,
  enableKeepAlive   : true,
  keepAliveInitialDelay: 0,
});

// ─── Test Connection on Startup ───────────────────────────────────────────────
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`✅  MySQL connected → ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    conn.release();
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);   // Cannot start without a database
  }
}

module.exports = { pool, testConnection };
