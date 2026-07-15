import nodemailer from 'nodemailer';
import { PoolClient } from 'pg';
import { config } from '../config';
import { query } from '../config/database';
import { buildReceiptPdf } from './receiptPdf';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

type Queryable = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
};

type NotificationFilters = {
  status?: string;
  channel?: string;
  entity?: 'appointment' | 'package_order' | 'payment';
  from?: string;
  to?: string;
  search?: string;
  sort?: 'date_desc' | 'date_asc' | 'updated_desc' | 'updated_asc';
  page?: number;
  pageSize?: number;
};

const MAX_NOTIFICATION_ATTEMPTS = 3;

function getTransporter() {
  if (!config.smtp.enabled) {
    return null;
  }
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

function normalizeLanguage(value?: string | null): string {
  return ['en', 'hi', 'mr'].includes(value || '') ? String(value) : 'en';
}

function maskDestination(value: unknown): string {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.includes('@')) {
    const [name, domain] = text.split('@');
    const visible = name.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
  }
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 6) return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
  if (text.length <= 4) return '****';
  return `${text.slice(0, 2)}${'*'.repeat(Math.max(2, text.length - 4))}${text.slice(-2)}`;
}

function normalizeNotificationError(value: unknown): string {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/auth|credential|login|password|token|secret/i.test(text)) return 'Provider authentication or configuration error';
  if (/timeout|timed out|econn|network|dns/i.test(text)) return 'Temporary network or provider connectivity error';
  if (/mailbox|recipient|address|invalid|bounce/i.test(text)) return 'Destination address could not be reached';
  if (/rate|quota|limit/i.test(text)) return 'Provider rate limit or quota error';
  return text.slice(0, 220);
}

function retryEligibility(row: any) {
  if (!row) return { eligible: false, reason: 'Notification not found' };
  if (!row.destination) return { eligible: false, reason: 'No destination is available' };
  if (['sent', 'sending', 'permanent_failure', 'manual_follow_up', 'skipped_no_destination'].includes(row.status)) {
    return { eligible: false, reason: `Status ${String(row.status).replace(/_/g, ' ')} is not retryable` };
  }
  if (Number(row.attempt_count || 0) >= MAX_NOTIFICATION_ATTEMPTS) {
    return { eligible: false, reason: 'Maximum retry attempts reached' };
  }
  if (row.next_attempt_at && new Date(row.next_attempt_at).getTime() > Date.now()) {
    return { eligible: false, reason: 'Retry cooldown is still active' };
  }
  return { eligible: true, reason: '' };
}

function publicNotification(row: any) {
  const eligibility = retryEligibility(row);
  return {
    ...row,
    destination_masked: maskDestination(row.destination),
    destination: undefined,
    payload: undefined,
    error: normalizeNotificationError(row.error),
    retry_eligible: eligibility.eligible,
    retry_ineligible_reason: eligibility.reason,
    max_attempts: MAX_NOTIFICATION_ATTEMPTS,
  };
}

function publicNotificationDetail(row: any) {
  const payload = row.payload || {};
  const preview = {
    receipt_number: payload.receipt_number || row.receipt_number || null,
    amount: payload.amount || null,
    appointment_date: payload.appointment_date || null,
    package_names: payload.package_names || null,
    patient_label: payload.patient_name || payload.purchaser_name ? 'Patient available' : null,
  };
  return {
    ...publicNotification(row),
    payload_preview: preview,
  };
}

function buildNotificationFilters(filters: NotificationFilters = {}) {
  const values: any[] = [];
  const conditions: string[] = [];
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`no.status = $${values.length}`);
  }
  if (filters.channel) {
    values.push(filters.channel);
    conditions.push(`no.channel = $${values.length}`);
  }
  if (filters.entity === 'appointment') conditions.push('no.appointment_id IS NOT NULL');
  if (filters.entity === 'package_order') conditions.push('no.order_id IS NOT NULL');
  if (filters.entity === 'payment') conditions.push('no.payment_id IS NOT NULL');
  if (filters.from) {
    values.push(filters.from);
    conditions.push(`no.created_at::date >= $${values.length}`);
  }
  if (filters.to) {
    values.push(filters.to);
    conditions.push(`no.created_at::date <= $${values.length}`);
  }
  if (filters.search) {
    values.push(`%${filters.search.trim()}%`);
    conditions.push(
      `(no.template ILIKE $${values.length}
        OR no.channel ILIKE $${values.length}
        OR r.receipt_number ILIKE $${values.length}
        OR po.order_number ILIKE $${values.length}
        OR a.appointment_number ILIKE $${values.length})`
    );
  }
  return {
    values,
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
  };
}

