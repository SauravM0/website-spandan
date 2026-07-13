import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { roleHasPermission, PERMISSIONS } from '../src/security/permissions';

const migration = readFileSync(join(process.cwd(), 'migrations/019_remote_intake_links.sql'), 'utf8');
test('remote intake permissions enforce least privilege', () => {
  assert.equal(roleHasPermission('reception', PERMISSIONS.INTAKE_WRITE), true);
  assert.equal(roleHasPermission('doctor', PERMISSIONS.INTAKE_READ), true);
  assert.equal(roleHasPermission('doctor', PERMISSIONS.INTAKE_WRITE), false);
  assert.equal(roleHasPermission('billing', PERMISSIONS.INTAKE_READ), false);
});
test('database prevents unsafe file promotion and duplicate drafts', () => {
  assert.match(migration, /status <> 'promoted'.*scan_result = 'clean'/s);
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS idx_intake_one_draft/);
});
test('tokens and contacts are not stored in plaintext columns', () => {
  assert.match(migration, /token_hash CHAR\(64\).*UNIQUE/);
  assert.match(migration, /contact_ciphertext TEXT NOT NULL/);
  assert.doesNotMatch(migration, /\btoken\s+(TEXT|VARCHAR)/i);
});
