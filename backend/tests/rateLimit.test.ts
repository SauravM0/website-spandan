import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

/**
 * The limiter is the backstop in front of every public endpoint, so it is worth
 * proving it actually rejects rather than assuming the configuration is live.
 *
 * `API_REPLICA_COUNT` is set to 2 here: the counters live in process memory, so
 * a two-replica deployment would otherwise hand each client twice the intended
 * cluster budget. Halving the per-process ceiling is what keeps the cluster-wide
 * limit close to the number that was configured.
 */

let server: Server;
let baseUrl: string;

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
    async query() {
      return { rows: [], rowCount: 0 };
    },
  },
} as unknown as NodeModule;

test.before(async () => {
  process.env.API_REPLICA_COUNT = '2';
  process.env.RATE_LIMIT_PUBLIC_GET_MAX = '10'; // 10 cluster-wide -> 5 per replica
  const { default: app } = await import('../src/index');
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.after(async () => {
  delete process.env.API_REPLICA_COUNT;
  delete process.env.RATE_LIMIT_PUBLIC_GET_MAX;
  await new Promise((resolve) => server.close(resolve));
});

test('a public endpoint starts rejecting once the per-replica budget is spent', async () => {
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await fetch(`${baseUrl}/api/packages`);
    statuses.push(res.status);
  }

  const allowed = statuses.filter((status) => status !== 429).length;
  const rejected = statuses.filter((status) => status === 429).length;

  // 10 cluster-wide across 2 replicas is 5 here, so the tail must be refused.
  assert.equal(allowed, 5, `expected 5 allowed, saw ${JSON.stringify(statuses)}`);
  assert.equal(rejected, 3, `expected 3 rejected, saw ${JSON.stringify(statuses)}`);
});

test('a rejection explains itself instead of failing blank', async () => {
  const res = await fetch(`${baseUrl}/api/packages`);
  assert.equal(res.status, 429);

  const body = (await res.json()) as { error?: { code?: string; message?: string } };
  assert.equal(body.error?.code, 'RATE_LIMITED');
  assert.match(String(body.error?.message), /slow down/i);
  assert.ok(res.headers.get('ratelimit-limit'), 'standard RateLimit headers should be sent');
});
