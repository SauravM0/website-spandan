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
          'patient_identity_review_events',
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
      'patient_identity_review_events',
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
    const identityTriggers = await client.query(
      `SELECT tgname FROM pg_trigger
       WHERE tgname = ANY($1::text[]) AND NOT tgisinternal`,
      [
        [
          'patient_identity_review_event_immutable',
          'patient_source_record_delete_blocked',
          'patient_redirect_evidence_protected',
        ],
      ]
    );
    assert.deepEqual(identityTriggers.rows.map((row) => row.tgname).sort(), [
      'patient_identity_review_event_immutable',
      'patient_redirect_evidence_protected',
      'patient_source_record_delete_blocked',
    ]);
  } finally {
    await client.end();
  }
});

databaseTest(
  'identity review rejects wrong patients and concurrent reviewers produce one link',
  async () => {
    const client = new Client({ connectionString });
    await client.connect();
    const suffix = randomUUID();
    try {
      const staff = await client.query(
        `INSERT INTO staff_users(email,password_hash,full_name,role)
       VALUES($1,'not-a-real-password-hash','Identity Reviewer','staff') RETURNING id`,
        [`identity-${suffix}@example.test`]
      );
      const doctor = await client.query(
        `INSERT INTO doctors(name,slug,speciality)
       VALUES('Identity Doctor',$1,'Testing') RETURNING id`,
        [`identity-doctor-${suffix}`]
      );
      const patients = await Promise.all(
        [0, 1].map((index) =>
          client.query(
            `INSERT INTO patients(full_name,phone,date_of_birth)
           VALUES('Asha Patil',$1,'1985-04-02') RETURNING id`,
            [`98765432${10 + index}`]
          )
        )
      );
      for (let index = 0; index < 2; index += 1) {
        await client.query(
          `INSERT INTO appointments
           (patient_id,doctor_id,appointment_date,start_time,end_time,status,booking_state,
            fee_amount,fee_currency,payment_status,version)
         VALUES($1,$2,CURRENT_DATE + $3,$4::time,($4::time + interval '30 minutes')::time,
                'awaiting_payment','payment_required',500,'INR','not_paid',1)`,
          [patients[index].rows[0].id, doctor.rows[0].id, 10 + index, index ? '11:00' : '10:00']
        );
      }
      const review = await client.query(
        `INSERT INTO patient_match_reviews(candidate_patient_id,possible_patient_id,reason_codes)
       VALUES($1,$2,ARRAY['name','date_of_birth']) RETURNING id`,
        [patients[0].rows[0].id, patients[1].rows[0].id]
      );
      const { resolveIdentityReview } = await import('../src/services/patientIdentityReview');
      const results = await Promise.allSettled(
        [0, 1].map((index) =>
          resolveIdentityReview({
            reviewId: review.rows[0].id,
            outcome: 'same_person',
            canonicalPatientId: patients[1].rows[0].id,
            confirmedFactors: ['name', 'date_of_birth'],
            reason: `Patient confirmed name and date of birth ${index}`,
            expectedVersion: 1,
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
            (result.reason as any)?.code === 'IDENTITY_REVIEW_VERSION_CONFLICT'
        ).length,
        1
      );
      const links = await client.query(
        'SELECT source_patient_id,target_patient_id FROM patient_redirects WHERE target_patient_id=$1',
        [patients[1].rows[0].id]
      );
      assert.equal(links.rowCount, 1);
      const journey = await import('../src/services/patientRecord');
      const combined = await journey.getPatientAppointments(patients[1].rows[0].id, {
        id: staff.rows[0].id,
        role: 'admin',
      });
      assert.equal(combined.appointments.length, 2);
      await assert.rejects(
        client.query('DELETE FROM patients WHERE id=$1', [patients[0].rows[0].id]),
        (error: any) => error?.code === '55000'
      );

      const wrongPatients = await Promise.all([
        client.query(
          `INSERT INTO patients(full_name,phone,date_of_birth)
         VALUES('Wrong Person One','9000000001','1970-01-01') RETURNING id`
        ),
        client.query(
          `INSERT INTO patients(full_name,phone,date_of_birth)
         VALUES('Wrong Person Two','9000000002','1990-02-02') RETURNING id`
        ),
      ]);
      const wrongReview = await client.query(
        `INSERT INTO patient_match_reviews(candidate_patient_id,possible_patient_id,reason_codes)
       VALUES($1,$2,ARRAY['manual']) RETURNING id`,
        [wrongPatients[0].rows[0].id, wrongPatients[1].rows[0].id]
      );
      await assert.rejects(
        resolveIdentityReview({
          reviewId: wrongReview.rows[0].id,
          outcome: 'same_person',
          canonicalPatientId: wrongPatients[0].rows[0].id,
          confirmedFactors: ['name', 'date_of_birth'],
          reason: 'Deliberately invalid wrong-patient link',
          expectedVersion: 1,
          actorStaffId: staff.rows[0].id,
          idempotencyKey: randomUUID(),
        }),
        (error: any) => error?.code === 'IDENTITY_FACTOR_MISMATCH'
      );
    } finally {
      await client.end();
    }
  }
);

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

databaseTest('admin needs-action, scoped search, and unified detail agree end to end', async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const suffix = randomUUID();
  try {
    const doctor = await client.query(
      `INSERT INTO doctors(name,slug,speciality)
       VALUES('Workflow Doctor',$1,'Testing') RETURNING id`,
      [`workflow-doctor-${suffix}`]
    );
    const patient = await client.query(
      `INSERT INTO patients(full_name,phone,date_of_birth)
       VALUES($1,'9888877776','1988-03-04') RETURNING id`,
      [`Workflow Patient ${suffix.slice(0, 8)}`]
    );
    const appointment = await client.query(
      `INSERT INTO appointments
         (patient_id,doctor_id,appointment_date,start_time,end_time,status,booking_state,
          fee_amount,fee_currency,payment_status,version,source)
       VALUES($1,$2,CURRENT_DATE + 1,'09:00','09:30','awaiting_payment','payment_required',
              500,'INR','not_paid',1,'public') RETURNING id`,
      [patient.rows[0].id, doctor.rows[0].id]
    );
    const workflow = await import('../src/services/adminWorkflow');
    const actor = { role: 'admin' };
    const queue = await workflow.getNeedsActionQueue(actor);
    assert.ok(
      queue.data.some(
        (item) => item.entity_type === 'appointment' && item.entity_id === appointment.rows[0].id
      )
    );
    const search = await workflow.searchAdminWorkflow(
      `Workflow Patient ${suffix.slice(0, 8)}`,
      actor
    );
    assert.ok(search.data.some((item) => item.id === appointment.rows[0].id));
    const detail = await workflow.getWorkItemDetail('appointment', appointment.rows[0].id, actor);
    assert.equal(detail.patient.id, patient.rows[0].id);
    assert.equal(detail.source, 'book-appointment form');
    assert.equal(detail.payment.verified, false);
    assert.equal(detail.state, 'awaiting_payment');
    assert.ok(detail.owner);
    assert.ok(detail.next_actions.length > 0);
  } finally {
    await client.end();
  }
});

databaseTest('admin domain events commit and roll back with their source write', async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const suffix = randomUUID();
  try {
    const doctor = await client.query(
      `INSERT INTO doctors(name,slug,speciality)
       VALUES('Realtime Doctor',$1,'Testing') RETURNING id`,
      [`realtime-doctor-${suffix}`]
    );
    const patient = await client.query(
      `INSERT INTO patients(full_name,phone,date_of_birth)
       VALUES('Realtime Patient','9777766665','1990-01-01') RETURNING id`
    );
    await client.query('BEGIN');
    const appointment = await client.query(
      `INSERT INTO appointments
         (patient_id,doctor_id,appointment_date,start_time,end_time,status,booking_state,
          fee_amount,fee_currency,payment_status,version,source)
       VALUES($1,$2,CURRENT_DATE + 2,'10:00','10:30','awaiting_payment','payment_required',
              500,'INR','not_paid',1,'public') RETURNING id`,
      [patient.rows[0].id, doctor.rows[0].id]
    );
    const inside = await client.query(
      `SELECT event_type,entity_version FROM admin_domain_events
       WHERE entity_id=$1 ORDER BY id`,
      [appointment.rows[0].id]
    );
    assert.deepEqual(inside.rows, [{ event_type: 'appointment.changed', entity_version: 1 }]);
    await client.query('ROLLBACK');
    const outside = await client.query('SELECT 1 FROM admin_domain_events WHERE entity_id=$1', [
      appointment.rows[0].id,
    ]);
    assert.equal(outside.rowCount, 0);
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end();
  }
});

