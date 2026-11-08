import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

/**
 * Unpublished doctors must never be readable without a staff session. The
 * public list used to honour `?all=true` for anyone, which exposed profiles the
 * clinic had not approved. These tests pin the public list to published rows and
 * the inactive view behind authentication.
 */

const doctors = [
  { id: 'd1', name: 'Dr. Published', slug: 'dr-published', speciality: 'Cardiology', qualifications: 'MBBS', is_active: true },
  { id: 'd2', name: 'Dr. Unpublished', slug: 'dr-unpublished', speciality: 'Cardiology', qualifications: 'MBBS', is_active: false },
];

const databaseModulePath = require.resolve('../src/config/database');
require.cache[databaseModulePath] = {
  id: databaseModulePath,
  filename: databaseModulePath,
  loaded: true,
  exports: {
    pool: { on() {}, end: async () => {} },
    getClient: async () => {
      throw new Error('not used in this test');
    },
    getDatabasePoolSnapshot: () => ({}),
    async query(sql: string) {
      // Mirror the real filter so the test exercises the repository's SQL choice.
      const rows = /is_active = true/i.test(sql) ? doctors.filter((d) => d.is_active) : doctors;
      return { rows, rowCount: rows.length };
    },
  },
} as unknown as NodeModule;

let server: Server;
let baseUrl: string;

test.before(async () => {
  const { default: app } = await import('../src/index');
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('the public list returns published doctors only', async () => {
  const res = await fetch(`${baseUrl}/api/doctors`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { doctors: { slug: string }[] };
  assert.deepEqual(body.doctors.map((d) => d.slug), ['dr-published']);
});

test('an anonymous request for the inactive list is refused, not answered', async () => {
  const res = await fetch(`${baseUrl}/api/doctors?all=true`);
  assert.equal(res.status, 401);
  const text = await res.text();
  assert.doesNotMatch(text, /dr-unpublished/, 'unpublished profile must not appear in a refusal');
});

test('a malformed session cookie cannot unlock the inactive list', async () => {
  const res = await fetch(`${baseUrl}/api/doctors?all=true`, {
    headers: { cookie: 'admin_session=forged.token.value' },
  });
  assert.equal(res.status, 401);
});
