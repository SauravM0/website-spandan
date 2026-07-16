import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/patient-identity-review-policy.json'));
const migration = read('backend/migrations/040_patient_identity_review.sql');
const service = read('backend/src/services/patientIdentityReview.ts');
const routes = read('backend/src/routes/adminPatientRecords.ts');
const journey = read('backend/src/services/patientRecord.ts');
const ui = read('frontend/src/app/admin/(protected)/patients/identity-reviews/page.tsx');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP21')
  errors.push('Unsupported patient identity-review policy.');
if (policy.deploymentModel !== 'sole-administrator' || policy.automaticMerge !== false)
  errors.push('Identity review must retain the sole-admin, no-auto-merge model.');
if (policy.signals?.length !== 4 || policy.outcomes?.length !== 3)
  errors.push('Identity signals or resolution outcomes are incomplete.');
for (const required of [
  'patient_identity_review_events',
  'patient_identity_review_event_immutable',
  'patient_source_record_delete_blocked',
  'patient_redirect_evidence_protected',
])
  if (!migration.includes(required)) errors.push(`Identity migration is missing ${required}.`);
for (const required of [
  'FOR UPDATE',
  'IDENTITY_TWO_FACTOR_CONFIRMATION_REQUIRED',
  'IDENTITY_FACTOR_MISMATCH',
  'IDENTITY_REVIEW_VERSION_CONFLICT',
  'patient_redirects',
])
  if (!service.includes(required)) errors.push(`Identity service is missing ${required}.`);
if (!routes.includes('PATIENT_IDENTITY_REVIEW') || !routes.includes('requireRecentStepUp'))
  errors.push('Identity review routes lack dedicated permission or step-up authentication.');
if (!journey.includes('identity_group') || !journey.includes('packageOrders'))
  errors.push('Linked patient journey is incomplete.');
if (!ui.includes('Duplicate patient review') || !ui.includes('minimum two'))
  errors.push('Admin duplicate-review queue is incomplete.');

if (errors.length) {
  console.error('Patient identity-review policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Patient identity-review policy valid: human verification, immutable sources, and linked journey.'
);
