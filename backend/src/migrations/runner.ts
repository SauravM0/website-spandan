import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';

export const MIGRATION_ADVISORY_LOCK_ID = 781_542_991;

export type MigrationFile = {
  version: number;
  filename: string;
  checksum: string;
  sql: string;
};

export type MigrationLedgerRow = {
  version: number;
  filename: string;
  checksum: string;
  duration_ms: number;
  execution_mode: 'applied' | 'adopted';
  applied_at: Date;
};

export type MigrationRunOptions = {
  pool: Pool;
  migrationsDir: string;
  legacyBaselineVersion?: number;
  lockTimeoutMs?: number;
  log?: (message: string) => void;
};

export type MigrationRunResult = {
  applied: number[];
  adopted: number[];
  alreadyApplied: number[];
};

const LEDGER_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY CHECK (version > 0),
    checksum TEXT NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
    filename TEXT NOT NULL UNIQUE,
    duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
    execution_mode TEXT NOT NULL DEFAULT 'applied' CHECK (execution_mode IN ('applied', 'adopted')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE OR REPLACE FUNCTION prevent_schema_migrations_mutation()
  RETURNS trigger AS $$
  BEGIN
    RAISE EXCEPTION 'schema_migrations is append-only';
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS schema_migrations_append_only ON schema_migrations;
  CREATE TRIGGER schema_migrations_append_only
    BEFORE UPDATE OR DELETE OR TRUNCATE ON schema_migrations
    FOR EACH STATEMENT EXECUTE FUNCTION prevent_schema_migrations_mutation();
`;

export function checksumSql(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

export function discoverMigrations(migrationsDir: string): MigrationFile[] {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  if (!files.length) throw new Error('No migration files found.');

  const migrations = files.map((filename) => {
    const match = filename.match(/^(\d{3})_[a-z0-9][a-z0-9_-]*\.sql$/);
    if (!match) {
      throw new Error(
        `${filename}: migration filename must use a three-digit version and lowercase slug.`
      );
    }
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
    if (!sql.trim()) throw new Error(`${filename}: migration is empty.`);
    return {
      version: Number(match[1]),
      filename,
      checksum: checksumSql(sql),
      sql,
    };
  });

  for (let index = 0; index < migrations.length; index += 1) {
    const expected = index + 1;
    if (migrations[index].version !== expected) {
      throw new Error(
        `${migrations[index].filename}: expected migration version ${String(expected).padStart(3, '0')}.`
      );
    }
  }

  return migrations;
}

export function validateMigrationHistory(
  migrations: MigrationFile[],
  ledger: MigrationLedgerRow[]
): MigrationFile[] {
  const byVersion = new Map(migrations.map((migration) => [migration.version, migration]));
  const orderedLedger = [...ledger].sort((left, right) => left.version - right.version);

  orderedLedger.forEach((row, index) => {
    const expectedVersion = index + 1;
    if (row.version !== expectedVersion) {
      throw new Error(`Migration ledger is not contiguous at version ${row.version}.`);
    }
    const migration = byVersion.get(row.version);
    if (!migration) {
      throw new Error(`Applied migration ${row.version} no longer exists in the repository.`);
    }
    if (migration.filename !== row.filename) {
      throw new Error(
        `Applied migration ${row.version} filename changed from ${row.filename} to ${migration.filename}.`
      );
    }
    if (migration.checksum !== row.checksum) {
      throw new Error(`Applied migration ${migration.filename} checksum has changed.`);
    }
  });

  return migrations.filter((migration) => migration.version > orderedLedger.length);
}

async function ensureLedger(client: PoolClient): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(LEDGER_SQL);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function readLedger(client: PoolClient): Promise<MigrationLedgerRow[]> {
  const result = await client.query<MigrationLedgerRow>(
    `SELECT version, filename, checksum, duration_ms, execution_mode, applied_at
     FROM schema_migrations
     ORDER BY version`
  );
  return result.rows;
}

async function hasLegacySchema(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_class relation
       JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
       WHERE namespace.nspname = 'public'
         AND relation.relkind IN ('r', 'p', 'v', 'm')
         AND relation.relname <> 'schema_migrations'
     ) AS exists`
  );
  return result.rows[0]?.exists === true;
}

