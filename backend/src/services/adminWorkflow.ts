import { query } from '../config/database';
import { PERMISSIONS, roleHasPermission } from '../security/permissions';
import { AppError } from '../utils/errors';
import { appointmentAllowedActions, packageOrderAllowedActions } from './operations';

type WorkflowActor = { role: string; doctorId?: string };

function can(actor: WorkflowActor, permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  return roleHasPermission(actor.role, permission);
}

function maskPhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `******${digits.slice(-4)}` : null;
}

function dueState(value: unknown) {
  const parsed = value ? new Date(String(value)) : null;
  const dueAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  return {
    due_at: dueAt?.toISOString() || null,
    overdue: Boolean(dueAt && dueAt.getTime() < Date.now()),
  };
}

function soleAdminOwner(name?: unknown) {
  return String(name || 'Clinic administrator');
}

export async function getNeedsActionQueue(actor: WorkflowActor) {
  const tasks: any[] = [];
  const counts: Record<string, number> = {};
  const work: Promise<void>[] = [];

  if (can(actor, PERMISSIONS.APPOINTMENTS_READ)) {
    work.push(
      query(
        `SELECT a.id,a.appointment_number,a.status,a.booking_state,a.payment_status,a.source,
                a.appointment_date,a.start_time,a.starts_at,a.version,p.id patient_id,p.full_name patient_name,
                d.name doctor_name,a.service_name
         FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id
         WHERE a.status IN ('awaiting_payment','payment_pending','confirmed','checked_in')
           AND a.appointment_date <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date + 1
           AND ($1::uuid IS NULL OR a.doctor_id=$1)
         ORDER BY a.appointment_date,a.start_time LIMIT 30`,
        [actor.doctorId || null]
      ).then((result) => {
        counts.appointments = result.rows.length;
        for (const row of result.rows) {
          const actions = appointmentAllowedActions(row.status);
          tasks.push({
            id: `appointment:${row.id}`,
            entity_type: 'appointment',
            entity_id: row.id,
            patient_id: row.patient_id,
            title: row.appointment_number || 'Appointment',
            patient_name: row.patient_name,
            request: row.service_name || 'Consultation',
            source:
              row.source === 'public'
                ? 'book-appointment form'
                : row.source === 'admin'
                  ? 'admin appointment entry'
                  : row.source || 'appointment form',
            service: row.doctor_name,
            payment_status: row.payment_status,
            state: row.status,
            owner: soleAdminOwner(),
            ...dueState(row.starts_at || `${row.appointment_date}T${row.start_time}+05:30`),
            next_action: actions[0] || 'Review appointment',
            priority: ['awaiting_payment', 'payment_pending'].includes(row.status)
              ? 'high'
              : 'normal',
          });
        }
      })
    );
  }

  if (can(actor, PERMISSIONS.PACKAGE_ORDERS_READ)) {
    work.push(
      query(
        `SELECT po.id,po.order_number,po.purchaser_name,po.status,po.order_type,po.price_status,
                po.owner_staff_id,po.due_at,po.created_at,owner.full_name owner_name,
                payment.status latest_payment_status,payment.verified_at
         FROM package_orders po LEFT JOIN staff_users owner ON owner.id=po.owner_staff_id
         LEFT JOIN LATERAL (SELECT status,verified_at FROM payments WHERE order_id=po.id ORDER BY created_at DESC LIMIT 1) payment ON true
         WHERE po.status NOT IN ('fulfilled','cancelled','refunded')
         ORDER BY po.due_at NULLS FIRST,po.created_at LIMIT 30`
      ).then((result) => {
        counts.package_orders = result.rows.length;
        for (const row of result.rows) {
          const actions = packageOrderAllowedActions(row.status).filter(
            (action) =>
              action !== 'start_price_review' ||
              (row.order_type === 'custom_tests' && row.price_status === 'pending')
          );
          tasks.push({
            id: `package_order:${row.id}`,
            entity_type: 'package_order',
            entity_id: row.id,
            title: row.order_number,
            patient_name: row.purchaser_name,
            request:
              row.order_type === 'custom_tests' ? 'Custom diagnostic tests' : 'Health package',
            source: row.order_type === 'custom_tests' ? 'build-package form' : 'book-package form',
            service:
              row.price_status === 'pending' ? 'Price confirmation required' : row.order_type,
            payment_status: row.verified_at
              ? 'verified'
              : row.latest_payment_status || 'not_started',
            state: row.status,
            owner: soleAdminOwner(row.owner_name),
            ...dueState(
              row.due_at || new Date(new Date(row.created_at).getTime() + 4 * 60 * 60 * 1000)
            ),
            next_action: actions[0] || 'Review order',
            priority: ['price_review', 'paid', 'refund_pending'].includes(row.status)
              ? 'high'
              : 'normal',
          });
        }
      })
    );
  }

  if (can(actor, PERMISSIONS.PAYMENTS_READ)) {
    work.push(
      query(
        `SELECT exception.id,exception.payment_id,exception.exception_type,exception.severity,
                exception.status,exception.created_at,owner.full_name owner_name,
                payment.merchant_transaction_id,payment.amount,payment.status payment_status
         FROM payment_exceptions exception
         JOIN payments payment ON payment.id=exception.payment_id
         LEFT JOIN staff_users owner ON owner.id=exception.owner_staff_id
         WHERE exception.status<>'resolved'
         ORDER BY exception.severity DESC,exception.created_at LIMIT 20`
      ).then((result) => {
        counts.payment_exceptions = result.rows.length;
        for (const row of result.rows) {
          tasks.push({
            id: `payment:${row.payment_id}`,
            entity_type: 'payment',
            entity_id: row.payment_id,
            title: row.merchant_transaction_id,
            patient_name: null,
            request: row.exception_type,
            source: 'Payment reconciliation',
            service: `Rs. ${Number(row.amount).toLocaleString('en-IN')}`,
            payment_status: row.payment_status,
            state: row.status,
            owner: soleAdminOwner(row.owner_name),
            ...dueState(new Date(new Date(row.created_at).getTime() + 5 * 60 * 1000)),
            next_action: 'Recheck provider evidence',
            priority: row.severity === 'critical' ? 'high' : 'medium',
          });
        }
      })
    );
  }

  if (can(actor, PERMISSIONS.NOTIFICATIONS_READ)) {
    work.push(
      query(
        `SELECT id,template,status,created_at,next_attempt_at,appointment_id,order_id,payment_id
         FROM notification_outbox
         WHERE status IN ('failed','retrying','permanent_failure','skipped_no_destination')
         ORDER BY created_at LIMIT 20`
      ).then((result) => {
        counts.notification_exceptions = result.rows.length;
        for (const row of result.rows) {
          tasks.push({
            id: `notification:${row.id}`,
            entity_type: 'notification',
            entity_id: row.id,
            title: row.template,
            patient_name: null,
            request: 'Notification delivery exception',
            source: 'Notification worker',
            service: row.template,
            payment_status: null,
            state: row.status,
            owner: soleAdminOwner(),
            ...dueState(row.next_attempt_at || row.created_at),
            next_action:
              row.status === 'skipped_no_destination'
                ? 'Contact patient manually'
                : 'Retry notification',
            priority: row.status === 'permanent_failure' ? 'high' : 'medium',
            href: '/admin/notifications',
          });
        }
      })
    );
  }

  if (can(actor, PERMISSIONS.PATIENT_IDENTITY_REVIEW)) {
    work.push(
      query(
        `SELECT review.id,review.created_at,candidate.full_name candidate_name,possible.full_name possible_name,
                COUNT(*) OVER() total_count
         FROM patient_match_reviews review
         JOIN patients candidate ON candidate.id=review.candidate_patient_id
         JOIN patients possible ON possible.id=review.possible_patient_id
         WHERE review.status='pending' ORDER BY review.created_at LIMIT 20`
      ).then((result) => {
        counts.identity_reviews = Number(result.rows[0]?.total_count || 0);
        for (const row of result.rows) {
          tasks.push({
            id: `identity_review:${row.id}`,
            entity_type: 'identity_review',
            entity_id: row.id,
            title: 'Possible duplicate patient',
            patient_name: `${row.candidate_name} / ${row.possible_name}`,
            request: 'Identity review',
            source: 'Repeated patient submission',
            service: 'Patient identity',
            payment_status: null,
            state: 'pending',
            owner: soleAdminOwner(),
            ...dueState(new Date(new Date(row.created_at).getTime() + 24 * 60 * 60 * 1000)),
            next_action: 'Verify two identity factors',
            priority: 'high',
            href: '/admin/patients/identity-reviews',
          });
        }
      })
    );
  }

  if (can(actor, PERMISSIONS.LEADS_READ)) {
    work.push(
      query(
        `SELECT request.id,request.patient_name,request.status,request.created_at,
                doctor.name doctor_name,package.name package_name
         FROM appointment_requests request
         LEFT JOIN doctors doctor ON doctor.id=request.doctor_id
         LEFT JOIN packages package ON package.id=request.package_id
         WHERE request.status IN ('new','contacted') AND request.is_archived=false
         ORDER BY request.created_at LIMIT 20`
      ).then((result) => {
        counts.leads = result.rows.length;
        for (const row of result.rows) {
          tasks.push({
            id: `lead:${row.id}`,
            entity_type: 'lead',
            entity_id: row.id,
            title: 'Appointment enquiry',
            patient_name: row.patient_name,
            request: row.package_name || 'Consultation enquiry',
            source: 'Contact / appointment request form',
            service: row.doctor_name || row.package_name || 'Clinic enquiry',
            payment_status: 'not_started',
            state: row.status,
            owner: soleAdminOwner(),
            ...dueState(new Date(new Date(row.created_at).getTime() + 4 * 60 * 60 * 1000)),
            next_action: row.status === 'new' ? 'Contact patient' : 'Schedule or close enquiry',
            priority: row.status === 'new' ? 'high' : 'medium',
            href: `/admin/leads/${row.id}`,
          });
        }
      })
    );
  }

  await Promise.all(work);
  const priority = { high: 0, medium: 1, normal: 2 } as Record<string, number>;
  tasks.sort(
    (left, right) =>
      Number(right.overdue) - Number(left.overdue) ||
      priority[left.priority] - priority[right.priority] ||
      String(left.due_at || '').localeCompare(String(right.due_at || ''))
  );
  return { data: tasks.slice(0, 50), counts, generated_at: new Date().toISOString() };
}

