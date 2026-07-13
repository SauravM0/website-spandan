import path from 'node:path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function diagnose() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const user = await client.query(
      'SELECT password_hash, is_active FROM staff_users WHERE LOWER(email) = $1',
      [email]
    );
    const passwordMatches = user.rows[0]
      ? await bcrypt.compare(process.env.ADMIN_PASSWORD || '', user.rows[0].password_hash)
      : false;
    const tables = await client.query(
      `SELECT to_regclass('public.staff_sessions') AS staff_sessions,
              to_regclass('public.intake_invitations') AS intake_invitations`
    );
    const requiredColumns = await client.query(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (table_name, column_name) IN (
           ('patients', 'confidentiality'),
           ('patients', 'status'),
           ('packages', 'version'),
           ('packages', 'status')
         )`
    );
    console.log({
      userExists: Boolean(user.rows[0]),
      isActive: user.rows[0]?.is_active ?? null,
      passwordMatches,
      staffSessionsExists: Boolean(tables.rows[0].staff_sessions),
      intakeInvitationsExists: Boolean(tables.rows[0].intake_invitations),
      requiredColumns: requiredColumns.rows,
    });
  } finally {
    await client.end();
  }
}

diagnose().catch((error) => {
  console.error('Admin diagnosis failed:', error.code || error.message);
  process.exit(1);
});
