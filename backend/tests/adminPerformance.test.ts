import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const read = (file: string) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('critical admin lists use deterministic keyset cursors and indexed time ranges', () => {
  const operations = read('src/services/operations.ts');
  const patients = read('src/services/patientRecord.ts');
  assert.doesNotMatch(operations, /\bOFFSET\b/);
  assert.doesNotMatch(patients, /\bOFFSET\b/);
  assert.match(operations, /\(a\.appointment_date,a\.start_time,a\.id\)/);
  assert.match(operations, /\(p\.created_at,p\.id\)/);
  assert.match(operations, /sort\.startsWith\('updated'\) \? 'p\.updated_at' : 'p\.created_at'/);
  assert.match(patients, /\(p\.updated_at,p\.id\)/);
  assert.doesNotMatch(operations, /p\.created_at::date/);
});

test('dashboard and package lists aggregate each bounded relation set-wise', () => {
  const operations = read('src/services/operations.ts');
  assert.match(operations, /appointment_metrics AS/);
  assert.match(operations, /COUNT\(\*\) FILTER/);
  assert.match(operations, /candidate_orders AS MATERIALIZED/);
  assert.match(operations, /GROUP BY item\.order_id/);
  assert.doesNotMatch(operations, /THEN \(SELECT COUNT\(\*\).*custom_test_order_items/);
});

test('large exports run in the worker and download in bounded response chunks', () => {
  const migration = read('migrations/042_admin_query_performance.sql');
  const operations = read('src/services/operations.ts');
  const worker = read('src/worker/jobs.ts');
  const routes = read('src/routes/adminOperations.ts');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS admin_export_jobs/);
  assert.match(migration, /VALUES\('admin-export',5,NOW\(\),5\)/);
  assert.match(operations, /FOR UPDATE SKIP LOCKED LIMIT 1/);
  assert.match(operations, /rows\.length >= 50_000/);
  assert.match(worker, /'admin-export'/);
  assert.match(routes, /'\/exports\/:id\/download'/);
});

test('patient operational and clinical timelines are initially bounded and lazy-pageable', () => {
  const patient = read('src/services/patientRecord.ts');
  const routes = read('src/routes/adminPatientRecords.ts');
  const page = fs.readFileSync(
    new URL('../../frontend/src/app/admin/(protected)/patients/[id]/page.tsx', import.meta.url),
    'utf8'
  );
  assert.match(patient, /appointmentsCursor/);
  assert.match(patient, /LIMIT 25/);
  assert.match(routes, /page_size/);
  assert.match(page, /Load older appointments/);
});