async function verifyLegacyBaseline(client: PoolClient, version: number): Promise<void> {
  if (version !== 31) {
    throw new Error('Only the reviewed legacy baseline version 31 may be adopted.');
  }

  const requiredRelations = [
    'staff_users',
    'patients',
    'appointments',
    'payments',
    'package_orders',
    'diagnostic_tests',
    'custom_test_order_items',
  ];
  const relations = await client.query<{ relation: string }>(
    `SELECT required.relation
     FROM unnest($1::text[]) AS required(relation)
     WHERE to_regclass('public.' || required.relation) IS NOT NULL`,
    [requiredRelations]
  );
  if (relations.rowCount !== requiredRelations.length) {
    throw new Error('Legacy schema does not match the reviewed version 31 relation fingerprint.');
  }

  const constraints = await client.query<{ conname: string }>(
    `SELECT conname FROM pg_constraint
     WHERE conname = ANY($1::text[])`,
    [['appointments_booking_state_valid', 'appointments_fee_snapshot_valid']]
  );
  if (constraints.rowCount !== 2) {
    throw new Error('Legacy schema does not match the reviewed version 31 constraint fingerprint.');
  }

  const catalog = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM diagnostic_tests WHERE source_number BETWEEN 1 AND 110'
  );
  if (Number(catalog.rows[0]?.count) < 110) {
    throw new Error('Legacy schema does not contain the reviewed diagnostic catalogue baseline.');
  }
}

async function adoptLegacyBaseline(
  client: PoolClient,
  migrations: MigrationFile[],
  version: number
): Promise<number[]> {
  const baseline = migrations.filter((migration) => migration.version <= version);
  if (baseline.length !== version) {
    throw new Error(
      `Legacy baseline ${version} is not fully represented by repository migrations.`
    );
  }

  await client.query('BEGIN');
  try {
    await verifyLegacyBaseline(client, version);
    for (const migration of baseline) {
      await client.query(
        `INSERT INTO schema_migrations
           (version, filename, checksum, duration_ms, execution_mode)
         VALUES ($1, $2, $3, 0, 'adopted')`,
        [migration.version, migration.filename, migration.checksum]
      );
    }
    await client.query('COMMIT');
    return baseline.map((migration) => migration.version);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function applyMigration(client: PoolClient, migration: MigrationFile): Promise<void> {
  const startedAt = Date.now();
  await client.query('BEGIN');
  try {
    await client.query(migration.sql);
    const durationMs = Math.max(0, Date.now() - startedAt);
    await client.query(
      `INSERT INTO schema_migrations
         (version, filename, checksum, duration_ms, execution_mode)
       VALUES ($1, $2, $3, $4, 'applied')`,
      [migration.version, migration.filename, migration.checksum, durationMs]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function runMigrations(options: MigrationRunOptions): Promise<MigrationRunResult> {
  const migrations = discoverMigrations(options.migrationsDir);
  const client = await options.pool.connect();
  const log = options.log || (() => undefined);
  const lockTimeoutMs = Math.max(1_000, options.lockTimeoutMs || 120_000);
  let lockAcquired = false;

  try {
    await client.query("SELECT set_config('statement_timeout', $1, false)", [`${lockTimeoutMs}ms`]);
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_ADVISORY_LOCK_ID]);
    lockAcquired = true;
    await client.query("SELECT set_config('statement_timeout', '0', false)");

    await ensureLedger(client);
    let ledger = await readLedger(client);
    let adopted: number[] = [];

    if (!ledger.length && (await hasLegacySchema(client))) {
      if (!options.legacyBaselineVersion) {
        throw new Error(
          'Existing schema has no migration ledger. Set MIGRATION_BASELINE_VERSION=31 only after reviewed baseline verification.'
        );
      }
      adopted = await adoptLegacyBaseline(client, migrations, options.legacyBaselineVersion);
      ledger = await readLedger(client);
      log(`Adopted reviewed legacy baseline through migration ${options.legacyBaselineVersion}.`);
    }

    const pending = validateMigrationHistory(migrations, ledger);
    const applied: number[] = [];
    for (const migration of pending) {
      log(`Applying ${migration.filename}`);
      await applyMigration(client, migration);
      applied.push(migration.version);
    }

    return {
      applied,
      adopted,
      alreadyApplied: ledger.map((row) => row.version),
    };
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_ADVISORY_LOCK_ID]);
    }
    client.release();
  }
}
