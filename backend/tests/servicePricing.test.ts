import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { permissionsForRole, PERMISSIONS } from '../src/security/permissions';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('dynamic pricing is versioned, scoped, effective-dated, and auditable', () => {
  const migration = read('migrations/028_dynamic_service_pricing.sql');
  const service = read('src/services/servicePricing.ts');
  assert.match(migration, /billable_service_price_history/);
  assert.match(migration, /service_price_version/);
  assert.match(service, /h\.effective_from <= \(NOW\(\) AT TIME ZONE 'Asia\/Kolkata'\)::date/);
  assert.match(service, /appointment_type IS NULL OR s\.appointment_type/);
  assert.match(service, /service_price\.updated/);
  assert.match(service, /version=version\+1/);
});

test('booking copies service and price snapshots instead of trusting a client amount', () => {
  const operations = read('src/services/operations.ts');
  const validation = read('src/utils/validation.ts');
  assert.match(operations, /resolveServicePrice\(client, 'consultation'/);
  assert.match(operations, /serviceSnapshot\.price/);
  assert.match(operations, /service_price_version/);
  assert.doesNotMatch(validation.match(/export const slotHoldSchema[\s\S]*?\n\}\);/)?.[0] || '', /price|amount|fee/);
});

test('price publication is restricted while billing remains read-only', () => {
  assert.ok(permissionsForRole('admin').includes(PERMISSIONS.PRICING_WRITE));
  assert.ok(permissionsForRole('manager').includes(PERMISSIONS.PRICING_WRITE));
  assert.ok(permissionsForRole('billing').includes(PERMISSIONS.PRICING_READ));
  assert.ok(!permissionsForRole('billing').includes(PERMISSIONS.PRICING_WRITE));
  assert.ok(!permissionsForRole('reception').includes(PERMISSIONS.PRICING_WRITE));
});
