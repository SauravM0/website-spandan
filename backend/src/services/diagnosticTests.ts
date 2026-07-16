import crypto from 'crypto';
import { getClient, query } from '../config/database';
import { createPatient, type PatientInput } from './operations';

export type DiagnosticTestFilters = {
  search?: string;
  category?: string;
};

export async function listDiagnosticTests(filters: DiagnosticTestFilters = {}) {
  const values: unknown[] = [];
  const conditions = ['is_active = true'];

  if (filters.category) {
    values.push(filters.category);
    conditions.push(`LOWER(category) = LOWER($${values.length})`);
  }
  if (filters.search) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(`(
      name ILIKE $${values.length}
      OR category ILIKE $${values.length}
      OR EXISTS (SELECT 1 FROM unnest(aliases) alias WHERE alias ILIKE $${values.length})
    )`);
  }

  const result = await query(
    `SELECT id, source_number, slug, name, aliases, category, price,
            price_confirmed, preparation_instructions, sample_type,
            report_turnaround, requires_clinic_confirmation
     FROM diagnostic_tests
     WHERE ${conditions.join(' AND ')}
     ORDER BY display_order ASC, name ASC`,
    values
  );

  const tests = result.rows.map((row) => ({
    ...row,
    price: Number(row.price || 0),
    price_confirmed: Boolean(row.price_confirmed),
  }));
  const categories = Array.from(new Set(tests.map((test) => test.category))).sort();
  return { tests, categories, total: tests.length };
}

export async function listAdminDiagnosticTests(filters: DiagnosticTestFilters = {}) {
  const values: unknown[] = [];
  const conditions: string[] = [];
  if (filters.category) {
    values.push(filters.category);
    conditions.push(`LOWER(category) = LOWER($${values.length})`);
  }
  if (filters.search) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(`(name ILIKE $${values.length} OR category ILIKE $${values.length})`);
  }
  const result = await query(
    `SELECT id, source_number, slug, name, category, price, price_confirmed,
            preparation_instructions, requires_clinic_confirmation, is_active,
            display_order, version, updated_at
     FROM diagnostic_tests
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY display_order ASC, name ASC`,
    values
  );
  return result.rows.map((row) => ({ ...row, price: Number(row.price || 0) }));
}

export async function updateDiagnosticTest(input: {
  id: string;
  expected_version: number;
  price: number;
  price_confirmed: boolean;
  is_active: boolean;
  preparation_instructions?: string | null;
}) {
  const result = await query(
    `UPDATE diagnostic_tests
     SET price = $1,
         price_confirmed = $2,
         is_active = $3,
         preparation_instructions = $4,
         version = version + 1,
         updated_at = NOW()
     WHERE id = $5 AND version = $6
     RETURNING *`,
    [
      input.price,
      input.price_confirmed && input.price > 0,
      input.is_active,
      input.preparation_instructions || null,
      input.id,
      input.expected_version,
    ]
  );
  if (!result.rows[0]) {
    const exists = await query('SELECT 1 FROM diagnostic_tests WHERE id = $1', [input.id]);
    const error = new Error(
      exists.rows[0]
        ? 'This test was changed by another user. Refresh and try again.'
        : 'Diagnostic test not found'
    ) as Error & { status?: number; code?: string };
    error.status = exists.rows[0] ? 409 : 404;
    error.code = exists.rows[0] ? 'VERSION_CONFLICT' : 'NOT_FOUND';
    throw error;
  }
  return { ...result.rows[0], price: Number(result.rows[0].price || 0) };
}

export type CustomTestOrderInput = {
  purchaser_name: string;
  phone: string;
  email?: string;
  preferred_date?: string;
  clinical_notes?: string;
  source_language?: string;
  consent: true;
  test_ids: string[];
  patient: PatientInput;
  idempotency_key?: string;
};

