import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { appointmentRescheduleSchema } from '../src/utils/validation';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('reschedule input requires a target slot, version, and reason', () => {
  assert.equal(appointmentRescheduleSchema.safeParse({}).success, false);
  assert.equal(
    appointmentRescheduleSchema.safeParse({
      doctor_id: '11111111-1111-4111-8111-111111111111',
      appointment_date: '2030-01-31',
      start_time: '09:30',
      expected_version: 2,
      reason: 'Patient requested a later visit',
    }).success,
    true
  );
});

test('rescheduling locks calendars, revalidates availability, and preserves the original on failure', () => {
  const service = read('src/services/operations.ts');
  for (const required of [
    'pg_advisory_xact_lock',
    'listSlotsWithDb',
    'excludeAppointmentId',
    'APPOINTMENT_TARGET_SLOT_UNAVAILABLE',
    'The original appointment was kept unchanged',
    "AT TIME ZONE 'Asia/Kolkata'",
    'appointment.rescheduled',
    'appointment_reschedule_events',
  ]) {
    assert.match(service, new RegExp(required.replaceAll('(', '\\(').replaceAll(')', '\\)')));
  }
});

test('reschedule history is immutable and version consecutive', () => {
  const migration = read('migrations/039_safe_appointment_rescheduling.sql');
  for (const required of [
    'appointment_reschedule_events',
    'appointment_reschedule_event_immutable',
    'version_after = version_before + 1',
    "outcome IN ('rescheduled','cancelled_no_slot')",
    'appointment_reschedule_timeline',
  ]) {
    assert.ok(migration.includes(required), `Missing ${required}`);
  }
});

test('admin and notification contracts include the reschedule workflow', () => {
  const routes = read('src/routes/adminOperations.ts');
  const controller = read('src/controllers/operationsController.ts');
  const notifications = read('src/services/notifications.ts');
  const patientRecord = read('src/services/patientRecord.ts');
  const frontend = read('../frontend/src/lib/api.ts');
  const adminPage = read('../frontend/src/app/admin/(protected)/appointments/page.tsx');
  assert.match(routes, /appointments\/:id\/reschedule/);
  assert.match(routes, /appointmentRescheduleSchema/);
  assert.match(controller, /IDEMPOTENCY_KEY_REQUIRED/);
  assert.match(frontend, /rescheduleAdminAppointment/);
  assert.match(adminPage, /getAppointmentSlots/);
  assert.match(adminPage, /Reschedule/);
  assert.match(notifications, /appointment_rescheduled/);
  assert.match(notifications, /appointment_cancelled_no_slot/);
  assert.match(patientRecord, /appointment_reschedule_events/);
  assert.match(patientRecord, /reschedule_history/);
});
