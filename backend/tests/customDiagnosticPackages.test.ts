import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { customTestOrderSchema } from '../src/utils/validation';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const validRequest = {
  purchaser_name: 'Aarav Sharma',
  phone: '9876543210',
  consent: true,
  test_ids: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
  patient: {
    full_name: 'Aarav Sharma',
    phone: '9876543210',
    age_years: 42,
    gender: 'Male',
  },
};

test('custom diagnostic orders require consent and unique server-known test ids', () => {
  assert.equal(customTestOrderSchema.safeParse(validRequest).success, true);
  assert.equal(customTestOrderSchema.safeParse({ ...validRequest, consent: false }).success, false);
  assert.equal(
    customTestOrderSchema.safeParse({
      ...validRequest,
      test_ids: [validRequest.test_ids[0], validRequest.test_ids[0]],
    }).success,
    false
  );
});

test('the photographed catalogue is retained while its duplicate is hidden publicly', () => {
  const migration = read('migrations/031_custom_diagnostic_packages.sql');
  const seedBlock =
    migration.match(/FROM \(VALUES([\s\S]*?)\) AS source\(source_number/)?.[1] || '';
  assert.equal((seedBlock.match(/^\s+\(\d+,/gm) || []).length, 110);
  assert.match(migration, /source_number = 93/);
  assert.match(migration, /SET is_active = false/);
});

test('zero-price requests cannot enter payment until every selected price is confirmed', () => {
  const service = read('src/services/diagnosticTests.ts');
  assert.match(service, /Boolean\(test\.price_confirmed\) && Number\(test\.price\) > 0/);
  assert.match(service, /allPricesConfirmed \? 'submitted' : 'price_review'/);
  assert.match(service, /payment_required: allPricesConfirmed && subtotal > 0/);
});
