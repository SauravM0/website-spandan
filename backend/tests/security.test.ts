import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { generateCsrfToken, isValidCsrfToken, validateCsrfToken } from '../src/middleware/csrf';
import { requirePermission } from '../src/middleware/authorize';
import { PERMISSIONS, permissionsForRole } from '../src/security/permissions';
import { config } from '../src/config';

function response() {
  const state = { status: 200, body: undefined as unknown };
  const res = {
    locals: { requestId: 'test-request' },
    status(code: number) { state.status = code; return this; },
    json(body: unknown) { state.body = body; return this; },
  } as unknown as Response;
  return { res, state };
}

test('CSRF tokens are signed, expire, and reject alteration', () => {
  const issuedAt = Date.now();
  const token = generateCsrfToken(issuedAt);
  assert.equal(isValidCsrfToken(token, issuedAt + 1000), true);
  assert.equal(isValidCsrfToken(`${token}x`, issuedAt + 1000), false);
  assert.equal(isValidCsrfToken(token, issuedAt + 61 * 60 * 1000), false);
});

test('cookie-authenticated unsafe requests require allowed origin and CSRF', () => {
  const { res, state } = response();
  let nextCalled = false;
  const req = {
    method: 'POST',
    headers: { cookie: `${config.adminSessionCookieName}=session`, origin: config.corsOrigins[0] },
    get(name: string) { return this.headers[name.toLowerCase() as keyof typeof this.headers]; },
  } as unknown as Request;
  validateCsrfToken(req, res, (() => { nextCalled = true; }) as NextFunction);
  assert.equal(nextCalled, false);
  assert.equal(state.status, 403);
});

test('bearer/public unsafe requests without a session cookie are outside cookie CSRF policy', () => {
  const { res } = response();
  let nextCalled = false;
  const req = { method: 'POST', headers: {}, get() { return undefined; } } as unknown as Request;
  validateCsrfToken(req, res, (() => { nextCalled = true; }) as NextFunction);
  assert.equal(nextCalled, true);
});

test('unknown roles are deny-by-default', () => {
  assert.deepEqual(permissionsForRole('unexpected_role'), []);
});

test('doctor can acquire calendar mutation permission for controller-enforced own-schedule writes', () => {
  const { res, state } = response();
  let nextCalled = false;
  const req = { user: { role: 'doctor' } } as never;
  requirePermission(PERMISSIONS.CALENDAR_WRITE)(req, res, (() => { nextCalled = true; }) as NextFunction);
  assert.equal(nextCalled, true);
  assert.equal(state.status, 200);
});
