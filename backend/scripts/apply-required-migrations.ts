import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const requiredMigrations = [
  '019_remote_intake_links.sql',
  '026_privacy_security_program.sql',
];

async function applyRequiredMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const file of requiredMigrations) {
      const sql = fs.readFileSync(path.resolve(__dirname, '../migrations', file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    const verification = await pool.query(
      `SELECT to_regclass('public.staff_sessions') AS staff_sessions,
              to_regclass('public.intake_invitations') AS intake_invitations`
    );
    console.log({
      staffSessionsExists: Boolean(verification.rows[0].staff_sessions),
      intakeInvitationsExists: Boolean(verification.rows[0].intake_invitations),
    });
  } finally {
    await pool.end();
  }
}

applyRequiredMigrations().catch((error) => {
  console.error('Required migration failed:', error.message);
  process.exit(1);
});
