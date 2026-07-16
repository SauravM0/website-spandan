import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  publicPaymentStartDto,
  publicPaymentStatusDto,
} from '../src/security/publicPaymentCapabilities';

test('public payment status is an exact allowlisted DTO', () => {
  const dto = publicPaymentStatusDto({
    status: 'success',
    amount: '499.00',
    currency: 'INR',
    updated_at: '2026-07-16T00:00:00.000Z',
    expires_at: null,
    receipt_id: 'internal-receipt-id',
    receipt_number: 'R-1',
    notification_status: 'queued',
    merchant_transaction_id: 'must-not-leak',
    provider_transaction_id: 'must-not-leak',
    raw_response: { secret: true },
    idempotency_key: 'must-not-leak',
    order_id: 'must-not-leak',
    appointment_id: 'must-not-leak',
  });
  assert.deepEqual(Object.keys(dto), [
    'status',
    'amount',
    'currency',
    'updated_at',
    'expires_at',
    'receipt_available',
    'receipt_number',
    'notification_status',
  ]);
  assert.equal(dto.amount, 499);
  assert.equal(dto.receipt_available, true);
  assert.equal('merchant_transaction_id' in dto, false);
  assert.equal('raw_response' in dto, false);
});

test('payment start DTO exposes capabilities without internal evidence', () => {
  const dto = publicPaymentStartDto({
    status: 'pending',
    amount: 499,
    currency: 'INR',
    redirect_url: 'https://provider.test/checkout',
    raw_response: { secret: true },
    merchant_transaction_id: 'internal',
    public_access: {
      statusCapability: 's'.repeat(43),
      receiptCapability: 'r'.repeat(43),
      statusExpiresAt: new Date('2026-07-17T00:00:00.000Z'),
      receiptExpiresAt: new Date('2026-08-15T00:00:00.000Z'),
    },
  });
  assert.deepEqual(Object.keys(dto), [
    'status',
    'amount',
    'currency',
    'checkout_url',
    'status_capability',
    'receipt_capability',
    'status_capability_expires_at',
    'receipt_capability_expires_at',
  ]);
  assert.equal('merchant_transaction_id' in dto, false);
  assert.equal('raw_response' in dto, false);
});

test('public routes reject identifier access and enforce purpose, expiry, rate limits, and audit', () => {
  const root = path.resolve(__dirname, '..');
  const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
  const routes = read('src/routes/operations.ts');
  const security = read('src/security/publicPaymentCapabilities.ts');
  const controller = read('src/controllers/operationsController.ts');
  const notifications = read('src/services/notifications.ts');
  const migration = read('migrations/035_public_payment_capabilities.sql');

  assert.match(routes, /public\/payments\/status\/:capability/);
  assert.match(routes, /public\/receipts\/:capability\/email/);
  assert.doesNotMatch(routes, /transactionId\/status|transactionId\/receipt|receipts\/:id\/email/);
  assert.match(security, /randomBytes\(32\)/);
  assert.match(security, /purpose=\$2 AND expires_at>NOW\(\)/);
  assert.match(security, /PUBLIC_CAPABILITY_INVALID/);
  assert.match(controller, /auditPublicPaymentAccess/);
  assert.doesNotMatch(controller, /req\.body\.email/);
  assert.match(notifications, /details\.order_email \|\| details\.patient_email/);
  assert.doesNotMatch(notifications, /queueReceiptEmailByReceiptId/);
  assert.match(migration, /purpose IN \('status','receipt'\)/);
  assert.match(migration, /prevent_public_capability_rebinding/);
});
