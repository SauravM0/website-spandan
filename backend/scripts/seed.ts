import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { pool } from '../src/config/database';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const email = process.env.ADMIN_EMAIL || 'admin@spandanclinic.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hashed = await bcrypt.hash(password, 12);

    await client.query(
      `INSERT INTO staff_users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [email, hashed, 'Admin', 'admin']
    );
    console.log(`✓ Admin user seeded: ${email}`);

    const staffEmail = process.env.STAFF_EMAIL || 'staff@spandanclinic.com';
    const staffPass = process.env.STAFF_PASSWORD || 'staff123';
    const staffHashed = await bcrypt.hash(staffPass, 12);

    await client.query(
      `INSERT INTO staff_users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [staffEmail, staffHashed, 'Staff Member', 'staff']
    );
    console.log(`✓ Staff user seeded: ${staffEmail}`);

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
