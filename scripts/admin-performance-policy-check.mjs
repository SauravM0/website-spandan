import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/admin-performance-policy.json'));
const migration = read('backend/migrations/042_admin_query_performance.sql');
const operations = read('backend/src/services/operations.ts');
const patients = read('backend/src/services/patientRecord.ts');
const worker = read('backend/src/worker/jobs.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP24')
  errors.push('Unsupported admin performance policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Performance work must retain the sole-administrator deployment model.');
if (policy.pagination !== 'deterministic-keyset' || policy.maximumPageSize > 50)
  errors.push('Critical admin lists must use bounded deterministic keyset paging.');
for (const index of policy.requiredIndexes || [])
  if (!migration.includes(index)) errors.push(`Required measured index is missing: ${index}.`);
if (/\bOFFSET\b/.test(operations) || /\bOFFSET\b/.test(patients))
  errors.push('Critical operational services still use offset paging.');
for (const required of [
  'appointment_metrics AS',
  'candidate_orders AS MATERIALIZED',
  'getPaymentsSummary',
  'admin_export_jobs',
  'rows.length >= 50_000',
])
  if (!operations.includes(required))
    errors.push(`Performance implementation is missing ${required}.`);
if (!patients.includes('(p.updated_at,p.id)') || !patients.includes('appointmentsCursor'))
  errors.push('Patient cursors or lazy journey paging are incomplete.');
if (!worker.includes("'admin-export'")) errors.push('Asynchronous export worker is missing.');

if (errors.length) {
  console.error('Admin performance policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Admin performance policy valid: keyset lists, set aggregates, ranges, and async exports.'
);