function notificationOrderBy(sort: NotificationFilters['sort']) {
  switch (sort) {
    case 'date_asc':
      return 'no.created_at ASC, no.id ASC';
    case 'updated_desc':
      return 'no.updated_at DESC, no.id DESC';
    case 'updated_asc':
      return 'no.updated_at ASC, no.id ASC';
    case 'date_desc':
    default:
      return 'no.created_at DESC, no.id DESC';
  }
}

function receiptSubject(language: string, receiptNumber: string): string {
  if (language === 'hi') return `Spandan Clinic receipt ${receiptNumber}`;
  if (language === 'mr') return `Spandan Clinic receipt ${receiptNumber}`;
  return `Spandan Clinic receipt ${receiptNumber}`;
}

function receiptHtml(payload: Record<string, any>): string {
  return `
    <h2>Spandan Clinic Receipt</h2>
    <p>Dear ${payload.patient_name || payload.purchaser_name || 'Patient'},</p>
    <p>Your payment has been received successfully.</p>
    <table style="border-collapse:collapse;width:100%;max-width:560px">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Receipt</td><td style="padding:8px;border:1px solid #ddd">${payload.receipt_number}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Transaction</td><td style="padding:8px;border:1px solid #ddd">${payload.merchant_transaction_id}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Amount</td><td style="padding:8px;border:1px solid #ddd">Rs. ${Number(payload.amount || 0).toFixed(2)}</td></tr>
      ${payload.appointment_date ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Appointment</td><td style="padding:8px;border:1px solid #ddd">${payload.appointment_date} ${String(payload.start_time || '').slice(0, 5)}</td></tr>` : ''}
      ${payload.package_names ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Package</td><td style="padding:8px;border:1px solid #ddd">${payload.package_names}</td></tr>` : ''}
    </table>
    <p>Clinic: Spandan Super Speciality Clinic, Garkheda, Chhatrapati Sambhajinagar.</p>
  `;
}

export async function getReceiptDetailsByPaymentId(db: Queryable, paymentId: string) {
  const result = await db.query(
    `SELECT p.*, r.id AS receipt_id, r.receipt_number, r.pdf_url, r.generated_at, r.issued_at,
            po.order_number, po.purchaser_name, po.phone AS order_phone, po.email AS order_email, po.preferred_language AS order_language,
            a.appointment_number, a.appointment_date, a.start_time,
            patient.id AS patient_id,
            patient.full_name AS patient_name, patient.phone AS patient_phone, patient.email AS patient_email, patient.preferred_language AS patient_language,
            STRING_AGG(DISTINCT poi.package_name, ', ') AS package_names
     FROM payments p
     JOIN receipts r ON r.payment_id = p.id
     LEFT JOIN package_orders po ON po.id = p.order_id
     LEFT JOIN package_order_items poi ON poi.order_id = po.id
     LEFT JOIN appointments a ON a.id = p.appointment_id
     LEFT JOIN patients patient ON patient.id = COALESCE(a.patient_id, po.contact_patient_id)
     WHERE p.id = $1
     GROUP BY p.id, r.id, po.id, a.id, patient.id`,
    [paymentId]
  );
  return result.rows[0] || null;
}

export async function getReceiptDetailsByTransaction(transactionId: string) {
  const result = await query('SELECT id FROM payments WHERE merchant_transaction_id = $1', [transactionId]);
  if (!result.rows[0]) return null;
  return getReceiptDetailsByPaymentId({ query }, result.rows[0].id);
}

export async function queueReceiptEmailForPayment(db: PoolClient, paymentId: string) {
  const details = await getReceiptDetailsByPaymentId(db, paymentId);
  if (!details?.receipt_id) return null;

  const destination = details.order_email || details.patient_email || '';
  const language = normalizeLanguage(details.order_language || details.patient_language);
  const status = destination ? 'queued' : 'skipped_no_destination';
  const template = details.order_id ? 'package_purchase_confirmed' : 'appointment_confirmed';

  const inserted = await db.query(
    `INSERT INTO notification_outbox
       (patient_id, appointment_id, order_id, payment_id, channel, template, destination, language, payload, status)
     VALUES ($1, $2, $3, $4, 'email', $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      details.patient_id || null,
      details.appointment_id || null,
      details.order_id || null,
      details.id,
      template,
      destination,
      language,
      JSON.stringify(details),
      status,
    ]
  );
  return inserted.rows[0] || null;
}

export async function queueReceiptEmailByReceiptId(receiptId: string, email?: string) {
  const receipt = await query('SELECT payment_id FROM receipts WHERE id = $1', [receiptId]);
  if (!receipt.rows[0]) return null;
  const details = await getReceiptDetailsByPaymentId({ query }, receipt.rows[0].payment_id);
  if (!details) return null;
  const destination = email || details.order_email || details.patient_email || '';
  const status = destination ? 'queued' : 'skipped_no_destination';
  const queued = await query(
    `INSERT INTO notification_outbox
       (patient_id, appointment_id, order_id, payment_id, channel, template, destination, language, payload, status)
     VALUES ($1, $2, $3, $4, 'email', $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      details.patient_id || null,
      details.appointment_id || null,
      details.order_id || null,
      details.id,
      details.order_id ? 'package_purchase_confirmed' : 'appointment_confirmed',
      destination,
      normalizeLanguage(details.order_language || details.patient_language),
      JSON.stringify({ ...details, email_override: email || null }),
      status,
    ]
  );
  return queued.rows[0] || null;
}

