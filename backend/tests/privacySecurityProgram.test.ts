import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { redact } from '../src/utils/redaction';
import { PERMISSIONS, roleHasPermission } from '../src/security/permissions';

const migration=readFileSync(join(process.cwd(),'migrations/026_privacy_security_program.sql'),'utf8');

test('structured logging recursively redacts sensitive fields',()=>{
  assert.deepEqual(redact({requestId:'r1',patient:{name:'A',status:'ok'},authorization:'Bearer x'}),{requestId:'r1',patient:{name:'[REDACTED]',status:'ok'},authorization:'[REDACTED]'});
});

test('privacy/security administration is deny-by-default',()=>{
  assert.equal(roleHasPermission('admin',PERMISSIONS.PRIVACY_REQUESTS_MANAGE),true);
  assert.equal(roleHasPermission('manager',PERMISSIONS.PRIVACY_REQUESTS_MANAGE),false);
  assert.equal(roleHasPermission('staff',PERMISSIONS.SECURITY_ADMIN),false);
});

test('database makes audit append-only and rights actions identity-gated',()=>{
  assert.match(migration,/audit_log is append-only/);
  assert.match(migration,/status = 'pending_identity_verification' OR identity_verified_at IS NOT NULL/);
  assert.match(migration,/status <> 'approved'.*contract_reference IS NOT NULL/s);
});
