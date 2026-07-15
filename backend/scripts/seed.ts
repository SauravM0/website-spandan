import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { pool } from '../src/config/database';

async function seed() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || password.length < 14) {
    throw new Error('ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 14 characters are required');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hashed = await bcrypt.hash(password, 12);

    await client.query(
      `INSERT INTO staff_users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [email, hashed, 'Admin', 'admin']
    );
    console.log(`✓ Admin user seeded: ${email}`);

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
