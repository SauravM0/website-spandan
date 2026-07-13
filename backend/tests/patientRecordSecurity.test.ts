import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PERMISSIONS, roleHasPermission } from '../src/security/permissions';

const migration=readFileSync(join(process.cwd(),'migrations/020_patient_record_foundation.sql'),'utf8');
const routes=readFileSync(join(process.cwd(),'src/routes/adminPatientRecords.ts'),'utf8');

test('clinical and identity permissions remain least privilege',()=>{
 assert.equal(roleHasPermission('doctor',PERMISSIONS.CLINICAL_WRITE),true);
 assert.equal(roleHasPermission('reception',PERMISSIONS.CLINICAL_WRITE),false);
 assert.equal(roleHasPermission('billing',PERMISSIONS.PATIENTS_READ),false);
 assert.equal(roleHasPermission('reception',PERMISSIONS.PATIENTS_WRITE),true);
});
test('signed notes are immutable and corrections create versions',()=>{
 assert.match(migration,/Signed clinical notes are immutable; create an amendment/);
 assert.match(migration,/UNIQUE\(note_id, version\)/);
 assert.match(migration,/amendment_reason TEXT/);
});
test('clinical writes require CSRF/auth permission and idempotency',()=>{
 assert.match(routes,/router\.use\(authenticate\)/);
 assert.match(routes,/requirePermission\(PERMISSIONS\.CLINICAL_WRITE\)/);
 assert.match(routes,/Idempotency-Key/);
});
test('identity aliases and encounter context cannot cascade-delete patient history',()=>{
 assert.match(migration,/patient_identifiers[\s\S]*patients\(id\) ON DELETE RESTRICT/);
 assert.match(migration,/encounters[\s\S]*patients\(id\) ON DELETE RESTRICT/);
 assert.match(migration,/patient_redirects/);
});