export async function searchAdminWorkflow(term: string, actor: WorkflowActor) {
  const text = term.trim();
  if (text.length < 2) return { data: [] };
  const pattern = `%${text}%`;
  const results: any[] = [];
  const searches: Promise<void>[] = [];
  if (can(actor, PERMISSIONS.APPOINTMENTS_READ))
    searches.push(
      query(
        `SELECT a.id,a.appointment_number,a.status,p.full_name,d.name doctor_name,a.appointment_date
         FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id
         WHERE (a.appointment_number ILIKE $1 OR p.full_name ILIKE $1 OR RIGHT(regexp_replace(p.phone,'\\D','','g'),4)=$2)
           AND ($3::uuid IS NULL OR a.doctor_id=$3)
         ORDER BY a.updated_at DESC LIMIT 5`,
        [pattern, text, actor.doctorId || null]
      ).then((rows) =>
        rows.rows.forEach((row) =>
          results.push({
            type: 'appointment',
            id: row.id,
            label: row.appointment_number || 'Appointment',
            context: `${row.full_name} - ${row.doctor_name} - ${String(row.appointment_date).slice(0, 10)}`,
            href: `/admin?work_item=appointment:${row.id}`,
          })
        )
      )
    );
  if (can(actor, PERMISSIONS.PACKAGE_ORDERS_READ))
    searches.push(
      query(
        `SELECT id,order_number,purchaser_name,status FROM package_orders
         WHERE order_number ILIKE $1 OR purchaser_name ILIKE $1 OR RIGHT(regexp_replace(phone,'\\D','','g'),4)=$2
         ORDER BY updated_at DESC LIMIT 5`,
        [pattern, text]
      ).then((rows) =>
        rows.rows.forEach((row) =>
          results.push({
            type: 'package_order',
            id: row.id,
            label: row.order_number,
            context: `${row.purchaser_name} - ${row.status}`,
            href: `/admin?work_item=package_order:${row.id}`,
          })
        )
      )
    );
  if (can(actor, PERMISSIONS.PATIENTS_READ))
    searches.push(
      query(
        `SELECT id,full_name,date_of_birth,RIGHT(regexp_replace(phone,'\\D','','g'),4) phone_last4
         FROM patients WHERE archived_at IS NULL
           AND (full_name ILIKE $1 OR RIGHT(regexp_replace(phone,'\\D','','g'),4)=$2)
         ORDER BY updated_at DESC LIMIT 5`,
        [pattern, text]
      ).then((rows) =>
        rows.rows.forEach((row) =>
          results.push({
            type: 'patient',
            id: row.id,
            label: row.full_name,
            context: `DOB ${row.date_of_birth || 'not recorded'} - phone ending ${row.phone_last4}`,
            href: `/admin/patients/${row.id}`,
          })
        )
      )
    );
  if (can(actor, PERMISSIONS.PAYMENTS_READ))
    searches.push(
      query(
        `SELECT id,merchant_transaction_id,status,amount FROM payments
         WHERE merchant_transaction_id ILIKE $1 OR provider_reference ILIKE $1
         ORDER BY updated_at DESC LIMIT 5`,
        [pattern]
      ).then((rows) =>
        rows.rows.forEach((row) =>
          results.push({
            type: 'payment',
            id: row.id,
            label: row.merchant_transaction_id,
            context: `${row.status} - Rs. ${Number(row.amount).toLocaleString('en-IN')}`,
            href: `/admin?work_item=payment:${row.id}`,
          })
        )
      )
    );
  if (can(actor, PERMISSIONS.LEADS_READ))
    searches.push(
      query(
        `SELECT id,patient_name,status FROM appointment_requests
         WHERE is_archived=false AND (patient_name ILIKE $1 OR RIGHT(regexp_replace(phone,'\\D','','g'),4)=$2)
         ORDER BY updated_at DESC LIMIT 5`,
        [pattern, text]
      ).then((rows) =>
        rows.rows.forEach((row) =>
          results.push({
            type: 'lead',
            id: row.id,
            label: row.patient_name,
            context: `Enquiry - ${row.status}`,
            href: `/admin/leads/${row.id}`,
          })
        )
      )
    );
  await Promise.all(searches);
  return { data: results.slice(0, 20) };
}

