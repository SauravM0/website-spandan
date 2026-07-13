import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const file = process.argv[2];
if (!file || !/^\d{3}_[a-z0-9_]+\.sql$/.test(file)) {
  throw new Error('Provide one migration filename, for example 027_doctor_calendar_slot_control.sql');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from backend/.env');
}

const migrationPath = path.resolve(__dirname, '../migrations', file);
const migrationsDir = path.resolve(__dirname, '../migrations');
if (path.dirname(migrationPath) !== migrationsDir || !fs.existsSync(migrationPath)) {
  throw new Error(`Migration not found: ${file}`);
}

async function applySingleMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const preflight = await client.query(
      `SELECT current_database() AS database_name,
              to_regclass('public.calendar_exceptions') AS calendar_exceptions,
              to_regclass('public.doctor_schedule_versions') AS doctor_schedule_versions,
              to_regclass('public.schedule_conflict_cases') AS schedule_conflict_cases`
    );
    const state = preflight.rows[0];
    if (!state.calendar_exceptions || !state.doctor_schedule_versions || !state.schedule_conflict_cases) {
      throw new Error('Required earlier calendar migrations are missing; migration 027 was not applied');
    }

    await client.query('BEGIN');
    try {
      await client.query(fs.readFileSync(migrationPath, 'utf8'));
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    const verification = await client.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'calendar_exceptions'
             AND column_name = 'slot_minutes'
             AND data_type = 'integer'
         ) AS slot_minutes_exists,
         EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'calendar_exceptions_slot_minutes_check'
             AND conrelid = 'public.calendar_exceptions'::regclass
         ) AS slot_constraint_exists`
    );
    const verified = verification.rows[0];
    if (!verified.slot_minutes_exists || !verified.slot_constraint_exists) {
      throw new Error('Migration ran but verification failed');
    }

    console.log(`Connected to database: ${state.database_name}`);
    console.log(`Applied migration: ${file}`);
    console.log('Verified: calendar_exceptions.slot_minutes integer column');
    console.log('Verified: calendar_exceptions_slot_minutes_check constraint');
  } finally {
    client.release();
    await pool.end();
  }
}

applySingleMigration().catch((error) => {
  console.error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
