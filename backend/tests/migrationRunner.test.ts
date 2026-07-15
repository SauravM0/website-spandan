import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  checksumSql,
  discoverMigrations,
  type MigrationFile,
  type MigrationLedgerRow,
  validateMigrationHistory,
} from '../src/migrations/runner';

function withMigrations(files: Record<string, string>, run: (directory: string) => void) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'spandan-migrations-'));
  try {
    for (const [filename, sql] of Object.entries(files)) {
      fs.writeFileSync(path.join(directory, filename), sql, 'utf8');
    }
    run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function ledgerRow(migration: MigrationFile): MigrationLedgerRow {
  return {
    version: migration.version,
    filename: migration.filename,
    checksum: migration.checksum,
    duration_ms: 1,
    execution_mode: 'applied',
    applied_at: new Date('2026-07-15T00:00:00.000Z'),
  };
}

test('migration discovery is contiguous, deterministic, and content checksummed', () => {
  withMigrations(
    {
      '001_create_example.sql': 'CREATE TABLE example(id integer);\n',
      '002_expand_example.sql': 'ALTER TABLE example ADD COLUMN name text;\n',
    },
    (directory) => {
      const first = discoverMigrations(directory);
      const second = discoverMigrations(directory);
      assert.deepEqual(first, second);
      assert.deepEqual(
        first.map((migration) => migration.version),
        [1, 2]
      );
      assert.equal(first[0].checksum, checksumSql(first[0].sql));
      assert.notEqual(checksumSql('SELECT 1;\n'), checksumSql('SELECT 1;\r\n'));
    }
  );
});

test('migration discovery rejects gaps and ambiguous filenames', () => {
  withMigrations({ '002_gap.sql': 'SELECT 1;' }, (directory) => {
    assert.throws(() => discoverMigrations(directory), /expected migration version 001/);
  });
  withMigrations({ '001_Bad-Name.sql': 'SELECT 1;' }, (directory) => {
    assert.throws(() => discoverMigrations(directory), /lowercase slug/);
  });
});

test('repeat runs are no-ops and upgrades return only appended migrations', () => {
  withMigrations(
    {
      '001_create_example.sql': 'SELECT 1;',
      '002_expand_example.sql': 'SELECT 2;',
    },
    (directory) => {
      const migrations = discoverMigrations(directory);
      assert.deepEqual(validateMigrationHistory(migrations, migrations.map(ledgerRow)), []);
      assert.deepEqual(
        validateMigrationHistory(migrations, [ledgerRow(migrations[0])]).map(
          (migration) => migration.version
        ),
        [2]
      );
    }
  );
});

test('edited historical checksums and filenames are rejected', () => {
  withMigrations({ '001_create_example.sql': 'SELECT 1;' }, (directory) => {
    const [migration] = discoverMigrations(directory);
    assert.throws(
      () =>
        validateMigrationHistory(
          [migration],
          [{ ...ledgerRow(migration), checksum: 'a'.repeat(64) }]
        ),
      /checksum has changed/
    );
    assert.throws(
      () =>
        validateMigrationHistory(
          [migration],
          [{ ...ledgerRow(migration), filename: '001_renamed.sql' }]
        ),
      /filename changed/
    );
  });
});

test('non-contiguous or missing applied history is rejected', () => {
  withMigrations(
    { '001_create_example.sql': 'SELECT 1;', '002_expand_example.sql': 'SELECT 2;' },
    (directory) => {
      const migrations = discoverMigrations(directory);
      assert.throws(
        () => validateMigrationHistory(migrations, [ledgerRow(migrations[1])]),
        /not contiguous/
      );
      assert.throws(
        () => validateMigrationHistory([migrations[0]], migrations.map(ledgerRow)),
        /no longer exists/
      );
    }
  );
});