databaseTest('appointment keyset paging has no duplicates during concurrent inserts', async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const suffix = randomUUID();
  try {
    const doctor = await client.query(
      `INSERT INTO doctors(name,slug,speciality) VALUES('Paging Doctor',$1,'Testing') RETURNING id`,
      [`paging-doctor-${suffix}`]
    );
    const patient = await client.query(
      `INSERT INTO patients(full_name,phone,date_of_birth)
       VALUES('Paging Patient','9666655554','1991-01-01') RETURNING id`
    );
    await client.query(
      `INSERT INTO appointments
         (patient_id,doctor_id,appointment_date,start_time,end_time,status,booking_state,
          fee_amount,fee_currency,payment_status,version,source)
       SELECT $1,$2,CURRENT_DATE-(n/10),('08:00'::time+(n||' minutes')::interval),
              ('08:30'::time+(n||' minutes')::interval),'completed','confirmed',500,'INR','paid_cash',1,'admin'
       FROM generate_series(1,60) n`,
      [patient.rows[0].id, doctor.rows[0].id]
    );
    const operations = await import('../src/services/operations');
    const first = await operations.listAppointmentsPage({
      doctorId: doctor.rows[0].id,
      sort: 'date_desc',
      pageSize: 25,
    });
    await client.query(
      `INSERT INTO appointments
         (patient_id,doctor_id,appointment_date,start_time,end_time,status,booking_state,
          fee_amount,fee_currency,payment_status,version,source)
       VALUES($1,$2,CURRENT_DATE,'07:00','07:30','completed','confirmed',500,'INR','paid_cash',1,'admin')`,
      [patient.rows[0].id, doctor.rows[0].id]
    );
    const second = await operations.listAppointmentsPage({
      doctorId: doctor.rows[0].id,
      sort: 'date_desc',
      pageSize: 25,
      cursor: first.cursor || undefined,
    });
    const firstIds = new Set(first.data.map((row) => row.id));
    assert.equal(
      second.data.some((row) => firstIds.has(row.id)),
      false
    );
    assert.equal(first.data.length, 25);
    assert.equal(second.data.length, 25);

    await client.query('SET enable_seqscan=off');
    const plan = await client.query(
      `EXPLAIN (ANALYZE,BUFFERS,FORMAT TEXT)
       SELECT id FROM appointments WHERE doctor_id=$1
       ORDER BY appointment_date DESC,start_time DESC,id DESC LIMIT 25`,
      [doctor.rows[0].id]
    );
    assert.match(
      plan.rows.map((row) => row['QUERY PLAN']).join('\n'),
      /appointments_doctor_date_start_id/
    );
  } finally {
    await client.query('RESET enable_seqscan').catch(() => undefined);
    await client.end();
  }
});
