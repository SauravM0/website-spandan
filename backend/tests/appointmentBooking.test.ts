import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBookingTransition,
  bookingStateForPayment,
  InvalidBookingTransitionError,
} from '../src/domain/appointmentBooking';

test('allows the authoritative paid booking path', () => {
  assert.doesNotThrow(() => assertBookingTransition('slot_held', 'payment_required'));
  assert.doesNotThrow(() => assertBookingTransition('payment_required', 'payment_pending'));
  assert.doesNotThrow(() => assertBookingTransition('payment_pending', 'confirmed'));
});

test('does not allow confirmation before a payment-pending state', () => {
  assert.throws(
    () => assertBookingTransition('slot_held', 'confirmed'),
    InvalidBookingTransitionError
  );
});

test('duplicate state application is idempotent', () => {
  assert.doesNotThrow(() => assertBookingTransition('confirmed', 'confirmed'));
});

test('delayed provider outcomes map to recovery-safe booking states', () => {
  assert.equal(bookingStateForPayment('verification_required'), 'payment_pending');
  assert.equal(bookingStateForPayment('success'), 'confirmed');
  assert.equal(bookingStateForPayment('failed'), 'payment_failed');
});

test('India date boundary uses Asia/Kolkata instead of server local time', () => {
  const instant = new Date('2026-07-12T20:00:00.000Z');
  const clinicDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instant);
  assert.equal(clinicDate, '2026-07-13');
});
