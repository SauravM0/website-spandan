import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/clinical-authorization-policy.json'));
const migration = read('backend/migrations/034_patient_clinical_authorization.sql');
const routes = read('backend/src/routes/adminPatientRecords.ts');
const documentRoutes = read('backend/src/routes/adminMedicalDocuments.ts');
const authorization = read('backend/src/security/clinicalAuthorization.ts');
const patientService = read('backend/src/services/patientRecord.ts');
const documentService = read('backend/src/services/medicalDocuments.ts');
const medicationService = read('backend/src/services/medications.ts');
const observationService = read('backend/src/services/observations.ts');
const deviceService = read('backend/src/services/deviceIntegrations.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP15')
  errors.push('Unsupported clinical authorization policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Deployment must retain the approved sole-administrator model.');
if (policy.separation?.length !== 6) errors.push('Patient data classifications are incomplete.');
if (policy.restrictedAccess?.grantLevels?.length !== 2 || !policy.restrictedAccess.grantsExpire)
  errors.push('Restricted access requires expiring clinical and document-content grants.');

for (const required of [
  'patient_confidentiality_grants',
  'prevent_confidentiality_grant_delete',
  'protect_confidentiality_grant_evidence',
  "access_level IN ('clinical','document_content')",
])
  if (!migration.includes(required)) errors.push(`Authorization migration is missing ${required}.`);
for (const required of [
  "'/:patientId/summary'",
  "'/:patientId/appointments'",
  "'/:patientId/clinical/timeline'",
  "'/:patientId/documents'",
  "'/:patientId/documents/:id/content'",
])
  if (!routes.includes(required)) errors.push(`Patient contract is missing ${required}.`);
if (!routes.includes('PERMISSIONS.CLINICAL_READ'))
  errors.push('Clinical reads require CLINICAL_READ.');
if (
  !routes.includes('PERMISSIONS.DOCUMENTS_CONTENT_READ') ||
  !documentRoutes.includes('PERMISSIONS.DOCUMENTS_CONTENT_READ')
)
  errors.push('Document content must use its dedicated permission.');
for (const source of [
  patientService,
  documentService,
  medicationService,
  observationService,
  deviceService,
])
  if (!source.includes('assertPatientClinicalAccess'))
    errors.push('A clinical data service is missing centralized patient scope enforcement.');
for (const required of ['doctor_id', 'patient_confidentiality_grants', 'document_content'])
  if (!authorization.includes(required))
    errors.push(`Central authorization is missing ${required}.`);
if (!routes.includes('auditSensitiveAccess') || !documentRoutes.includes('auditSensitiveAccess'))
  errors.push('Sensitive access success and denial auditing is required.');

if (errors.length) {
  console.error('Clinical authorization policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Clinical authorization policy valid: split APIs, restricted grants, doctor scope, and audited outcomes.'
);
