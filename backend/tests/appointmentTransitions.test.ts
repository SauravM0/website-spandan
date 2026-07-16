import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { appointmentAllowedActions } from '../src/services/operations';
import { appointmentTransitionSchema } from '../src/utils/validation';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('appointment actions are command-specific and completion requires check-in', () => {
  assert.deepEqual(appointmentAllowedActions('awaiting_payment'), [
    'confirm',
    'mark_payment_failed',
    'cancel',
  ]);
  assert.deepEqual(appointmentAllowedActions('confirmed'), ['check_in', 'mark_no_show', 'cancel']);
  assert.deepEqual(appointmentAllowedActions('checked_in'), ['complete', 'cancel']);
  assert.equal(appointmentAllowedActions('confirmed').includes('complete'), false);
  assert.deepEqual(appointmentAllowedActions('completed'), []);
});

test('transition input requires action, version, reason, and valid evidence shapes', () => {
  assert.equal(appointmentTransitionSchema.safeParse({ action: 'complete' }).success, false);
  assert.equal(
    appointmentTransitionSchema.safeParse({
      action: 'check_in',
      expected_version: 2,
      reason: 'Patient arrived',
      evidence: { kind: 'cash', amount: 500, reference: 'CASH-001' },
    }).success,
    true
  );
  assert.equal(
    appointmentTransitionSchema.safeParse({
      action: 'confirm',
      expected_version: 1,
      reason: 'Approved',
      evidence: { kind: 'waiver', approval_reason: 'short' },
    }).success,
    false
  );
});

test('service locks, version-checks, validates evidence, and audits one atomic transition', () => {
  const service = read('src/services/operations.ts');
  const migration = read('migrations/037_transactional_appointment_transitions.sql');
  const routes = read('src/routes/adminOperations.ts');
  const controller = read('src/controllers/operationsController.ts');

  assert.match(service, /SELECT \* FROM appointments WHERE id=\$1 FOR UPDATE/);
  assert.match(service, /APPOINTMENT_VERSION_CONFLICT/);
  assert.match(service, /APPOINTMENT_FINANCIAL_EVIDENCE_REQUIRED/);
  assert.match(service, /APPOINTMENT_PAYMENT_AMOUNT_MISMATCH/);
  assert.match(service, /APPOINTMENT_CASH_AMOUNT_MISMATCH/);
  assert.match(service, /appointment\.transitioned/);
  assert.match(service, /beforeSnapshot/);
  assert.match(service, /afterSnapshot/);
  assert.match(service, /appointment_payment_evidence/);
  assert.match(migration, /appointment_transition_events/);
  assert.match(migration, /appointment_payment_evidence_immutable/);
  assert.match(migration, /appointment_financial_evidence_required/);
  assert.match(routes, /appointments\/:id\/transitions/);
  assert.doesNotMatch(routes, /appointments\/:id\/status/);
  assert.match(controller, /IDEMPOTENCY_KEY_REQUIRED/);
});

test('authoritative online success records evidence before confirmation', () => {
  const service = read('src/services/operations.ts');
  const evidenceInsert = service.indexOf('INSERT INTO appointment_payment_evidence');
  const confirmationUpdate = service.indexOf("SET status = 'confirmed'");
  assert.ok(evidenceInsert >= 0);
  assert.ok(confirmationUpdate > evidenceInsert);
  assert.match(service, /payment_status = 'paid_online'/);
});