export async function processNotificationOutbox(limit = 10): Promise<number> {
  const transporter = getTransporter();
  if (!transporter) return 0;

  const picked = await query(
    `UPDATE notification_outbox
     SET status = 'sending', attempt_count = attempt_count + 1, updated_at = NOW()
     WHERE id IN (
       SELECT id FROM notification_outbox
       WHERE channel = 'email'
         AND status IN ('queued', 'retrying')
         AND next_attempt_at <= NOW()
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [limit]
  );

  for (const item of picked.rows) {
    try {
      const payload = item.payload || {};
      const pdf = buildReceiptPdf(payload);
      await transporter.sendMail({
        from: `"Spandan Clinic" <${config.smtp.user}>`,
        to: item.destination,
        subject: receiptSubject(item.language, payload.receipt_number || 'receipt'),
        html: receiptHtml(payload),
        attachments: [{
          filename: `${payload.receipt_number || 'receipt'}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        }],
      });
      await query(
        `UPDATE notification_outbox
         SET status = 'sent', sent_at = NOW(), error = NULL, updated_at = NOW()
         WHERE id = $1`,
        [item.id]
      );
      if (payload.receipt_id) {
        await query('UPDATE receipts SET emailed_at = NOW() WHERE id = $1', [payload.receipt_id]).catch(() => {});
      }
    } catch (err) {
      const attempts = Number(item.attempt_count || 1);
      const retry = attempts < MAX_NOTIFICATION_ATTEMPTS;
      logger.error('Receipt notification failed', { id: item.id, error: (err as Error).message });
      await query(
        `UPDATE notification_outbox
         SET status = $1,
             next_attempt_at = NOW() + ($2::text || ' minutes')::interval,
             error = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [
          retry ? 'retrying' : 'permanent_failure',
          Math.min(60, attempts * 5),
          (err as Error).message,
          item.id,
        ]
      );
    }
  }

  return picked.rows.length;
}

export async function listNotificationOutbox(filters: NotificationFilters = {}) {
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize || 25)));
  const offset = (page - 1) * pageSize;
  const { values, where } = buildNotificationFilters(filters);
  const pageValues = [...values, pageSize, offset];

  const [rows, count, summary] = await Promise.all([
    query(
      `SELECT no.id, no.patient_id, no.appointment_id, no.order_id, no.payment_id,
              no.channel, no.template, no.destination, no.language, no.status,
              no.attempt_count, no.next_attempt_at, no.sent_at, no.error,
              no.created_at, no.updated_at,
              r.receipt_number, po.order_number, a.appointment_number
     FROM notification_outbox no
     LEFT JOIN receipts r ON r.payment_id = no.payment_id
     LEFT JOIN package_orders po ON po.id = no.order_id
     LEFT JOIN appointments a ON a.id = no.appointment_id
     ${where}
     ORDER BY ${notificationOrderBy(filters.sort)}
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
      pageValues
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM notification_outbox no
       LEFT JOIN receipts r ON r.payment_id = no.payment_id
       LEFT JOIN package_orders po ON po.id = no.order_id
       LEFT JOIN appointments a ON a.id = no.appointment_id
       ${where}`,
      values
    ),
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE no.status IN ('queued', 'sending', 'retrying'))::int AS queued,
         COUNT(*) FILTER (WHERE no.status = 'failed')::int AS failed,
         COUNT(*) FILTER (WHERE no.status IN ('permanent_failure', 'manual_follow_up', 'skipped_no_destination'))::int AS manual,
         COUNT(*) FILTER (WHERE no.status = 'sent')::int AS sent
       FROM notification_outbox no
       LEFT JOIN receipts r ON r.payment_id = no.payment_id
       LEFT JOIN package_orders po ON po.id = no.order_id
       LEFT JOIN appointments a ON a.id = no.appointment_id
       ${where}`,
      values
    ),
  ]);

  const total = Number(count.rows[0]?.total || 0);
  return {
    notifications: rows.rows.map(publicNotification),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    summary: summary.rows[0] || { total: 0, queued: 0, failed: 0, manual: 0, sent: 0 },
  };
}

