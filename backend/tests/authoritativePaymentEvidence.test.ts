import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { config } from '../src/config';
import {
  assertPaymentEvidenceAllowed,
  paymentEventIdentityHash,
  type PaymentEvidence,
} from '../src/security/paymentEvidence';
import { validatePhonePeWebhook } from '../src/services/phonePe';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

function withConfig<T>(change: () => T): T {
  const before = {
    enabled: config.phonePe.enabled,
    username: config.phonePe.webhookUsername,
    password: config.phonePe.webhookPassword,
    mock: config.payments.mockEnabled,
    deployment: config.deploymentEnvironment,
  };
  try {
    return change();
  } finally {
    config.phonePe.enabled = before.enabled;
    config.phonePe.webhookUsername = before.username;
    config.phonePe.webhookPassword = before.password;
    config.payments.mockEnabled = before.mock;
    config.deploymentEnvironment = before.deployment;
  }
}

test('PhonePe callback authentication, type, order id, and optional timestamp fail closed', () => {
  withConfig(() => {
    config.phonePe.enabled = true;
    config.phonePe.webhookUsername = 'callback-user';
    config.phonePe.webhookPassword = 'callback-password';
    const authorization = crypto
      .createHash('sha256')
      .update('callback-user:callback-password')
      .digest('hex');
    const now = Date.parse('2026-07-16T10:00:00.000Z');
    const body = {
      type: 'PG_ORDER_COMPLETED',
      eventTime: now,
      payload: { merchantOrderId: 'SPP-123', state: 'COMPLETED' },
    };
    assert.equal(validatePhonePeWebhook(authorization, body, now).merchantOrderId, 'SPP-123');
    assert.throws(
      () => validatePhonePeWebhook('invalid', body, now),
      (error: any) => error.code === 'PHONEPE_WEBHOOK_UNAUTHORIZED'
    );
    assert.throws(
      () => validatePhonePeWebhook(authorization, { ...body, type: 'UNKNOWN' }, now),
      (error: any) => error.code === 'PHONEPE_WEBHOOK_TYPE_INVALID'
    );
    assert.throws(
      () => validatePhonePeWebhook(authorization, { ...body, eventTime: now - 16 * 60_000 }, now),
      (error: any) => error.code === 'PHONEPE_WEBHOOK_EXPIRED'
    );
  });
});

test('provider and mock evidence are environment-bound', () => {
  const evidence: PaymentEvidence = {
    source: 'phonepe.status_api',
    providerVerified: true,
    observedAt: new Date('2026-07-16T10:00:00.000Z'),
    eventName: 'phonepe.status_api',
  };
  withConfig(() => {
    config.phonePe.enabled = false;
    assert.throws(() => assertPaymentEvidenceAllowed(evidence), /provider evidence/i);
    config.phonePe.enabled = true;
    assert.doesNotThrow(() => assertPaymentEvidenceAllowed(evidence));
    assert.throws(
      () => assertPaymentEvidenceAllowed({ ...evidence, providerVerified: false }),
      /provider evidence/i
    );

    config.phonePe.enabled = false;
    config.payments.mockEnabled = true;
    config.deploymentEnvironment = 'test';
    assert.doesNotThrow(() => assertPaymentEvidenceAllowed({ ...evidence, source: 'test.mock' }));
    config.deploymentEnvironment = 'production';
    assert.throws(
      () => assertPaymentEvidenceAllowed({ ...evidence, source: 'test.mock' }),
      /not enabled/i
    );
  });
});

test('canonical event identity makes replay detection independent of key order', () => {
  const evidence: PaymentEvidence = {
    source: 'phonepe.webhook',
    providerVerified: true,
    observedAt: new Date('2026-07-16T10:00:00.000Z'),
    eventName: 'PG_ORDER_COMPLETED',
  };
  assert.equal(
    paymentEventIdentityHash(evidence, { state: 'COMPLETED', amount: 49900 }),
    paymentEventIdentityHash(evidence, { amount: 49900, state: 'COMPLETED' })
  );
});

test('success is gated by status-API evidence, exact amount, provider order, and immutable storage', () => {
  const controller = read('src/controllers/operationsController.ts');
  const service = read('src/services/operations.ts');
  const phonePe = read('src/services/phonePe.ts');
  const migration = read('migrations/036_authoritative_payment_evidence.sql');
  const routes = read('src/routes/operations.ts');

  assert.match(controller, /getPhonePeOrderStatus\(callback\.merchantOrderId\)/);
  assert.match(controller, /source: 'phonepe\.webhook'/);
  assert.match(service, /successEvidenceComplete/);
  assert.match(service, /Number\(incomingPaisa\) === expectedPaisa/);
  assert.match(service, /providerOrderMatches/);
  assert.match(service, /provider_evidence_hash/);
  assert.match(phonePe, /details=true/);
  assert.match(migration, /New successful payments require authoritative provider evidence/);
  assert.match(migration, /payment_provider_evidence_immutable/);
  assert.doesNotMatch(routes, /'\/payments\/webhook'/);
});
