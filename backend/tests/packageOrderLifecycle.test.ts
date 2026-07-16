import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { packageOrderAllowedActions } from '../src/services/operations';
import {
  packageOrderAssignmentSchema,
  packageOrderPriceConfirmationSchema,
  packageOrderTransitionSchema,
} from '../src/utils/validation';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('package order lifecycle exposes only valid next commands', () => {
  assert.deepEqual(packageOrderAllowedActions('submitted'), [
    'start_price_review',
    'request_payment',
    'cancel',
  ]);
  assert.deepEqual(packageOrderAllowedActions('price_review'), ['cancel']);
  assert.deepEqual(packageOrderAllowedActions('paid'), ['schedule', 'request_refund', 'cancel']);
  assert.deepEqual(packageOrderAllowedActions('ready'), ['fulfill', 'request_refund', 'cancel']);
  assert.deepEqual(packageOrderAllowedActions('refund_pending'), ['mark_refunded']);
  assert.deepEqual(packageOrderAllowedActions('cancelled'), []);
  assert.deepEqual(packageOrderAllowedActions('refunded'), []);
});

test('package order commands require version, reason, and bounded input', () => {
  assert.equal(packageOrderTransitionSchema.safeParse({}).success, false);
  assert.equal(packageOrderAssignmentSchema.safeParse({}).success, false);
  assert.equal(packageOrderPriceConfirmationSchema.safeParse({}).success, false);
  assert.equal(
    packageOrderTransitionSchema.safeParse({
      action: 'schedule',
      expected_version: 1,
      reason: 'Patient confirmed the visit',
      scheduled_for: '2030-01-01T10:00:00+05:30',
    }).success,
    true
  );
});

test('package order storage is versioned, immutable, and action-queue indexed', () => {
  const migration = read('migrations/038_package_order_lifecycle.sql');
  for (const required of [
    'package_order_events',
    'package_order_price_confirmations',
    'package_order_events_immutable',
    'package_order_price_confirmation_immutable',
    'package_order_action_queue',
    'version_after = version_before \\+ 1',
  ]) {
    assert.match(migration, new RegExp(required));
  }
});

test('admin package order endpoints require dedicated write permission', () => {
  const routes = read('src/routes/adminOperations.ts');
  const controller = read('src/controllers/operationsController.ts');
  const service = read('src/services/operations.ts');
  for (const route of [
    "'/package-orders/:id'",
    "'/package-orders/:id/transitions'",
    "'/package-orders/:id/assign'",
    "'/package-orders/:id/price-confirmation'",
  ]) {
    assert.match(routes, new RegExp(route.replaceAll('/', '\\/')));
  }
  assert.match(routes, /PERMISSIONS\.PACKAGE_ORDERS_WRITE/);
  assert.match(
    routes,
    /package-orders\/:id\/transitions',[\s\S]*?PACKAGE_ORDERS_WRITE\),[\s\S]*?requireRecentStepUp/
  );
  assert.match(controller, /IDEMPOTENCY_KEY_REQUIRED/);
  assert.match(service, /SELECT \* FROM package_orders WHERE id=\$1 FOR UPDATE/);
  assert.match(service, /PACKAGE_ORDER_VERSION_CONFLICT/);
  assert.match(service, /package_order\.transitioned/);
});
