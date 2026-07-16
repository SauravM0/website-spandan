import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('global search is permission-aware, bounded, and excludes raw contact fields', () => {
  const service = read('src/services/adminWorkflow.ts');
  assert.match(service, /roleHasPermission/);
  for (const permission of [
    'APPOINTMENTS_READ',
    'PACKAGE_ORDERS_READ',
    'PATIENTS_READ',
    'PAYMENTS_READ',
    'LEADS_READ',
  ]) {
    assert.match(service, new RegExp(permission));
  }
  assert.match(service, /results\.slice\(0, 20\)/);
  assert.doesNotMatch(service, /results\.push\([^\n]*phone:/);
});

test('needs-action queue covers every sole-admin operational exception', () => {
  const service = read('src/services/adminWorkflow.ts');
  for (const required of [
    'appointments',
    'package_orders',
    'payment_exceptions',
    'notification_exceptions',
    'identity_reviews',
    'leads',
    'next_action',
    'due_at',
    'overdue',
    'owner',
  ]) {
    assert.match(service, new RegExp(required));
  }
  assert.match(service, /tasks\.slice\(0, 50\)/);
});

test('unified detail answers the operational decision questions', () => {
  const service = read('src/services/adminWorkflow.ts');
  for (const field of [
    'patient:',
    'request:',
    'source:',
    'doctor_or_service:',
    'payment:',
    'state:',
    'owner:',
    'next_actions:',
  ]) {
    assert.match(service, new RegExp(field));
  }
  assert.match(service, /WORK_ITEM_NOT_FOUND/);
});

test('admin UI stores recently viewed IDs without local PHI', () => {
  const dashboard = read('../frontend/src/app/admin/(protected)/page.tsx');
  const search = read('../frontend/src/components/admin/AdminGlobalSearch.tsx');
  assert.match(dashboard, /admin_recent_work_ids/);
  assert.match(dashboard, /Recently Viewed IDs/);
  assert.match(dashboard, /Unified Work Item/);
  assert.match(search, /searchAdminWorkflow/);
  assert.doesNotMatch(dashboard, /sessionStorage\.setItem\([^\n]*patient_name/);
  assert.doesNotMatch(dashboard, /localStorage/);
});
