import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { appointmentSchema, packageOrderSchema, paymentCreateSchema } from '../src/utils/validation';
import { assertBookingTransition, BOOKING_STATES } from '../src/domain/appointmentBooking';
import { assertPaymentTransition } from '../src/domain/paymentLifecycle';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('public booking remains validated and cannot skip authoritative payment state', () => {
  const routes = read('src/routes/operations.ts');
  assert.match(routes, /router\.post\('\/appointments', optionalAuth, validateZod\(\{ body: appointmentSchema \}\)/);
  assert.equal(appointmentSchema.safeParse({}).success, false);
  assert.throws(() => assertBookingTransition('slot_held', 'confirmed'));
  assert.doesNotThrow(() => assertBookingTransition('payment_pending', 'confirmed'));
  assert.ok(BOOKING_STATES.includes('payment_required'));
});

test('package ordering remains validated and snapshots server-side prices', () => {
  const routes = read('src/routes/operations.ts');
  const service = read('src/services/operations.ts');
  assert.match(routes, /router\.post\('\/package-orders\/quote', validateZod\(\{ body: packageQuoteSchema \}\)/);
  assert.match(routes, /router\.post\('\/package-orders', validateZod\(\{ body: packageOrderSchema \}\)/);
  assert.equal(packageOrderSchema.safeParse({}).success, false);
  assert.match(service, /base_price_snapshot/);
  assert.match(service, /discounted_price_snapshot/);
});

test('payment creation remains validated and success cannot regress to failure', () => {
  const routes = read('src/routes/operations.ts');
  const service = read('src/services/operations.ts');
  const provider = read('src/services/phonePe.ts');
  assert.match(routes, /router\.post\('\/payments\/create', validateZod\(\{ body: paymentCreateSchema \}\)/);
  assert.equal(paymentCreateSchema.safeParse({}).success, false);
  assert.throws(() => assertPaymentTransition('success', 'failed'));
  assert.match(service, /!config\.phonePe\.enabled && !config\.payments\.mockEnabled/);
  assert.match(provider, /!config\.phonePe\.enabled \|\| !webhookUsername \|\| !webhookPassword\) return false/);
});

test('admin login remains cookie-based and backed by revocable sessions', () => {
  const auth = read('src/controllers/adminAuthController.ts');
  const middleware = read('src/middleware/auth.ts');
  assert.match(auth, /INSERT INTO staff_sessions/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /secure: config\.env === 'production'/);
  assert.match(middleware, /revoked_at IS NULL AND expires_at>NOW\(\)/);
});

test('admin appointment status writes remain authenticated and transition-guarded', () => {
  const routes = read('src/routes/adminOperations.ts');
  const service = read('src/services/operations.ts');
  assert.match(routes, /router\.use\(authenticate\)/);
  assert.match(routes, /appointments\/:id\/status', requirePermission\(PERMISSIONS\.APPOINTMENTS_WRITE\)/);
  assert.match(service, /appointmentAllowedActions\(current\.rows\[0\]\.status\)/);
  assert.match(service, /INVALID_STATUS_TRANSITION/);
});

test('provider and clinical write capabilities remain disabled by default', () => {
  const example = read('.env.example');
  for (const gate of [
    'PHONEPE_ENABLED=false',
    'PAYMENT_MOCK_ENABLED=false',
    'EMAIL_NOTIFICATIONS_ENABLED=false',
    'CLINICAL_RECORD_WRITES_ENABLED=false',
    'CLINICAL_OBSERVATIONS_ENABLED=false',
    'DEVICE_IMPORTS_ENABLED=false',
    'MEDICAL_DOCUMENTS_ENABLED=false',
  ]) assert.match(example, new RegExp(gate));
});
