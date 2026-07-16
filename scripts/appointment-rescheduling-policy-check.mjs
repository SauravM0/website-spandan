import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/appointment-rescheduling-policy.json'));
const migration = read('backend/migrations/039_safe_appointment_rescheduling.sql');
const service = read('backend/src/services/operations.ts');
const routes = read('backend/src/routes/adminOperations.ts');
const notifications = read('backend/src/services/notifications.ts');
const frontend = read('frontend/src/lib/api.ts');
const adminPage = read('frontend/src/app/admin/(protected)/appointments/page.tsx');
const patientRecord = read('backend/src/services/patientRecord.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP19')
  errors.push('Unsupported appointment rescheduling policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Deployment must retain the approved sole-administrator model.');
if (!policy.concurrency?.oldAndNewCalendarLocks || !policy.concurrency?.expectedVersionRequired)
  errors.push('Rescheduling must lock both calendars and require optimistic concurrency.');
for (const required of [
  'appointment_reschedule_events',
  'appointment_reschedule_event_immutable',
  'version_after = version_before + 1',
])
  if (!migration.includes(required)) errors.push(`Reschedule migration is missing ${required}.`);
for (const required of [
  'pg_advisory_xact_lock',
  'FOR UPDATE',
  'APPOINTMENT_VERSION_CONFLICT',
  'APPOINTMENT_TARGET_SLOT_UNAVAILABLE',
  "AT TIME ZONE 'Asia/Kolkata'",
  'appointment.rescheduled',
  'queueAppointmentScheduleNotification',
])
  if (!service.includes(required)) errors.push(`Reschedule service is missing ${required}.`);
if (!routes.includes("'/appointments/:id/reschedule'"))
  errors.push('Command-specific reschedule route is missing.');
if (!notifications.includes('appointment_rescheduled'))
  errors.push('Reschedule notification delivery is missing.');
if (!frontend.includes('rescheduleAdminAppointment'))
  errors.push('Admin reschedule client is missing.');
if (!adminPage.includes('getAppointmentSlots') || !adminPage.includes('Reschedule'))
  errors.push('Admin reschedule workflow is not available to the operator.');
if (!patientRecord.includes('appointment_reschedule_events'))
  errors.push('Patient journey does not expose reschedule history.');

if (errors.length) {
  console.error('Appointment rescheduling policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Appointment rescheduling policy valid: locked slots, safe rollback, audit, and notifications.'
);
