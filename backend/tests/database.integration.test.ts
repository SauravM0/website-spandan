import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const connectionString = process.env.TEST_DATABASE_URL;
const databaseTest = connectionString ? test : test.skip;

databaseTest('migrations create the critical production tables and constraints', async () => {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const tables = await client.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [['staff_users', 'patients', 'appointments', 'payments', 'package_orders']]
    );
    assert.deepEqual(tables.rows.map((row) => row.table_name).sort(), [
      'appointments',
      'package_orders',
      'patients',
      'payments',
      'staff_users',
    ]);

    const constraints = await client.query<{ conname: string }>(
      `SELECT conname
       FROM pg_constraint
       WHERE conname = ANY($1::text[])`,
      [['appointments_booking_state_valid', 'appointments_fee_snapshot_valid']]
    );
    assert.deepEqual(constraints.rows.map((row) => row.conname).sort(), [
      'appointments_booking_state_valid',
      'appointments_fee_snapshot_valid',
    ]);
  } finally {
    await client.end();
  }
});

databaseTest('staff email uniqueness is enforced and a failed write rolls back', async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const email = `ci-${randomUUID()}@example.test`;

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO staff_users (email, password_hash, full_name, role)
       VALUES ($1, 'not-a-real-password-hash', 'CI Admin', 'admin')`,
      [email]
    );

    await assert.rejects(
      client.query(
        `INSERT INTO staff_users (email, password_hash, full_name, role)
         VALUES ($1, 'not-a-real-password-hash', 'Duplicate CI Admin', 'admin')`,
        [email]
      ),
      (error: unknown) =>
        typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
    );
  } finally {
    await client.query('ROLLBACK');
    const persisted = await client.query('SELECT id FROM staff_users WHERE email = $1', [email]);
    assert.equal(persisted.rowCount, 0);
    await client.end();
  }
});
