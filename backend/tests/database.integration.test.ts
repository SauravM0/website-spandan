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
      [
        [
          'staff_users',
          'staff_auth_challenges',
          'staff_login_throttles',
          'staff_mfa_recovery_codes',
          'patient_confidentiality_grants',
          'patients',
          'appointments',
          'appointment_payment_evidence',
          'appointment_transition_events',
          'appointment_reschedule_events',
          'payments',
          'package_orders',
          'package_order_events',
          'package_order_price_confirmations',
        ],
      ]
    );
    assert.deepEqual(tables.rows.map((row) => row.table_name).sort(), [
      'appointments',
      'appointment_payment_evidence',
      'appointment_reschedule_events',
      'appointment_transition_events',
      'package_order_events',
      'package_order_price_confirmations',
      'package_orders',
      'patient_confidentiality_grants',
      'patients',
      'payments',
      'staff_auth_challenges',
      'staff_login_throttles',
      'staff_mfa_recovery_codes',
      'staff_users',
    ]);

    const constraints = await client.query<{ conname: string }>(
      `SELECT conname
       FROM pg_constraint
       WHERE conname = ANY($1::text[])`,
      [
        [
          'appointments_booking_state_valid',
          'appointments_fee_snapshot_valid',
          'payment_provider_evidence_consistent',
          'package_order_lifecycle_status_valid',
          'package_order_preparation_status_valid',
        ],
      ]
    );
    assert.deepEqual(constraints.rows.map((row) => row.conname).sort(), [
      'appointments_booking_state_valid',
      'appointments_fee_snapshot_valid',
      'package_order_lifecycle_status_valid',
      'package_order_preparation_status_valid',
      'payment_provider_evidence_consistent',
    ]);

    const evidenceTrigger = await client.query(
      `SELECT 1 FROM pg_trigger
       WHERE tgname = 'payment_provider_evidence_immutable' AND NOT tgisinternal`
    );
    assert.equal(evidenceTrigger.rowCount, 1);
    const appointmentTriggers = await client.query(
      `SELECT tgname FROM pg_trigger
       WHERE tgname = ANY($1::text[]) AND NOT tgisinternal`,
      [
        [
          'appointment_payment_evidence_immutable',
          'appointment_transition_event_immutable',
          'appointment_financial_evidence_required',
          'appointment_reschedule_event_immutable',
        ],
      ]
    );
    assert.deepEqual(appointmentTriggers.rows.map((row) => row.tgname).sort(), [
      'appointment_financial_evidence_required',
      'appointment_payment_evidence_immutable',
      'appointment_reschedule_event_immutable',
      'appointment_transition_event_immutable',
    ]);
    const packageOrderTriggers = await client.query(
      `SELECT tgname FROM pg_trigger
       WHERE tgname = ANY($1::text[]) AND NOT tgisinternal`,
      [['package_order_events_immutable', 'package_order_price_confirmation_immutable']]
    );
    assert.deepEqual(packageOrderTriggers.rows.map((row) => row.tgname).sort(), [
      'package_order_events_immutable',
      'package_order_price_confirmation_immutable',
    ]);
  } finally {
    await client.end();
  }
});

