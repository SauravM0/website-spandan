import assert from 'node:assert/strict';
import test from 'node:test';
import {
  publicPackageDetail,
  publicPackageSummary,
} from '../src/controllers/publicPackagesController';
import type { Package, PackageTest } from '../src/domain/entities';

function makePackage(overrides: Partial<Package> = {}): Package {
  return {
    id: 'pkg-1',
    slug: 'diabetic-package',
    name: 'Diabetic Package',
    short_description: 'Diabetes review and monitoring',
    description: 'Full diabetes evaluation.',
    // Postgres hands NUMERIC back as a string, which is what the mapper sees.
    base_price: '2499' as unknown as number,
    discounted_price: '1799' as unknown as number,
    show_price_publicly: true,
    prep_instructions: 'Fast for 10-12 hours.',
    image_url: null,
    category: 'diabetes',
    primary_doctor_id: null,
    display_order: 1,
    is_active: true,
    version: 1,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-02-01T00:00:00Z'),
    ...overrides,
  } as Package;
}

function makeTest(overrides: Partial<PackageTest> = {}): PackageTest {
  return {
    id: 'test-1',
    package_id: 'pkg-1',
    test_name: 'HbA1c',
    test_category: 'Blood',
    description: null,
    sort_order: 1,
    created_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as PackageTest;
}

test('summary exposes prices only when the clinic cleared them for publication', () => {
  const shown = publicPackageSummary(makePackage(), []);
  assert.equal(shown.base_price, 2499);
  assert.equal(shown.current_price, 1799);
  assert.equal(shown.original_price, 2499);

  const withheld = publicPackageSummary(makePackage({ show_price_publicly: false }), []);
  assert.equal(withheld.base_price, null);
  assert.equal(withheld.current_price, null);
  assert.equal(withheld.original_price, null);
});

test('a package with no real discount reports no offer', () => {
  const summary = publicPackageSummary(
    makePackage({ discounted_price: '2499' as unknown as number, discount_label: 'Save now' }),
    []
  );
  assert.equal(summary.current_price, 2499);
  assert.equal(summary.original_price, null);
  assert.equal(summary.discount_label, null);
});

test('a package with no discounted price falls back to the base price', () => {
  const summary = publicPackageSummary(makePackage({ discounted_price: null }), []);
  assert.equal(summary.current_price, 2499);
  assert.equal(summary.original_price, null);
});

test('inclusions are ordered by sort order and previewed to three', () => {
  const tests = [
    makeTest({ id: 't4', test_name: 'TSH', sort_order: 4 }),
    makeTest({ id: 't1', test_name: 'HbA1c', sort_order: 1 }),
    makeTest({ id: 't3', test_name: 'Lipid Profile', sort_order: 3 }),
    makeTest({ id: 't2', test_name: 'Complete Blood Count', sort_order: 2 }),
  ];
  const summary = publicPackageSummary(makePackage(), tests);
  assert.deepEqual(summary.key_inclusions, ['HbA1c', 'Complete Blood Count', 'Lipid Profile']);
  assert.equal(summary.inclusion_count, 4);
});

test('detail returns every test in order alongside the summary fields', () => {
  const tests = [
    makeTest({ id: 't2', test_name: 'TSH', sort_order: 2 }),
    makeTest({ id: 't1', test_name: 'HbA1c', sort_order: 1 }),
  ];
  const detail = publicPackageDetail(makePackage({ exclusions: 'No imaging.' }), tests);
  assert.equal(detail.tests.length, 2);
  assert.deepEqual(
    detail.tests.map((t) => t.test_name),
    ['HbA1c', 'TSH']
  );
  assert.equal(detail.description, 'Full diabetes evaluation.');
  assert.equal(detail.exclusions, 'No imaging.');
  assert.equal(detail.inclusion_count, 2);
});

test('an unavailable package is reported as not bookable', () => {
  assert.equal(publicPackageSummary(makePackage(), []).bookable, true);
  assert.equal(
    publicPackageSummary(makePackage({ purchase_status: 'unavailable' }), []).bookable,
    false
  );
  assert.equal(
    publicPackageSummary(makePackage({ purchase_enabled: false }), []).bookable,
    false
  );
});
