const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function upsertAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || password.length < 14) {
    throw new Error('ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 14 characters are required');
  }

  const hashed = await bcrypt.hash(password, 12);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const sql = `INSERT INTO staff_users (email, password_hash, full_name, role, is_active)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true`;

  await client.query(sql, [email, hashed, 'Admin', 'admin']);
  console.log('Admin upserted:', email);
  await client.end();
}

upsertAdmin().catch((err) => {
  console.error('Failed to upsert admin:', err);
  process.exit(1);
});
