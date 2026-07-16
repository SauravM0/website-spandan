import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/appointment-transition-policy.json'));
const migration = read('backend/migrations/037_transactional_appointment_transitions.sql');
const service = read('backend/src/services/operations.ts');
const routes = read('backend/src/routes/adminOperations.ts');
const controller = read('backend/src/controllers/operationsController.ts');
const validation = read('backend/src/utils/validation.ts');
const frontend = read('frontend/src/lib/api.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP18')
  errors.push('Unsupported appointment transition policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Deployment must retain the approved sole-administrator model.');
if (!policy.concurrency?.rowLock || !policy.concurrency?.expectedVersionRequired)
  errors.push('Appointment transitions require row locking and optimistic concurrency.');
if (policy.actions?.length !== 6) errors.push('Appointment command set is incomplete.');
for (const required of [
  'appointment_payment_evidence',
  'appointment_transition_events',
  'appointment_payment_evidence_immutable',
  'appointment_financial_evidence_required',
  'version_after = version_before + 1',
])
  if (!migration.includes(required)) errors.push(`Transition migration is missing ${required}.`);
for (const required of [
  'FOR UPDATE',
  'APPOINTMENT_VERSION_CONFLICT',
  'APPOINTMENT_FINANCIAL_EVIDENCE_REQUIRED',
  'provider_evidence_hash IS NOT NULL',
  'APPOINTMENT_CASH_AMOUNT_MISMATCH',
  'appointment.transitioned',
  'beforeSnapshot',
  'afterSnapshot',
])
  if (!service.includes(required)) errors.push(`Transition command is missing ${required}.`);
if (!routes.includes("'/appointments/:id/transitions'"))
  errors.push('Command-specific appointment route is missing.');
if (routes.includes("'/appointments/:id/status'"))
  errors.push('Legacy generic appointment status route remains.');
if (!controller.includes('IDEMPOTENCY_KEY_REQUIRED'))
  errors.push('Appointment commands do not require idempotency.');
if (!validation.includes('appointmentTransitionSchema'))
  errors.push('Appointment command validation is missing.');
if (!frontend.includes('transitionAdminAppointment'))
  errors.push('Admin client still uses the generic status mutation.');

if (errors.length) {
  console.error('Appointment transition policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Appointment transition policy valid: versioned commands, financial evidence, and audit.'
);
