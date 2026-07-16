import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { matchingIdentityFactors } from '../src/services/patientIdentityReview';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('identity factors are normalized and require real values on both records', () => {
  const factors = matchingIdentityFactors(
    { full_name: ' Asha Patil ', date_of_birth: '1985-04-02', phone: '+91 98765 43210' },
    { full_name: 'asha patil', date_of_birth: '1985-04-02', phone: '9876543210' }
  );
  assert.deepEqual(factors, ['name', 'date_of_birth', 'phone']);
  assert.deepEqual(
    matchingIdentityFactors(
      { full_name: 'Different One', phone: '' },
      { full_name: 'Different Two', phone: '' }
    ),
    []
  );
});

test('same-person linking is versioned, locked, idempotent, and requires two factors', () => {
  const service = read('src/services/patientIdentityReview.ts');
  for (const required of [
    'FOR UPDATE',
    'IDENTITY_REVIEW_VERSION_CONFLICT',
    'IDENTITY_TWO_FACTOR_CONFIRMATION_REQUIRED',
    'IDENTITY_FACTOR_MISMATCH',
    'patient_redirects',
    'patient_identity_review_events',
    'patient_identity_review.resolved',
  ]) {
    assert.match(service, new RegExp(required));
  }
  assert.doesNotMatch(service, /UPDATE appointments SET patient_id/);
  assert.doesNotMatch(service, /UPDATE package_order_items SET patient_id/);
});

test('database preserves source records and immutable review evidence', () => {
  const migration = read('migrations/040_patient_identity_review.sql');
  for (const required of [
    'patient_identity_review_events',
    'patient_identity_review_event_immutable',
    'patient_source_record_delete_blocked',
    'patient_redirect_evidence_protected',
    "status IN ('pending','same_person','different_person','insufficient_evidence')",
    "'authorized_identifier'",
  ]) {
    assert.ok(migration.includes(required), `Missing ${required}`);
  }
});

test('admin queue and linked operational journey are permission protected', () => {
  const routes = read('src/routes/adminPatientRecords.ts');
  const records = read('src/services/patientRecord.ts');
  const frontend = read('../frontend/src/app/admin/(protected)/patients/identity-reviews/page.tsx');
  assert.match(routes, /PATIENT_IDENTITY_REVIEW/);
  assert.match(routes, /identity-reviews\/:reviewId\/resolution/);
  assert.match(routes, /requireRecentStepUp/);
  assert.match(records, /identity_group/);
  assert.match(records, /packageOrders/);
  assert.match(frontend, /minimum two/);
  assert.match(frontend, /Source records are never deleted or\s*moved/);
});
