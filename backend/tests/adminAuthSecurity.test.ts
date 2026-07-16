import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { NextFunction, Response } from 'express';
import {
  authenticationFingerprint,
  base32Encode,
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  recoveryCodeHash,
  totpAt,
  verifyTotp,
} from '../src/security/authSecurity';
import { requireRecentStepUp, type AuthenticatedRequest } from '../src/middleware/auth';
import { config } from '../src/config';

test('TOTP follows the RFC vector and rejects malformed or replayed codes', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(totpAt(secret, 1), '287082');
  assert.equal(verifyTotp(secret, '287082', null, 59_000), 1);
  assert.equal(verifyTotp(secret, '287082', 1, 59_000), null);
  assert.equal(verifyTotp(secret, '12345', null, 59_000), null);
});

test('MFA secrets are authenticated, versioned, and fail on tampering', () => {
  const encrypted = encryptMfaSecret('JBSWY3DPEHPK3PXP', 'a'.repeat(48), 'v7');
  assert.equal(decryptMfaSecret(encrypted, 'a'.repeat(48), 'v7'), 'JBSWY3DPEHPK3PXP');
  assert.throws(() => decryptMfaSecret(encrypted, 'a'.repeat(48), 'v6'), /version/);
  const parts = encrypted.split('.');
  parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`;
  assert.throws(() => decryptMfaSecret(parts.join('.'), 'a'.repeat(48), 'v7'));
});

test('recovery codes are unique and stored only as normalized hashes', () => {
  const codes = generateRecoveryCodes();
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes).size, 8);
  assert.ok(codes.every((code) => /^[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/.test(code)));
  assert.equal(
    recoveryCodeHash('admin', codes[0]),
    recoveryCodeHash('admin', codes[0].toLowerCase())
  );
  assert.notEqual(recoveryCodeHash('admin', codes[0]), recoveryCodeHash('other', codes[0]));
});

test('account and IP throttling fingerprints are scoped and normalized', () => {
  assert.equal(
    authenticationFingerprint('account', ' ADMIN@EXAMPLE.TEST '),
    authenticationFingerprint('account', 'admin@example.test')
  );
  assert.notEqual(
    authenticationFingerprint('account', '127.0.0.1'),
    authenticationFingerprint('ip', '127.0.0.1')
  );
});

test('step-up middleware permits only a recent verification', () => {
  const statuses: number[] = [];
  const response = {
    locals: { requestId: 'auth-test-request' },
    status(code: number) {
      statuses.push(code);
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  let nextCalls = 0;
  const next = (() => nextCalls++) as NextFunction;

  requireRecentStepUp({} as AuthenticatedRequest, response, next);
  assert.deepEqual(statuses, [403]);
  requireRecentStepUp(
    {
      stepUpVerifiedAt: new Date(Date.now() - config.adminStepUpMaxAgeMs - 1).toISOString(),
    } as AuthenticatedRequest,
    response,
    next
  );
  assert.deepEqual(statuses, [403, 403]);
  requireRecentStepUp(
    { stepUpVerifiedAt: new Date().toISOString() } as AuthenticatedRequest,
    response,
    next
  );
  assert.equal(nextCalls, 1);
});

test('admin authentication implementation uses shared state and bounded MFA sessions', () => {
  const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const service = read('src/services/adminAuth.ts');
  const middleware = read('src/middleware/auth.ts');
  const routes = read('src/routes/adminAuth.ts');
  assert.match(service, /staff_login_throttles/);
  assert.match(service, /staff_auth_challenges/);
  assert.match(service, /FOR UPDATE/);
  assert.match(service, /revoke_reason='password_changed'/);
  assert.match(middleware, /idle_expires_at>NOW\(\) AND absolute_expires_at>NOW\(\)/);
  assert.match(middleware, /decoded\.mfa !== true/);
  assert.match(middleware, /refreshMfaSession/);
  assert.match(routes, /requireRecentStepUp/);
  assert.match(routes, /PERMISSIONS\.SECURITY_ADMIN/);
});
