const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function upsertAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@spandanclinic.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const hashed = await bcrypt.hash(password, 12);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const sql = `INSERT INTO staff_users (email, password_hash, full_name, role, is_active)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true`;

  await client.query(sql, [email.toLowerCase().trim(), hashed, 'Admin', 'admin']);
  console.log('Admin upserted:', email);
  await client.end();
}

upsertAdmin().catch((err) => {
  console.error('Failed to upsert admin:', err);
  process.exit(1);
});
