import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

/**
 * Exercises the real Express routes end to end with only the database driver
 * stubbed, so route mounting, slug validation, the 404 path, and the JSON shape
 * the website consumes are all covered without needing a live Postgres.
 */

type Row = Record<string, unknown>;

const packageRow: Row = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'diabetic-package',
  name: 'Diabetic Package',
  short_description: 'Diabetes review and monitoring',
  description: 'Full diabetes evaluation.',
  base_price: '2499',
  discounted_price: '1799',
  show_price_publicly: true,
  prep_instructions: 'Fast for 10-12 hours.',
  category: 'diabetes',
  test_category: 'diabetes',
  age_sex_applicability: 'Adults with diabetes',
  display_order: 1,
  is_active: true,
  purchase_status: 'available',
  purchase_enabled: true,
  fasting_required: true,
  fasting_duration: '10-12 hours',
  consultation_included: true,
  report_turnaround: 'Same day',
  updated_at: new Date('2026-02-01T00:00:00Z'),
};

const testRows: Row[] = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    package_id: packageRow.id,
    test_name: 'HbA1c',
    test_category: 'Blood',
    description: null,
    sort_order: 1,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    package_id: packageRow.id,
    test_name: 'Lipid Profile',
    test_category: 'Blood',
    description: null,
    sort_order: 2,
  },
];

const seenSql: string[] = [];

// tsx compiles these tests to CommonJS, so the database module is replaced in
// the require cache before the app is loaded. Every module that imports it then
// receives this stub and no real connection pool is ever opened.
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
    async query(sql: string, values?: unknown[]) {
      seenSql.push(sql);
      if (/FROM packages/i.test(sql)) {
        const slug = values?.[0];
        if (slug !== undefined && slug !== packageRow.slug) return { rows: [], rowCount: 0 };
        return { rows: [packageRow], rowCount: 1 };
      }
      if (/FROM package_tests/i.test(sql)) {
        return { rows: testRows, rowCount: testRows.length };
      }
      return { rows: [], rowCount: 0 };
    },
  },
} as unknown as NodeModule;

let server: Server;
let baseUrl: string;

test.before(async () => {
  // Imported after the database mock is registered, so the app wires itself to
  // the stub rather than opening a real pool. tsx emits CJS here, so this
  // cannot be a top-level await.
  const { default: app } = await import('../src/index');
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/packages returns the published catalogue', async () => {
  const res = await fetch(`${baseUrl}/api/packages`);
  assert.equal(res.status, 200);

  const body = (await res.json()) as { packages: Record<string, unknown>[] };
  assert.equal(body.packages.length, 1);

  const pkg = body.packages[0];
  assert.equal(pkg.slug, 'diabetic-package');
  assert.equal(pkg.name, 'Diabetic Package');
  assert.equal(pkg.current_price, 1799);
  assert.equal(pkg.original_price, 2499);
  assert.equal(pkg.inclusion_count, 2);
  assert.deepEqual(pkg.key_inclusions, ['HbA1c', 'Lipid Profile']);
  assert.equal(pkg.bookable, true);
});

test('the catalogue reads its tests in one batched query, not one per package', () => {
  const testQueries = seenSql.filter((sql) => /FROM package_tests/i.test(sql));
  assert.ok(testQueries.some((sql) => /= ANY\(\$1::uuid\[\]\)/.test(sql)));
});

test('GET /api/packages?include=tests returns every package with its tests in one call', async () => {
  const before = seenSql.length;
  const res = await fetch(`${baseUrl}/api/packages?include=tests`);
  assert.equal(res.status, 200);

  const body = (await res.json()) as { packages: Record<string, unknown>[] };
  assert.equal(body.packages.length, 1);
  assert.deepEqual(
    (body.packages[0].tests as { test_name: string }[]).map((t) => t.test_name),
    ['HbA1c', 'Lipid Profile']
  );
  assert.equal(body.packages[0].description, 'Full diabetes evaluation.');

  // The whole catalogue, tests included, must cost one packages query plus one
  // batched tests query - never one request per package.
  const queries = seenSql.slice(before);
  assert.equal(queries.filter((sql) => /FROM packages/i.test(sql)).length, 1);
  assert.equal(queries.filter((sql) => /FROM package_tests/i.test(sql)).length, 1);
  assert.equal(queries.length, 2);
});

test('the plain listing stays a summary and does not ship test lists', async () => {
  const res = await fetch(`${baseUrl}/api/packages`);
  const body = (await res.json()) as { packages: Record<string, unknown>[] };
  assert.equal(body.packages[0].tests, undefined);
  assert.equal(body.packages[0].inclusion_count, 2);
});

test('GET /api/packages/:slug returns the full test list', async () => {
  const res = await fetch(`${baseUrl}/api/packages/diabetic-package`);
  assert.equal(res.status, 200);

  const body = (await res.json()) as { package: Record<string, unknown> };
  assert.equal(body.package.slug, 'diabetic-package');
  assert.equal(body.package.description, 'Full diabetes evaluation.');
  assert.deepEqual(
    (body.package.tests as { test_name: string }[]).map((t) => t.test_name),
    ['HbA1c', 'Lipid Profile']
  );
});

test('an unknown slug is a 404, not a 500', async () => {
  const res = await fetch(`${baseUrl}/api/packages/no-such-package`);
  assert.equal(res.status, 404);
});

test('a malformed slug is rejected before it reaches the database', async () => {
  const res = await fetch(`${baseUrl}/api/packages/Not%20A%20Slug`);
  assert.equal(res.status, 404);
});