databaseTest(
  'concurrent reschedules cannot take one target slot and failures preserve the original',
  async () => {
    const client = new Client({ connectionString });
    await client.connect();
    const suffix = randomUUID();
    try {
      const staff = await client.query(
        `INSERT INTO staff_users(email,password_hash,full_name,role)
       VALUES($1,'not-a-real-password-hash','Reschedule Operator','staff') RETURNING id`,
        [`reschedule-${suffix}@example.test`]
      );
      const doctors = await Promise.all(
        ['Source One', 'Source Two', 'Target'].map((name, index) =>
          client.query(
            `INSERT INTO doctors(name,slug,speciality)
           VALUES($1,$2,'Testing') RETURNING id`,
            [name, `reschedule-${index}-${suffix}`]
          )
        )
      );
      const [sourceOne, sourceTwo, target] = doctors.map((result) => result.rows[0].id);
      await client.query(
        `INSERT INTO doctor_availability_rules
         (doctor_id,weekday,start_time,end_time,slot_minutes,effective_from)
       SELECT $1,EXTRACT(DOW FROM CURRENT_DATE + 20)::int,'10:00','11:00',30,CURRENT_DATE`,
        [target]
      );
      const patients = await Promise.all(
        ['9999999901', '9999999902', '9999999903'].map((phone, index) =>
          client.query(
            `INSERT INTO patients(full_name,phone,age_years)
           VALUES($1,$2,30) RETURNING id`,
            [`Reschedule Patient ${index}`, phone]
          )
        )
      );
      const createSource = (patientId: string, doctorId: string, time: string) =>
        client.query(
          `INSERT INTO appointments
           (patient_id,doctor_id,appointment_date,start_time,end_time,status,booking_state,
            fee_amount,fee_currency,payment_status,version)
         VALUES($1,$2,CURRENT_DATE + 10,$3::time,($3::time + interval '30 minutes')::time,
                'awaiting_payment','payment_required',500,'INR','not_paid',1)
         RETURNING id,doctor_id,appointment_date,start_time,version`,
          [patientId, doctorId, time]
        );
      const first = await createSource(patients[0].rows[0].id, sourceOne, '09:00');
      const second = await createSource(patients[1].rows[0].id, sourceTwo, '09:00');
      const third = await createSource(patients[2].rows[0].id, sourceOne, '10:00');
      const targetDate = await client.query<{ target_date: string }>(
        `SELECT TO_CHAR(CURRENT_DATE + 20,'YYYY-MM-DD') AS target_date`
      );
      const { rescheduleAppointment } = await import('../src/services/operations');
      const race = await Promise.allSettled(
        [first.rows[0], second.rows[0]].map((appointment, index) =>
          rescheduleAppointment({
            appointmentId: appointment.id,
            doctorId: target,
            appointmentDate: targetDate.rows[0].target_date,
            startTime: '10:00',
            expectedVersion: 1,
            reason: `Concurrent target request ${index}`,
            actorStaffId: staff.rows[0].id,
            idempotencyKey: randomUUID(),
          })
        )
      );
      assert.equal(race.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(
        race.filter(
          (result) =>
            result.status === 'rejected' &&
            (result.reason as any)?.code === 'APPOINTMENT_TARGET_SLOT_UNAVAILABLE'
        ).length,
        1
      );
      const targetBookings = await client.query(
        `SELECT COUNT(*)::int AS count FROM appointments
       WHERE doctor_id=$1 AND appointment_date=$2 AND start_time='10:00'`,
        [target, targetDate.rows[0].target_date]
      );
      assert.equal(targetBookings.rows[0].count, 1);

      await assert.rejects(
        rescheduleAppointment({
          appointmentId: third.rows[0].id,
          doctorId: target,
          appointmentDate: targetDate.rows[0].target_date,
          startTime: '23:30',
          expectedVersion: 1,
          reason: 'Unavailable replacement must retain original',
          actorStaffId: staff.rows[0].id,
          idempotencyKey: randomUUID(),
        }),
        (error: any) => error?.code === 'APPOINTMENT_TARGET_SLOT_UNAVAILABLE'
      );
      const preserved = await client.query(
        'SELECT doctor_id,appointment_date,start_time,version FROM appointments WHERE id=$1',
        [third.rows[0].id]
      );
      assert.equal(preserved.rows[0].doctor_id, third.rows[0].doctor_id);
      assert.equal(
        String(preserved.rows[0].appointment_date),
        String(third.rows[0].appointment_date)
      );
      assert.equal(String(preserved.rows[0].start_time), String(third.rows[0].start_time));
      assert.equal(preserved.rows[0].version, 1);
    } finally {
      await client.end();
    }
  }
);

databaseTest('staff email uniqueness is enforced and a failed write rolls back', async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const email = `ci-${randomUUID()}@example.test`;

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO staff_users (email, password_hash, full_name, role)
       VALUES ($1, 'not-a-real-password-hash', 'CI Staff', 'staff')`,
      [email]
    );

    await assert.rejects(
      client.query(
        `INSERT INTO staff_users (email, password_hash, full_name, role)
         VALUES ($1, 'not-a-real-password-hash', 'Duplicate CI Staff', 'staff')`,
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

databaseTest('only one active administrator can exist', async () => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO staff_users (email, password_hash, full_name, role)
       VALUES ($1, 'not-a-real-password-hash', 'First Admin', 'admin')`,
      [`first-${randomUUID()}@example.test`]
    );
    await assert.rejects(
      client.query(
        `INSERT INTO staff_users (email, password_hash, full_name, role)
         VALUES ($1, 'not-a-real-password-hash', 'Second Admin', 'admin')`,
        [`second-${randomUUID()}@example.test`]
      ),
      (error: unknown) =>
        typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
    );
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});

