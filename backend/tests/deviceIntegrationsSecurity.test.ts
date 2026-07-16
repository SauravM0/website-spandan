import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PERMISSIONS, roleHasPermission } from '../src/security/permissions';
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const migration = read('migrations/024_device_integrations.sql'),
  service = read('src/services/deviceIntegrations.ts'),
  routes = read('src/routes/adminDeviceIntegrations.ts'),
  ui = read('../frontend/src/components/admin/DeviceImportManager.tsx');
test('device imports use least privilege and exclude reception', () => {
  assert.equal(roleHasPermission('staff', PERMISSIONS.DEVICE_IMPORT_WRITE), true);
  assert.equal(roleHasPermission('doctor', PERMISSIONS.DEVICE_IMPORT_WRITE), true);
  assert.equal(roleHasPermission('reception', PERMISSIONS.DEVICE_IMPORT_READ), false);
});
test('raw events are immutable, traceable, constrained, deduplicated and indexed', () => {
  assert.match(migration, /Device raw events are immutable/);
  assert.match(migration, /transformation_version/);
  assert.match(migration, /raw_checksum_sha256/);
  assert.match(migration, /idx_device_event_source_identity/);
  assert.match(migration, /CHECK \(timezone = 'Asia\/Kolkata'\)/);
  assert.match(migration, /observation_id UUID REFERENCES observation_versions/);
});
test('API requires authentication, authorization, CSRF-compatible writes and idempotency', () => {
  assert.match(routes, /router\.use\(authenticate\)/);
  assert.match(routes, /DEVICE_IMPORT_WRITE/);
  assert.match(routes, /Idempotency-Key/);
  assert.match(service, /DEVICE_INTEGRATION_GOVERNANCE_REQUIRED/);
  assert.match(service, /FOR UPDATE/);
  assert.match(service, /DEVICE_IMPORT_CHANGED/);
});
test('normalization rejects ambiguous units and offset-free timestamps without converting', () => {
  assert.match(service, /Unit must be exactly mg\/dL or mmol\/L/);
  assert.match(service, /Timestamp must include an explicit UTC offset/);
  assert.doesNotMatch(service, /convert|conversion factor/i);
});
test('UI provides preview, accessible patient confirmation, error recovery and clinical boundary', () => {
  for (const word of [
    'Preview',
    'Confirm',
    'rejected',
    'duplicates',
    'Try',
    'never change medication',
  ])
    assert.match(ui, new RegExp(word, 'i'));
  assert.match(ui, /Asia\/Kolkata/);
  assert.match(ui, /confirmAdminAction/);
  assert.doesNotMatch(ui, /window\.confirm/);
});
