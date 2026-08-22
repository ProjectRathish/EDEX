'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  console.log('🚀  Starting SAARTHI Database Setup...');

  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = parseInt(process.env.DB_PORT) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'saarthi_db';

  let connection;
  try {
    // 1. Connect to MySQL server without selecting DB
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      multipleStatements: true,
    });
    console.log(`✅  Connected to MySQL at ${dbHost}:${dbPort}`);

    // 2. Create Database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅  Database "${dbName}" checked/created.`);
    await connection.changeUser({ database: dbName });

    // 3. Execute Migrations (001 to 020)
    const migrationsDir = path.join(__dirname, '../database/migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
      console.log(`📦  Executing ${files.length} migration scripts...`);
      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        try {
          await connection.query(sql);
          console.log(`   ✓ Applied: ${file}`);
        } catch (mErr) {
          if (mErr.code === 'ER_TABLE_EXISTS_ERROR' || mErr.code === 'ER_DUP_KEYNAME') {
            console.log(`   ℹ Already present: ${file}`);
          } else {
            console.warn(`   ⚠ Note on ${file}: ${mErr.message}`);
          }
        }
      }
    }

    // 4. Execute System Seed (001_core_system_seed.sql)
    const seed1Path = path.join(__dirname, '../database/seeds/001_core_system_seed.sql');
    if (fs.existsSync(seed1Path)) {
      const sql1 = fs.readFileSync(seed1Path, 'utf-8');
      try {
        await connection.query(sql1);
        console.log(`   ✓ Applied system seed: 001_core_system_seed.sql`);
      } catch (sErr) {
        console.warn(`   ⚠ Note on seed1: ${sErr.message}`);
      }
    }

    // 5. Seed Super Admin & Default School Admin with exact bcrypt hashes
    const superAdminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
    const principalPasswordHash = await bcrypt.hash('PrincipalPass123!', 10);

    // Upsert superadmin
    await connection.query(`
      INSERT INTO core_users (user_id, school_id, username, email, phone, password_hash, is_active)
      VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'superadmin', 'superadmin@saarthi.platform', '+919999900000', ?, TRUE)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = TRUE;
    `, [superAdminPasswordHash]);

    // Map superadmin role
    await connection.query(`
      INSERT IGNORE INTO core_user_roles (user_role_id, user_id, role_id, school_id)
      SELECT '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', r.role_id, NULL
      FROM core_roles r WHERE r.name = 'super_admin' AND r.school_id IS NULL LIMIT 1;
    `);

    // Upsert default school: Delhi Public School
    let dpsSchoolId = '11111111-1111-1111-1111-111111111111';
    const [existingSchool] = await connection.query(`SELECT school_id FROM core_schools WHERE code = 'DPS-DELHI' LIMIT 1;`);
    if (existingSchool.length > 0) {
      dpsSchoolId = existingSchool[0].school_id;
    } else {
      await connection.query(`
        INSERT INTO core_schools (school_id, name, code, address, city, state, country, phone, email, timezone, is_active)
        VALUES (?, 'Delhi Public School', 'DPS-DELHI', 'Sector 12, R.K. Puram', 'New Delhi', 'Delhi', 'India', '+911126170051', 'info@dpsrkp.net', 'Asia/Kolkata', TRUE);
      `, [dpsSchoolId]);
    }

    // Modules for DPS
    const modules = ['id_card', 'voting', 'bus', 'canteen'];
    for (const mod of modules) {
      await connection.query(`
        INSERT IGNORE INTO core_school_modules (school_module_id, school_id, module_name, is_enabled)
        VALUES (UUID(), ?, ?, TRUE);
      `, [dpsSchoolId, mod]);
    }

    // Academic Year for DPS
    await connection.query(`
      INSERT IGNORE INTO core_academic_years (academic_year_id, school_id, name, start_date, end_date, is_current)
      VALUES (UUID(), ?, '2025-2026', '2025-04-01', '2026-03-31', TRUE);
    `, [dpsSchoolId]);

    // Upsert principal_dps
    const [existingUser] = await connection.query(`SELECT user_id FROM core_users WHERE username = 'principal_dps' LIMIT 1;`);
    let principalUserId = '33333333-3333-3333-3333-333333333333';
    if (existingUser.length > 0) {
      principalUserId = existingUser[0].user_id;
      await connection.query(`
        UPDATE core_users
        SET password_hash = ?, school_id = ?, is_active = TRUE
        WHERE user_id = ?;
      `, [principalPasswordHash, dpsSchoolId, principalUserId]);
    } else {
      await connection.query(`
        INSERT INTO core_users (user_id, school_id, username, email, phone, password_hash, is_active)
        VALUES (?, ?, 'principal_dps', 'principal@dpsrkp.net', '+919811122233', ?, TRUE);
      `, [principalUserId, dpsSchoolId, principalPasswordHash]);
    }

    // Map school_admin role to principal_dps
    await connection.query(`
      INSERT IGNORE INTO core_user_roles (user_role_id, user_id, role_id, school_id)
      SELECT UUID(), ?, r.role_id, ?
      FROM core_roles r WHERE r.name = 'school_admin' AND r.school_id IS NULL LIMIT 1;
    `, [principalUserId, dpsSchoolId]);

    console.log('\n🎉  Database setup & initial credentials successfully seeded!');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('👑  Super Admin : School Code: SYSTEM    | Username: superadmin    | Password: AdminPassword123!');
    console.log('🏫  School Admin: School Code: DPS-DELHI | Username: principal_dps | Password: PrincipalPass123!');
    console.log('─────────────────────────────────────────────────────────────\n');

  } catch (err) {
    console.error('\n❌  Setup Error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error(`👉  Cannot connect to MySQL on ${dbHost}:${dbPort}. Please verify that MySQL server is running (e.g. via XAMPP, MySQL Service, or Docker).`);
    }
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();