databaseTest('fifty concurrent appointment transitions produce one version winner', async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const suffix = randomUUID();
  try {
    const doctor = await client.query(
      `INSERT INTO doctors(name,slug,speciality) VALUES('Concurrency Doctor',$1,'Testing') RETURNING id`,
      [`concurrency-doctor-${suffix}`]
    );
    const staff = await client.query(
      `INSERT INTO staff_users(email,password_hash,full_name,role)
       VALUES($1,'not-a-real-password-hash','Concurrency Operator','staff') RETURNING id`,
      [`concurrency-${suffix}@example.test`]
    );
    const patient = await client.query(
      `INSERT INTO patients(full_name,phone,age_years)
       VALUES('Concurrency Patient','9999999999',30) RETURNING id`
    );
    const appointment = await client.query(
      `INSERT INTO appointments
         (patient_id,doctor_id,appointment_date,start_time,end_time,status,booking_state,
          fee_amount,fee_currency,payment_status,version)
       VALUES($1,$2,CURRENT_DATE + 30,'10:00','10:30','awaiting_payment','payment_required',
              500,'INR','not_paid',1)
       RETURNING id`,
      [patient.rows[0].id, doctor.rows[0].id]
    );
    const { transitionAppointment } = await import('../src/services/operations');
    const results = await Promise.allSettled(
      Array.from({ length: 50 }, (_, index) =>
        transitionAppointment({
          appointmentId: appointment.rows[0].id,
          action: 'cancel',
          expectedVersion: 1,
          reason: `Concurrent cancellation attempt ${index}`,
          actorStaffId: staff.rows[0].id,
          idempotencyKey: randomUUID(),
        })
      )
    );
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(
      results.filter(
        (result) =>
          result.status === 'rejected' &&
          (result.reason as any)?.code === 'APPOINTMENT_VERSION_CONFLICT'
      ).length,
      49
    );
    const final = await client.query(
      'SELECT status,booking_state,version FROM appointments WHERE id=$1',
      [appointment.rows[0].id]
    );
    assert.deepEqual(final.rows[0], {
      status: 'cancelled',
      booking_state: 'cancelled',
      version: 2,
    });
    const events = await client.query(
      'SELECT COUNT(*)::int AS count FROM appointment_transition_events WHERE appointment_id=$1',
      [appointment.rows[0].id]
    );
    assert.equal(events.rows[0].count, 1);
  } finally {
    await client.end();
  }
});

databaseTest('fifty concurrent package-order transitions produce one version winner', async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const suffix = randomUUID();
  try {
    const staff = await client.query(
      `INSERT INTO staff_users(email,password_hash,full_name,role)
       VALUES($1,'not-a-real-password-hash','Package Operator','staff') RETURNING id`,
      [`package-concurrency-${suffix}@example.test`]
    );
    const order = await client.query(
      `INSERT INTO package_orders
         (order_number,purchaser_name,phone,status,price_status,total_amount,version)
       VALUES($1,'Package Patient','9999999998','submitted','confirmed',500,1)
       RETURNING id`,
      [`TEST-${suffix}`]
    );
    const { transitionPackageOrder } = await import('../src/services/operations');
    const results = await Promise.allSettled(
      Array.from({ length: 50 }, (_, index) =>
        transitionPackageOrder({
          orderId: order.rows[0].id,
          action: 'cancel',
          expectedVersion: 1,
          reason: `Concurrent package cancellation ${index}`,
          actorStaffId: staff.rows[0].id,
          idempotencyKey: randomUUID(),
        })
      )
    );
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(
      results.filter(
        (result) =>
          result.status === 'rejected' &&
          (result.reason as any)?.code === 'PACKAGE_ORDER_VERSION_CONFLICT'
      ).length,
      49
    );
    const final = await client.query('SELECT status,version FROM package_orders WHERE id=$1', [
      order.rows[0].id,
    ]);
    assert.deepEqual(final.rows[0], { status: 'cancelled', version: 2 });
    const events = await client.query(
      'SELECT COUNT(*)::int AS count FROM package_order_events WHERE order_id=$1',
      [order.rows[0].id]
    );
    assert.equal(events.rows[0].count, 1);
  } finally {
    await client.end();
  }
});
