import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminAppointmentFiltersSchema,
  adminNotificationBulkRetrySchema,
  adminPaymentFiltersSchema,
  calendarOverrideBatchSchema,
  packageOrderSchema,
  paymentCreateSchema,
  stripHtml,
} from '../src/utils/validation';
import { isValidSlug } from '../src/utils/slug';
import { normalizePublicArticleFilters } from '../src/utils/articleFilters';

const uuid = '11111111-1111-4111-8111-111111111111';

test('stripHtml removes tags and trims user supplied text', () => {
  assert.equal(stripHtml('  <b>Patient</b> needs <script>alert(1)</script>follow up  '), 'Patient needs alert(1)follow up');
});

test('package order validation accepts age zero for infants', () => {
  const parsed = packageOrderSchema.parse({
    purchaser_name: 'Parent Guardian',
    phone: '9876543210',
    items: [
      {
        package_id: uuid,
        patient: {
          full_name: 'Baby Patient',
          phone: '9876543210',
          age_years: 0,
        },
      },
    ],
  });

  assert.equal(parsed.items[0].patient.age_years, 0);
});

test('payment creation requires an appointment or package order id', () => {
  const result = paymentCreateSchema.safeParse({});
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.message, /order_id or appointment_id is required/);
  }
});

test('admin list filters coerce pagination and reject invalid status values', () => {
  const parsed = adminAppointmentFiltersSchema.parse({
    status: 'confirmed',
    page: '2',
    pageSize: '50',
    search: '<b>Aute</b>',
  });

  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 50);
  assert.equal(parsed.search, 'Aute');
  assert.equal(adminPaymentFiltersSchema.safeParse({ status: 'paid' }).success, false);
});

test('notification bulk retry validation limits batch size', () => {
  const valid = adminNotificationBulkRetrySchema.safeParse({ ids: [uuid] });
  const tooLarge = adminNotificationBulkRetrySchema.safeParse({
    ids: Array.from({ length: 26 }, () => uuid),
  });

  assert.equal(valid.success, true);
  assert.equal(tooLarge.success, false);
});

test('calendar override batch requires time range for time-based overrides', () => {
  const invalid = calendarOverrideBatchSchema.safeParse({
    doctor_id: uuid,
    dates: ['2026-07-10'],
    override_type: 'block_time_range',
  });
  const valid = calendarOverrideBatchSchema.safeParse({
    doctor_id: uuid,
    dates: ['2026-07-10'],
    override_type: 'unavailable_whole_day',
  });

  assert.equal(invalid.success, false);
  assert.equal(valid.success, true);
});

test('slug validation rejects path traversal and unsafe characters', () => {
  assert.equal(isValidSlug('basic-cardiac-package'), true);
  assert.equal(isValidSlug('../admin'), false);
  assert.equal(isValidSlug('Package With Spaces'), false);
  assert.equal(isValidSlug(''), false);
});

test('public article filters only allow governed language and format values', () => {
  const parsed = normalizePublicArticleFilters({
    lang: 'mr',
    format: 'video',
    category: ' Cardiology ',
    q: '  diabetes care  ',
  });

  assert.deepEqual(parsed, {
    lang: 'mr',
    format: 'video',
    category: 'Cardiology',
    q: 'diabetes care',
  });

  const rejected = normalizePublicArticleFilters({
    lang: 'fr',
    format: 'external',
    category: '',
    q: '',
  });

  assert.deepEqual(rejected, {
    lang: undefined,
    format: undefined,
    category: undefined,
    q: undefined,
  });
});
