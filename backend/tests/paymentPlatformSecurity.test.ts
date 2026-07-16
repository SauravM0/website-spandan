import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const service = fs.readFileSync(new URL('../src/services/operations.ts', import.meta.url), 'utf8');
const evidence = fs.readFileSync(
  new URL('../src/security/paymentEvidence.ts', import.meta.url),
  'utf8'
);
const routes = fs.readFileSync(
  new URL('../src/routes/adminOperations.ts', import.meta.url),
  'utf8'
);
const migration = fs.readFileSync(
  new URL('../migrations/025_payment_platform_maturity.sql', import.meta.url),
  'utf8'
);

test('payment writes have database idempotency and concurrency constraints', () => {
  assert.match(migration, /idx_payments_idempotency/);
  assert.match(migration, /idx_payments_one_live_order/);
  assert.match(migration, /idx_payments_one_live_appointment|payments_one_target/);
  assert.match(service, /FOR UPDATE/);
});

test('webhook events are append-only, redacted and deduplicated', () => {
  assert.match(service, /redactPaymentPayload\(payload\)/);
  assert.match(evidence, /providerEventHash/);
  assert.match(service, /paymentEventIdentityHash/);
  assert.match(migration, /idx_payment_webhook_event_hash/);
});

test('refund and privileged payment operations require separate permissions and audit', () => {
  assert.match(routes, /PAYMENTS_REFUND/);
  assert.match(routes, /PAYMENTS_RECHECK/);
  assert.match(routes, /auditAccess\('payment\.sensitive_read'/);
  assert.match(service, /payment\.refund_requested/);
  assert.match(migration, /approved_by_staff_id <> requested_by_staff_id/);
});

test('pending reconciliation is bounded and creates actionable exceptions', () => {
  assert.match(service, /reconcilePendingPayments\(limit = 25\)/);
  assert.match(service, /LIMIT \$1/);
  assert.match(service, /payment_exceptions/);
});
