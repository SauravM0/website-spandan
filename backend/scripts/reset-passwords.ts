import bcrypt from 'bcryptjs';
import { pool } from '../src/config/database';

async function reset() {
  await pool.query("DELETE FROM staff_users WHERE email IN ($1, $2)", ['admin@spandanclinic.com', 'staff@spandanclinic.com']);
  console.log('Deleted existing users');

  const adminHash = await bcrypt.hash('Admin@123', 12);
  await pool.query(
    "INSERT INTO staff_users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
    ['admin@spandanclinic.com', adminHash, 'Admin', 'admin']
  );
  console.log('Created admin user (admin@spandanclinic.com / Admin@123)');

  const staffHash = await bcrypt.hash('staff123', 12);
  await pool.query(
    "INSERT INTO staff_users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
    ['staff@spandanclinic.com', staffHash, 'Staff Member', 'staff']
  );
  console.log('Created staff user (staff@spandanclinic.com / staff123)');

  await pool.end();
}

reset().catch(err => { console.error(err); process.exit(1); });