function customOrderNumber() {
  return `SPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function createCustomTestOrder(input: CustomTestOrderInput) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    if (input.idempotency_key) {
      const replay = await client.query(
        `SELECT * FROM package_orders WHERE request_idempotency_key = $1 FOR UPDATE`,
        [input.idempotency_key]
      );
      if (replay.rows[0]) {
        await client.query('COMMIT');
        return {
          ...replay.rows[0],
          payment_required:
            replay.rows[0].price_status === 'confirmed' && Number(replay.rows[0].total_amount) > 0,
          replayed: true,
        };
      }
    }

    const uniqueTestIds = Array.from(new Set(input.test_ids));
    const selectedResult = await client.query(
      `SELECT id, name, category, price, price_confirmed, preparation_instructions, display_order
       FROM diagnostic_tests
       WHERE id = ANY($1::uuid[]) AND is_active = true
       ORDER BY display_order ASC`,
      [uniqueTestIds]
    );
    if (selectedResult.rows.length !== uniqueTestIds.length) {
      const error = new Error('One or more selected diagnostic tests are unavailable') as Error & {
        status?: number;
        code?: string;
      };
      error.status = 409;
      error.code = 'DIAGNOSTIC_TEST_UNAVAILABLE';
      throw error;
    }

    const allPricesConfirmed = selectedResult.rows.every(
      (test) => Boolean(test.price_confirmed) && Number(test.price) > 0
    );
    const subtotal = allPricesConfirmed
      ? Number(selectedResult.rows.reduce((sum, test) => sum + Number(test.price), 0).toFixed(2))
      : 0;
    const status = allPricesConfirmed ? 'submitted' : 'price_review';
    const priceStatus = allPricesConfirmed ? 'confirmed' : 'pending';
    const patientId = await createPatient(client, input.patient);

    const order = await client.query(
      `INSERT INTO package_orders (
         order_number, purchaser_name, phone, email, preferred_date, source_language,
         status, subtotal, tax_amount, fee_amount, total_amount, order_type,
         clinical_notes, price_status, consent_given_at, request_idempotency_key
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, 0, 0, $8, 'custom_tests',
         $9, $10, NOW(), $11
       )
       RETURNING *`,
      [
        customOrderNumber(),
        input.purchaser_name,
        input.phone,
        input.email || null,
        input.preferred_date || null,
        input.source_language || 'en',
        status,
        subtotal,
        input.clinical_notes || null,
        priceStatus,
        input.idempotency_key || null,
      ]
    );

    for (let index = 0; index < selectedResult.rows.length; index += 1) {
      const test = selectedResult.rows[index];
      await client.query(
        `INSERT INTO custom_test_order_items (
           order_id, diagnostic_test_id, patient_id, test_name_snapshot,
           category_snapshot, unit_price, price_confirmed_snapshot,
           preparation_snapshot, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.rows[0].id,
          test.id,
          patientId,
          test.name,
          test.category,
          allPricesConfirmed ? Number(test.price) : 0,
          Boolean(test.price_confirmed),
          test.preparation_instructions || null,
          index + 1,
        ]
      );
    }

    await client.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, metadata)
       VALUES ('custom_test_order.created', 'package_order', $1, $2)`,
      [
        order.rows[0].id,
        JSON.stringify({
          test_count: selectedResult.rows.length,
          price_status: priceStatus,
          consent: input.consent,
        }),
      ]
    );
    await client.query(
      `INSERT INTO package_order_events
         (order_id,idempotency_key,event_type,to_status,version_before,version_after,reason,metadata)
       VALUES($1,$2,'order.submitted',$3,0,1,'Custom test order submitted',$4)`,
      [
        order.rows[0].id,
        `created:${order.rows[0].id}`,
        status,
        JSON.stringify({
          test_count: selectedResult.rows.length,
          price_status: priceStatus,
          source: 'public_custom_test_form',
        }),
      ]
    );

    await client.query('COMMIT');
    return {
      ...order.rows[0],
      total_amount: subtotal,
      test_count: selectedResult.rows.length,
      payment_required: allPricesConfirmed && subtotal > 0,
      replayed: false,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
