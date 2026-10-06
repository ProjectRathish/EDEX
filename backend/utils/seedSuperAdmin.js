'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateUUID } = require('./helpers');

async function seedAdmin() {
  try {
    const username = 'superadmin';
    const password = 'AdminPassword123!';
    const email = 'admin@edex.internal';

    const [existing] = await pool.execute(
      'SELECT user_id FROM core_users WHERE username = ? LIMIT 1',
      [username]
    );

    if (existing.length > 0) {
      console.log(`ℹ️  Superadmin already exists (user_id: ${existing[0].user_id})`);
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user_id = generateUUID();

    // Get super_admin role_id
    const [roles] = await pool.execute(
      "SELECT role_id FROM core_roles WHERE name = 'super_admin' AND school_id IS NULL LIMIT 1"
    );

    if (roles.length === 0) {
      console.error("❌ 'super_admin' role not found. Run seeds/001_core_system_seed.sql first.");
      process.exit(1);
    }

    const role_id = roles[0].role_id;

    // Insert user (school_id = NULL for super_admin)
    await pool.execute(
      `INSERT INTO core_users (user_id, school_id, username, email, password_hash, is_active)
       VALUES (?, NULL, ?, ?, ?, TRUE)`,
      [user_id, username, email, password_hash]
    );

    // Assign role (school_id = NULL)
    await pool.execute(
      `INSERT INTO core_user_roles (user_role_id, user_id, role_id, school_id)
       VALUES (?, ?, ?, NULL)`,
      [generateUUID(), user_id, role_id]
    );

    console.log('✅ Superadmin created successfully!');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email   : ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed superadmin:', err.message);
    process.exit(1);
  }
}

seedAdmin();
