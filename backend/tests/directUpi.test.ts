import assert from 'node:assert/strict';
import test from 'node:test';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import {
  buildCanonicalUpiUri,
  createPublicPaymentReference,
  fingerprintUtrWithSecret,
  normalizeUtr,
} from '../src/services/directUpi';
import {
  canApplyPaymentTransition,
  assertPaymentTransition,
} from '../src/domain/paymentLifecycle';
import {
  paymentCreationToken,
  verifyPaymentCreationToken,
} from '../src/security/paymentCreationTokens';
import { paymentConfigurationSchema } from '../src/utils/validation';
import { PERMISSIONS, roleHasPermission } from '../src/security/permissions';

test('canonical UPI URI has exact server amount, reference, and encoded merchant fields', () => {
  const uri = buildCanonicalUpiUri({
    merchantVpa: 'clinic.pay@upi',
    merchantName: 'Spandan Clinic & Diagnostics',
    reference: 'SPU-ABC123',
    note: 'Appointment SPU-ABC123',
    amountPaisa: 12345,
    merchantCategory: '8099',
  });
  const parsed = new URL(uri);
  assert.equal(parsed.protocol, 'upi:');
  assert.equal(parsed.hostname, 'pay');
  assert.deepEqual(Object.fromEntries(parsed.searchParams), {
    pa: 'clinic.pay@upi',
    pn: 'Spandan Clinic & Diagnostics',
    tr: 'SPU-ABC123',
    tn: 'Appointment SPU-ABC123',
    am: '123.45',
    cu: 'INR',
    mc: '8099',
  });
});

test('generated QR decodes to the exact canonical UPI URI', async () => {
  const uri = buildCanonicalUpiUri({
    merchantVpa: 'merchant@upi',
    merchantName: 'Spandan',
    reference: 'SPU-QR-DECODE-1',
    note: 'Pay SPU-QR-DECODE-1',
    amountPaisa: 99901,
  });
  const png = PNG.sync.read(
    await QRCode.toBuffer(uri, { type: 'png', width: 640, margin: 4, errorCorrectionLevel: 'M' })
  );
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(decoded, 'QR should decode');
  assert.equal(decoded.data, uri);
});

test('UTR normalization is strict and references are non-guessable', () => {
  assert.equal(normalizeUtr('  ab12cd3456 '), 'AB12CD3456');
  for (const invalid of ['', '12345', 'ABC-123', 'ABC 123', 'a'.repeat(36)]) {
    assert.throws(() => normalizeUtr(invalid));
  }
  const refs = new Set(Array.from({ length: 200 }, () => createPublicPaymentReference()));
  assert.equal(refs.size, 200);
  for (const reference of refs) assert.match(reference, /^SPU-[A-F0-9]{24}$/);
});

test('UTR HMAC fingerprint is deterministic, keyed, and does not expose the UTR', () => {
  const utr = 'AB12CD3456';
  const first = fingerprintUtrWithSecret(utr, 'test-secret-one');
  assert.equal(first, fingerprintUtrWithSecret(utr, 'test-secret-one'));
  assert.notEqual(first, fingerprintUtrWithSecret(utr, 'test-secret-two'));
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first.includes(utr), false);
});

test('manual verification lifecycle prevents patient-side success', () => {
  assert.equal(canApplyPaymentTransition('created', 'verification_pending'), true);
  assert.equal(canApplyPaymentTransition('verification_pending', 'success'), true);
  assert.equal(canApplyPaymentTransition('verification_pending', 'amount_mismatch'), true);
  assert.equal(canApplyPaymentTransition('expired', 'verification_pending'), true);
  assert.equal(canApplyPaymentTransition('rejected', 'verification_pending'), true);
  assert.equal(canApplyPaymentTransition('cancelled', 'success'), false);
  assert.throws(() => assertPaymentTransition('cancelled', 'success'));
});

test('payment creation bearer token is target-bound and only its hash verifies', () => {
  const targetId = '123e4567-e89b-12d3-a456-426614174000';
  const access = paymentCreationToken('appointment', targetId);
  assert.equal(access.token.length, 43);
  assert.equal(access.hash.length, 64);
  assert.equal(verifyPaymentCreationToken(access.token, access.hash), true);
  assert.equal(verifyPaymentCreationToken(`${access.token.slice(0, -1)}A`, access.hash), false);
  const other = paymentCreationToken('package_order', targetId);
  assert.notEqual(other.token, access.token);
});

test('configuration rejects unsafe or contradictory Direct UPI states', () => {
  const valid = {
    payment_mode: 'direct_upi',
    direct_upi_enabled: true,
    gateway_enabled: false,
    active_provider: 'direct_upi',
    merchant_upi_vpa: 'merchant@upi',
    merchant_display_name: 'Spandan Clinic',
    merchant_payment_contact: null,
    merchant_category: '8099',
    upi_transaction_note_template: 'Payment {reference}',
    payment_order_expiry_minutes: 30,
    verification_reservation_minutes: 10,
    utr_required: true,
    screenshot_enabled: true,
    screenshot_required: false,
    pay_at_clinic_enabled: true,
    effective_from: new Date().toISOString(),
    change_reason: 'Enable verified manual UPI',
  };
  assert.equal(paymentConfigurationSchema.safeParse(valid).success, true);
  assert.equal(
    paymentConfigurationSchema.safeParse({ ...valid, merchant_upi_vpa: null }).success,
    false
  );
  assert.equal(
    paymentConfigurationSchema.safeParse({ ...valid, screenshot_enabled: false, screenshot_required: true }).success,
    false
  );
  assert.equal(
    paymentConfigurationSchema.safeParse({ ...valid, active_provider: 'phonepe' }).success,
    false
  );
});

test('manual verification and evidence permissions are explicitly narrow', () => {
  assert.equal(roleHasPermission('admin', PERMISSIONS.PAYMENTS_VERIFY), true);
  assert.equal(roleHasPermission('billing', PERMISSIONS.PAYMENTS_VERIFY), true);
  assert.equal(roleHasPermission('manager', PERMISSIONS.PAYMENTS_VERIFY), false);
  assert.equal(roleHasPermission('reception', PERMISSIONS.PAYMENTS_VERIFY), false);
  assert.equal(roleHasPermission('staff', PERMISSIONS.PAYMENT_EVIDENCE_READ), false);
  assert.equal(roleHasPermission('billing', PERMISSIONS.PAYMENT_SETTINGS_WRITE), false);
  assert.equal(roleHasPermission('admin', PERMISSIONS.PAYMENT_SETTINGS_WRITE), true);
});
