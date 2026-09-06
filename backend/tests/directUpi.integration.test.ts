import assert from 'node:assert/strict';
import test from 'node:test';
import '../src/config';
import { getClient, pool } from '../src/config/database';

const dbTest = process.env.RUN_DB_TESTS === '1' ? test : test.skip;

dbTest('PostgreSQL enforces Direct UPI snapshot immutability and duplicate UTR protection', async () => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const configuration = await client.query(
      'SELECT id,configuration_version FROM payment_configurations ORDER BY configuration_version LIMIT 1'
    );
    assert.ok(configuration.rows[0], 'migration must bootstrap a safe payment configuration');
    const order = await client.query(
      `INSERT INTO package_orders(order_number,purchaser_name,phone,status,total_amount)
       VALUES($1,'Integration Test','9999999999','awaiting_payment',100) RETURNING id`,
      [`TEST-${crypto.randomUUID()}`]
    );
    const insertPayment = (reference: string, merchantTransactionId: string) =>
      client.query(
        `INSERT INTO payments(
           order_id,provider,mode,merchant_transaction_id,amount,amount_paisa,currency,status,
           public_order_reference,payment_configuration_id,payment_configuration_version,
           payment_configuration_snapshot,merchant_upi_vpa_snapshot,merchant_display_name_snapshot,
           upi_transaction_note_snapshot,expires_at
         ) VALUES($1,'direct_upi','upi',$2,100,10000,'INR','verification_pending',$3,$4,$5,
                  $6,'integration@upi','Integration Merchant',$7,NOW()+INTERVAL '30 minutes')
         RETURNING *`,
        [
          order.rows[0].id,
          merchantTransactionId,
          reference,
          configuration.rows[0].id,
          configuration.rows[0].configuration_version,
          { payment_order_expiry_minutes: 30 },
          `Payment ${reference}`,
        ]
      );
    const first = await insertPayment(`SPU-${crypto.randomUUID()}`, `SPP-${crypto.randomUUID()}`);
    await client.query('UPDATE payments SET utr_fingerprint=$2 WHERE id=$1', [
      first.rows[0].id,
      'a'.repeat(64),
    ]);
    await client.query(
      'INSERT INTO direct_upi_utr_claims(utr_fingerprint,payment_id) VALUES($1,$2)',
      ['a'.repeat(64), first.rows[0].id]
    );
    await client.query(
      'INSERT INTO direct_upi_utr_claims(utr_fingerprint,payment_id) VALUES($1,$2)',
      ['b'.repeat(64), first.rows[0].id]
    );
    const replacementClaims = await client.query(
      'SELECT utr_fingerprint FROM direct_upi_utr_claims WHERE payment_id=$1 ORDER BY claimed_at',
      [first.rows[0].id]
    );
    assert.deepEqual(
      replacementClaims.rows.map((row) => row.utr_fingerprint).sort(),
      ['a'.repeat(64), 'b'.repeat(64)]
    );

    await client.query('SAVEPOINT immutable_snapshot');
    await assert.rejects(
      client.query('UPDATE payments SET amount_paisa=9999 WHERE id=$1', [first.rows[0].id]),
      (error: any) => error.code === '55000'
    );
    await client.query('ROLLBACK TO SAVEPOINT immutable_snapshot');

    const second = await insertPayment(`SPU-${crypto.randomUUID()}`, `SPP-${crypto.randomUUID()}`);
    await client.query('UPDATE payments SET utr_fingerprint=$2 WHERE id=$1', [
      second.rows[0].id,
      'a'.repeat(64),
    ]);
    await client.query('SAVEPOINT duplicate_utr');
    await assert.rejects(
      client.query(
        'INSERT INTO direct_upi_utr_claims(utr_fingerprint,payment_id) VALUES($1,$2)',
        ['a'.repeat(64), second.rows[0].id]
      ),
      (error: any) => error.code === '23505'
    );
    await client.query('ROLLBACK TO SAVEPOINT duplicate_utr');

    await client.query('SAVEPOINT public_paid');
    await assert.rejects(
      client.query("UPDATE payments SET status='success' WHERE id=$1", [first.rows[0].id]),
      (error: any) => error.code === '23514'
    );
    await client.query('ROLLBACK TO SAVEPOINT public_paid');

    await client.query(
      'INSERT INTO receipts(payment_id,receipt_number) VALUES($1,$2)',
      [first.rows[0].id, `TEST-RECEIPT-${crypto.randomUUID()}`]
    );
    await client.query('SAVEPOINT duplicate_receipt');
    await assert.rejects(
      client.query('INSERT INTO receipts(payment_id,receipt_number) VALUES($1,$2)', [
        first.rows[0].id,
        `TEST-RECEIPT-${crypto.randomUUID()}`,
      ]),
      (error: any) => error.code === '23505'
    );
    await client.query('ROLLBACK TO SAVEPOINT duplicate_receipt');
    await client.query('ROLLBACK');
  } finally {
    client.release();
    await pool.end();
  }
});
