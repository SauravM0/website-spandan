import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPaymentTransition, providerEventHash, validateRefundAmount } from '../src/domain/paymentLifecycle';

test('provider events deduplicate independent of object key order', () => {
  assert.equal(
    providerEventHash('phonepe', 'payment.completed', { state: 'COMPLETED', amount: 70000 }),
    providerEventHash('phonepe', 'payment.completed', { amount: 70000, state: 'COMPLETED' })
  );
});

test('out-of-order failure cannot overwrite verified success', () => {
  assert.throws(() => assertPaymentTransition('success', 'failed'), /not allowed/);
  assert.doesNotThrow(() => assertPaymentTransition('failed', 'success'));
});

test('unknown provider state cannot bypass lifecycle policy', () => {
  assert.throws(() => assertPaymentTransition('pending', 'invented_status'), /not allowed/);
});

test('refund amount is positive and cannot exceed unreserved balance', () => {
  assert.doesNotThrow(() => validateRefundAmount(700, 200, 500));
  assert.throws(() => validateRefundAmount(700, 200, 500.01), /refundable balance/);
  assert.throws(() => validateRefundAmount(700, 0, 0), /refundable balance/);
});
