import dotenv from 'dotenv';
import path from 'node:path';
import { Pool } from 'pg';
import { createDatabaseRuntimePolicy } from './config/databasePolicy';
import { runMigrations } from './migrations/runner';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function optionalPositiveInteger(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

export async function migrateMain(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required for the one-off migration job.');
  }

  const migrationPolicy = createDatabaseRuntimePolicy(process.env, 'migration');
  const pool = new Pool(migrationPolicy.poolConfig);

  try {
    const result = await runMigrations({
      pool,
      migrationsDir: path.resolve(__dirname, '../migrations'),
      legacyBaselineVersion: optionalPositiveInteger('MIGRATION_BASELINE_VERSION'),
      lockTimeoutMs: optionalPositiveInteger('MIGRATION_LOCK_TIMEOUT_MS'),
      log: console.log,
    });
    console.log(
      `Migration complete: ${result.applied.length} applied, ${result.adopted.length} adopted, ${result.alreadyApplied.length} previously recorded.`
    );
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateMain().catch((error) => {
    console.error('Migration failed:', (error as Error).message);
    process.exitCode = 1;
  });
}
