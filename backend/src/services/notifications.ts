import nodemailer from 'nodemailer';
import { PoolClient } from 'pg';
import { config } from '../config';
import { query } from '../config/database';
import { buildReceiptPdf } from './receiptPdf';
import { logger } from '../utils/logger';

type Queryable = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
};

function getTransporter() {
  if (!config.smtp.host || !config.smtp.user) {
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
      const retry = attempts < 3;
      logger.error('Receipt notification failed', { id: item.id, error: (err as Error).message });
      await query(
        `UPDATE notification_outbox
         SET status = $1,
             next_attempt_at = NOW() + ($2::text || ' minutes')::interval,
             error = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [retry ? 'retrying' : 'failed', Math.min(60, attempts * 5), (err as Error).message, item.id]
      );
    }
  }

  return picked.rows.length;
}

export async function listNotificationOutbox() {
  const result = await query(
    `SELECT no.*, r.receipt_number, po.order_number, a.appointment_number
     FROM notification_outbox no
     LEFT JOIN receipts r ON r.payment_id = no.payment_id
     LEFT JOIN package_orders po ON po.id = no.order_id
     LEFT JOIN appointments a ON a.id = no.appointment_id
     ORDER BY no.created_at DESC
     LIMIT 100`
  );
  return result.rows;
}

export async function retryNotification(id: string) {
  const result = await query(
    `UPDATE notification_outbox
     SET status = CASE WHEN destination = '' THEN 'skipped_no_destination' ELSE 'queued' END,
         next_attempt_at = NOW(),
         error = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}
