import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  assertPatientClinicalAccess,
  isClinicalAdministrator,
  restrictedClinicalPredicate,
  type ClinicalActor,
} from '../src/security/clinicalAuthorization';
import { PERMISSIONS, roleHasPermission } from '../src/security/permissions';

const admin: ClinicalActor = { id: 'admin-id', role: 'admin', doctor_id: null };
const doctor: ClinicalActor = { id: 'staff-id', role: 'doctor', doctor_id: 'doctor-id' };

test('sole administrator is the only implicit restricted-record authority', () => {
  assert.equal(isClinicalAdministrator(admin), true);
  assert.equal(isClinicalAdministrator({ ...admin, role: 'system_admin' }), true);
  assert.equal(isClinicalAdministrator(doctor), false);
  assert.equal(isClinicalAdministrator({ ...admin, role: 'manager' }), false);
});

test('clinical access query binds patient, staff, doctor, encounter, and access level', async () => {
  let captured: unknown[] = [];
  await assertPatientClinicalAccess(
    {
      async query(_text: string, parameters: unknown[]) {
        captured = parameters;
        return { rows: [{ id: 'patient-id' }] };
      },
    },
    'patient-id',
    doctor,
    'document_content',
    'encounter-id'
  );
  assert.deepEqual(captured, [
    'patient-id',
    'staff-id',
    false,
    'doctor-id',
    'encounter-id',
    'document_content',
  ]);
});

test('missing patient, doctor scope, or confidentiality grant is denied', async () => {
  await assert.rejects(
    assertPatientClinicalAccess(
      {
        async query() {
          return { rows: [] };
        },
      },
      'patient-id',
      doctor
    ),
    (error: any) => error.status === 403 && error.code === 'CLINICAL_SCOPE_DENIED'
  );
});

test('restricted row predicates fail open only for the sole administrator', () => {
  assert.equal(restrictedClinicalPredicate(admin, 'r', 'p', 2).sql, '');
  const scoped = restrictedClinicalPredicate(doctor, 'r', 'p', 3);
  assert.match(scoped.sql, /r\.confidentiality='normal'/);
  assert.match(scoped.sql, /patient_confidentiality_grants/);
  assert.deepEqual(scoped.params, ['staff-id']);
});

test('demographic, clinical, and document-content capabilities remain separate', () => {
  assert.equal(roleHasPermission('reception', PERMISSIONS.PATIENTS_READ), true);
  assert.equal(roleHasPermission('reception', PERMISSIONS.CLINICAL_READ), false);
  assert.equal(roleHasPermission('reception', PERMISSIONS.DOCUMENTS_CONTENT_READ), false);
  assert.equal(roleHasPermission('doctor', PERMISSIONS.DOCUMENTS_CONTENT_READ), true);
  assert.equal(roleHasPermission('billing', PERMISSIONS.CLINICAL_READ), false);
  assert.equal(roleHasPermission('admin', PERMISSIONS.CLINICAL_READ), true);
});

test('patient and document routes expose only explicitly authorized contracts', () => {
  const root = path.resolve(__dirname, '..');
  const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
  const patients = read('src/routes/adminPatientRecords.ts');
  const documents = read('src/routes/adminMedicalDocuments.ts');
  const patientService = read('src/services/patientRecord.ts');
  const documentService = read('src/services/medicalDocuments.ts');
  const migration = read('migrations/034_patient_clinical_authorization.sql');
  for (const route of [
    "'/:patientId/summary'",
    "'/:patientId/appointments'",
    "'/:patientId/clinical/timeline'",
    "'/:patientId/documents'",
    "'/:patientId/documents/:id/content'",
  ])
    assert.match(patients, new RegExp(route.replace(/[/:]/g, '\\$&')));
  assert.doesNotMatch(patients, /router\.get\(\s*'\/:patientId',/);
  assert.match(patients, /PERMISSIONS\.CLINICAL_READ/);
  assert.match(patients, /PERMISSIONS\.DOCUMENTS_CONTENT_READ/);
  assert.match(documents, /PERMISSIONS\.DOCUMENTS_CONTENT_READ/);
  assert.match(patientService, /patient_confidentiality_grants/);
  assert.match(documentService, /patient_confidentiality_grants/);
  assert.match(patients, /auditSensitiveAccess/);
  assert.match(migration, /protect_confidentiality_grant_evidence/);
});