export async function getWorkItemDetail(type: string, id: string, actor: WorkflowActor) {
  if (type === 'appointment' && can(actor, PERMISSIONS.APPOINTMENTS_READ)) {
    const result = await query(
      `SELECT a.*,p.full_name patient_name,p.id patient_id,d.name doctor_name,
              payment.status latest_payment_status,payment.verified_at
       FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id
       LEFT JOIN LATERAL (SELECT status,verified_at FROM payments WHERE appointment_id=a.id ORDER BY created_at DESC LIMIT 1) payment ON true
       WHERE a.id=$1 AND ($2::uuid IS NULL OR a.doctor_id=$2)`,
      [id, actor.doctorId || null]
    );
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'WORK_ITEM_NOT_FOUND', 'Work item not found.');
    return {
      type,
      id: row.id,
      patient: { id: row.patient_id, name: row.patient_name },
      request: row.service_name || row.appointment_type || 'Consultation',
      source:
        row.source === 'public'
          ? 'book-appointment form'
          : row.source === 'admin'
            ? 'admin appointment entry'
            : row.source || 'appointment form',
      doctor_or_service: row.doctor_name,
      payment: {
        status: row.latest_payment_status || row.payment_status,
        verified: Boolean(row.verified_at),
      },
      state: row.status,
      owner: soleAdminOwner(),
      ...dueState(row.starts_at || `${row.appointment_date}T${row.start_time}+05:30`),
      next_actions: appointmentAllowedActions(row.status),
      links: { patient: `/admin/patients/${row.patient_id}`, service: '/admin/appointments' },
    };
  }
  if (type === 'package_order' && can(actor, PERMISSIONS.PACKAGE_ORDERS_READ)) {
    const result = await query(
      `SELECT po.*,owner.full_name owner_name,payment.status latest_payment_status,payment.verified_at,
              COALESCE(po.contact_patient_id,
                (SELECT patient_id FROM package_order_items WHERE order_id=po.id ORDER BY created_at LIMIT 1),
                (SELECT patient_id FROM custom_test_order_items WHERE order_id=po.id ORDER BY sort_order LIMIT 1)) patient_id,
              COALESCE((SELECT ARRAY_AGG(package_name_snapshot ORDER BY created_at) FROM package_order_items WHERE order_id=po.id),
                       (SELECT ARRAY_AGG(test_name_snapshot ORDER BY sort_order) FROM custom_test_order_items WHERE order_id=po.id)) services
       FROM package_orders po LEFT JOIN staff_users owner ON owner.id=po.owner_staff_id
       LEFT JOIN LATERAL (SELECT status,verified_at FROM payments WHERE order_id=po.id ORDER BY created_at DESC LIMIT 1) payment ON true
       WHERE po.id=$1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'WORK_ITEM_NOT_FOUND', 'Work item not found.');
    return {
      type,
      id: row.id,
      patient: { id: row.patient_id, name: row.purchaser_name },
      request: row.order_type === 'custom_tests' ? 'Custom diagnostic tests' : 'Health package',
      source: row.order_type === 'custom_tests' ? 'build-package form' : 'book-package form',
      doctor_or_service: row.services || [],
      payment: {
        status: row.latest_payment_status || 'not_started',
        verified: Boolean(row.verified_at),
      },
      state: row.status,
      owner: soleAdminOwner(row.owner_name),
      ...dueState(row.due_at),
      next_actions: packageOrderAllowedActions(row.status).filter(
        (action) =>
          action !== 'start_price_review' ||
          (row.order_type === 'custom_tests' && row.price_status === 'pending')
      ),
      links: {
        patient: row.patient_id ? `/admin/patients/${row.patient_id}` : null,
        service: '/admin/package-orders',
      },
    };
  }
  if (type === 'payment' && can(actor, PERMISSIONS.PAYMENTS_READ)) {
    const result = await query(
      `SELECT payment.*,COALESCE(appointment.patient_id,target_patient.patient_id) patient_id,
              patient.full_name patient_name,
              appointment.appointment_number,orders.order_number
       FROM payments payment LEFT JOIN appointments appointment ON appointment.id=payment.appointment_id
       LEFT JOIN package_orders orders ON orders.id=payment.order_id
       LEFT JOIN LATERAL (
         SELECT patient_id FROM package_order_items WHERE order_id=orders.id
         UNION SELECT patient_id FROM custom_test_order_items WHERE order_id=orders.id
         LIMIT 1
       ) target_patient ON true
       LEFT JOIN patients patient ON patient.id=COALESCE(appointment.patient_id,target_patient.patient_id)
       WHERE payment.id=$1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'WORK_ITEM_NOT_FOUND', 'Work item not found.');
    return {
      type,
      id: row.id,
      patient: { id: row.patient_id, name: row.patient_name },
      request: row.appointment_number || row.order_number || 'Payment',
      source: row.provider || 'payment provider',
      doctor_or_service: row.appointment_number || row.order_number,
      payment: {
        status: row.status,
        verified: Boolean(row.verified_at),
        amount: Number(row.amount),
      },
      state: row.status,
      owner: soleAdminOwner(),
      ...dueState(new Date(new Date(row.created_at).getTime() + 5 * 60 * 1000)),
      next_actions: ['recheck_provider'],
      links: {
        patient: row.patient_id ? `/admin/patients/${row.patient_id}` : null,
        service: '/admin/payments',
      },
    };
  }
  throw new AppError(404, 'WORK_ITEM_NOT_FOUND', 'Work item not found or not permitted.');
}
