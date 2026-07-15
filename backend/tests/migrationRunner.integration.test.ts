import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Pool } from 'pg';
import { runMigrations } from '../src/migrations/runner';

const adminConnectionString = process.env.TEST_DATABASE_URL;
const databaseTest = adminConnectionString ? test : test.skip;

function databaseUrl(databaseName: string): string {
  const url = new URL(adminConnectionString!);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function withDatabase(run: (pool: Pool) => Promise<void>) {
  const databaseName = `spandan_migration_${randomUUID().replace(/-/g, '')}`;
  const admin = new Pool({ connectionString: adminConnectionString, max: 1 });
  await admin.query(`CREATE DATABASE ${databaseName}`);
  const pool = new Pool({ connectionString: databaseUrl(databaseName), max: 4 });
  try {
    await run(pool);
  } finally {
    await pool.end();
    await admin.query(`DROP DATABASE ${databaseName} WITH (FORCE)`);
    await admin.end();
  }
}

async function withMigrationDirectory(
  files: Record<string, string>,
  run: (directory: string) => Promise<void>
) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'spandan-db-migrations-'));
  try {
    for (const [filename, sql] of Object.entries(files)) {
      fs.writeFileSync(path.join(directory, filename), sql, 'utf8');
    }
    await run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

databaseTest('clean, upgrade, and repeat runs maintain an append-only ledger', async () => {
  await withDatabase(async (pool) => {
    await withMigrationDirectory(
      { '001_create_patient.sql': 'CREATE TABLE patient(id integer PRIMARY KEY);' },
      async (directory) => {
        const clean = await runMigrations({ pool, migrationsDir: directory });
        assert.deepEqual(clean.applied, [1]);

        fs.writeFileSync(
          path.join(directory, '002_expand_patient.sql'),
          'ALTER TABLE patient ADD COLUMN display_name text;',
          'utf8'
        );
        const upgrade = await runMigrations({ pool, migrationsDir: directory });
        assert.deepEqual(upgrade.applied, [2]);

        const repeat = await runMigrations({ pool, migrationsDir: directory });
        assert.deepEqual(repeat.applied, []);
        assert.deepEqual(repeat.alreadyApplied, [1, 2]);

        const ledger = await pool.query(
          'SELECT version, duration_ms, execution_mode FROM schema_migrations ORDER BY version'
        );
        assert.equal(ledger.rowCount, 2);
        assert.equal(ledger.rows[0].execution_mode, 'applied');
        assert.ok(ledger.rows.every((row) => row.duration_ms >= 0));
        await assert.rejects(
          pool.query('UPDATE schema_migrations SET duration_ms = 0 WHERE version = 1'),
          /append-only/
        );
      }
    );
  });
});

databaseTest('concurrent migration attempts produce one executor', async () => {
  await withDatabase(async (pool) => {
    await withMigrationDirectory(
      {
        '001_slow_create.sql':
          'SELECT pg_sleep(0.2); CREATE TABLE migration_lock_proof(id integer PRIMARY KEY);',
      },
      async (directory) => {
        const [left, right] = await Promise.all([
          runMigrations({ pool, migrationsDir: directory }),
          runMigrations({ pool, migrationsDir: directory }),
        ]);
        assert.equal(left.applied.length + right.applied.length, 1);
        const ledger = await pool.query('SELECT version FROM schema_migrations');
        assert.equal(ledger.rowCount, 1);
      }
    );
  });
});

databaseTest('a failed migration rolls back only itself and can be repaired safely', async () => {
  await withDatabase(async (pool) => {
    await withMigrationDirectory(
      {
        '001_stable.sql': 'CREATE TABLE stable_record(id integer PRIMARY KEY);',
        '002_broken.sql':
          'CREATE TABLE transient_record(id integer); SELECT * FROM deliberately_missing_relation;',
      },
      async (directory) => {
        await assert.rejects(runMigrations({ pool, migrationsDir: directory }));
        const afterFailure = await pool.query(
          `SELECT to_regclass('public.stable_record') AS stable,
                  to_regclass('public.transient_record') AS transient`
        );
        assert.equal(afterFailure.rows[0].stable, 'stable_record');
        assert.equal(afterFailure.rows[0].transient, null);
        const ledgerAfterFailure = await pool.query(
          'SELECT version FROM schema_migrations ORDER BY version'
        );
        assert.deepEqual(
          ledgerAfterFailure.rows.map((row) => row.version),
          [1]
        );

        fs.writeFileSync(
          path.join(directory, '002_broken.sql'),
          'CREATE TABLE repaired_record(id integer PRIMARY KEY);',
          'utf8'
        );
        const repaired = await runMigrations({ pool, migrationsDir: directory });
        assert.deepEqual(repaired.applied, [2]);
      }
    );
  });
});

databaseTest(
  'the reviewed legacy schema can be adopted without replaying application SQL',
  async () => {
    await withDatabase(async (pool) => {
      const migrationsDir = path.resolve(__dirname, '../migrations');
      const files = fs
        .readdirSync(migrationsDir)
        .filter((filename) => filename.endsWith('.sql'))
        .sort();
      for (const filename of files) {
        await pool.query(fs.readFileSync(path.join(migrationsDir, filename), 'utf8'));
      }

      const before = await pool.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM diagnostic_tests'
      );
      const adopted = await runMigrations({ pool, migrationsDir, legacyBaselineVersion: 31 });
      assert.equal(adopted.adopted.length, 31);
      assert.deepEqual(adopted.applied, []);
      const after = await pool.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM diagnostic_tests'
      );
      assert.equal(after.rows[0].count, before.rows[0].count);

      const previousApplicationQuery = await pool.query(
        'SELECT id, email, role FROM staff_users ORDER BY created_at DESC LIMIT 1'
      );
      assert.equal(previousApplicationQuery.rowCount, 0);
    });
  }
);