export async function getNotificationDetail(id: string) {
  const result = await query(
    `SELECT no.*, r.receipt_number, po.order_number, a.appointment_number,
            p.merchant_transaction_id, p.status AS payment_status
     FROM notification_outbox no
     LEFT JOIN receipts r ON r.payment_id = no.payment_id
     LEFT JOIN package_orders po ON po.id = no.order_id
     LEFT JOIN appointments a ON a.id = no.appointment_id
     LEFT JOIN payments p ON p.id = no.payment_id
     WHERE no.id = $1`,
    [id]
  );
  const notification = result.rows[0] || null;
  if (!notification) return null;

  const audit = await query(
    `SELECT id, action, metadata, created_at
     FROM audit_log
     WHERE entity_type = 'notification' AND entity_id = $1
     ORDER BY created_at DESC
     LIMIT 25`,
    [id]
  );

  const history = [
    {
      id: notification.id,
      type: 'notification',
      status: notification.status,
      attempt_count: notification.attempt_count,
      created_at: notification.updated_at || notification.created_at,
      error: normalizeNotificationError(notification.error),
    },
    ...audit.rows.map((event) => ({
      id: event.id,
      type: 'audit',
      action: event.action,
      status: event.metadata?.status || event.metadata?.result_status || '',
      reason: event.metadata?.reason || '',
      created_at: event.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { notification: publicNotificationDetail(notification), history };
}

async function loadNotificationForUpdate(id: string) {
  const result = await query(
    `SELECT * FROM notification_outbox WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function retryNotification(id: string, actorStaffId?: string) {
  const current = await loadNotificationForUpdate(id);
  if (!current) return null;
  const eligibility = retryEligibility(current);
  if (!eligibility.eligible) {
    throw new AppError(409, 'NOTIFICATION_RETRY_INELIGIBLE', eligibility.reason);
  }

  const result = await query(
    `UPDATE notification_outbox
     SET status = 'queued',
         next_attempt_at = NOW(),
         error = NULL,
         updated_at = NOW()
     WHERE id = $1
       AND status NOT IN ('sent', 'sending', 'permanent_failure', 'manual_follow_up', 'skipped_no_destination')
       AND attempt_count < $2
       AND destination <> ''
       AND next_attempt_at <= NOW()
     RETURNING *`,
    [id, MAX_NOTIFICATION_ATTEMPTS]
  );
  const notification = result.rows[0] || null;
  if (!notification) {
    throw new AppError(409, 'NOTIFICATION_RETRY_CONFLICT', 'Notification retry state changed. Refresh and try again.');
  }

  await query(
    `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
     VALUES ($1, 'notification.retry', 'notification', $2, $3)`,
    [
      actorStaffId || null,
      id,
      JSON.stringify({
        status: notification.status,
        previous_status: current.status,
        attempt_count: notification.attempt_count,
      }),
    ]
  );

  return publicNotification(notification);
}

export async function bulkRetryNotifications(ids: string[], actorStaffId?: string) {
  const results = [];
  for (const id of ids) {
    try {
      const notification = await retryNotification(id, actorStaffId);
      results.push({ id, ok: true, notification });
    } catch (err) {
      const error = err as Error & { code?: string };
      results.push({ id, ok: false, code: error.code || 'RETRY_FAILED', message: error.message });
    }
  }
  return { results };
}

export async function deadLetterNotification(id: string, reason: string, actorStaffId?: string) {
  const current = await loadNotificationForUpdate(id);
  if (!current) return null;
  if (current.status === 'sent') {
    throw new AppError(409, 'NOTIFICATION_DEAD_LETTER_INELIGIBLE', 'Sent notifications cannot be moved to manual follow-up.');
  }

  const result = await query(
    `UPDATE notification_outbox
     SET status = 'manual_follow_up',
         error = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, reason]
  );

  await query(
    `INSERT INTO audit_log (actor_staff_id, action, entity_type, entity_id, metadata)
     VALUES ($1, 'notification.manual_follow_up', 'notification', $2, $3)`,
    [
      actorStaffId || null,
      id,
      JSON.stringify({
        previous_status: current.status,
        status: 'manual_follow_up',
        reason,
      }),
    ]
  );

  return publicNotification(result.rows[0]);
}
