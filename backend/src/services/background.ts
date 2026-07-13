import cron from 'node-cron';
import { query } from '../config/database';
import { config } from '../config';
import { isWhatsAppConfigured, sendWhatsAppEnquiryNotification } from './whatsapp';
import { processNotificationOutbox } from './notifications';
import { logger } from '../utils/logger';
import { processJobs as processDocumentJobs } from './medicalDocuments';
import { reconcilePendingPayments } from './operations';

let whatsappNotificationJobRunning = false;
let notificationOutboxJobRunning = false;

async function sendPendingWhatsAppNotifications(): Promise<void> {
  if (!isWhatsAppConfigured() || whatsappNotificationJobRunning) {
    return;
  }

  whatsappNotificationJobRunning = true;
  try {
    const result = await query(
      `SELECT ar.id, ar.patient_name, ar.phone, ar.email, ar.message,
              ar.preferred_date, ar.preferred_time_window, ar.created_at,
              p.name AS package_name, d.name AS doctor_name
       FROM appointment_requests ar
       LEFT JOIN packages p ON p.id = ar.package_id
       LEFT JOIN doctors d ON d.id = ar.doctor_id
       WHERE ar.created_at >= NOW() - INTERVAL '1 day'
       AND NOT EXISTS (
         SELECT 1 FROM notification_log nl
         WHERE nl.appointment_request_id = ar.id
         AND nl.channel = 'whatsapp'
       )
       ORDER BY ar.created_at ASC
       LIMIT 10`
    );

    for (const lead of result.rows) {
      try {
        await sendWhatsAppEnquiryNotification({
          enquiryId: lead.id,
          patientName: lead.patient_name,
          patientPhone: lead.phone,
          patientEmail: lead.email,
          packageName: lead.package_name,
          doctorName: lead.doctor_name,
          message: lead.message,
          preferredDate: lead.preferred_date,
          preferredTimeWindow: lead.preferred_time_window,
          createdAt: lead.created_at,
        });

        await query(
          `INSERT INTO notification_log (appointment_request_id, channel, status, attempt)
           VALUES ($1, 'whatsapp', 'sent', 1)`,
          [lead.id]
        ).catch(() => {});
      } catch (err) {
        logger.error('WhatsApp notification failed', { error: (err as Error).message });
        await query(
          `INSERT INTO notification_log (appointment_request_id, channel, status, attempt, error_message)
           VALUES ($1, 'whatsapp', 'failed', 1, $2)`,
          [lead.id, (err as Error).message]
        ).catch(() => {});
      }
    }
  } catch (err) {
    logger.error('WhatsApp notification scan failed', { error: (err as Error).message });
  } finally {
    whatsappNotificationJobRunning = false;
  }
}

export function startBackgroundJobs(): void {
  let paymentReconciliationRunning = false;
  let documentJobRunning=false;
  cron.schedule('* * * * *',async()=>{if(documentJobRunning)return;documentJobRunning=true;try{await processDocumentJobs();}catch(err){logger.error('Document processing failed',{error:(err as Error).message});}finally{documentJobRunning=false;}});
  cron.schedule('* * * * *', async () => {
    if (notificationOutboxJobRunning) return;
    notificationOutboxJobRunning = true;
    try {
      const processed = await processNotificationOutbox();
      if (processed > 0) {
        logger.info('Processed notification outbox', { count: processed });
      }
    } catch (err) {
      logger.error('Notification outbox processing failed', { error: (err as Error).message });
    } finally {
      notificationOutboxJobRunning = false;
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    if (paymentReconciliationRunning) return;
    paymentReconciliationRunning = true;
    try {
      const result = await reconcilePendingPayments(25);
      if (result.checked || result.exceptions) logger.info('Payment reconciliation completed', result);
    } catch (err) {
      logger.error('Payment reconciliation failed', { error_code: 'PAYMENT_RECONCILIATION_FAILED' });
    } finally { paymentReconciliationRunning = false; }
  });
  processNotificationOutbox().catch((err) => logger.error('Initial notification outbox processing failed', { error: err.message }));
  processDocumentJobs().catch((err)=>logger.error('Initial document processing failed',{error:err.message}));

  if (isWhatsAppConfigured()) {
    cron.schedule('* * * * *', sendPendingWhatsAppNotifications);
    sendPendingWhatsAppNotifications().catch((err) => logger.error('Initial WhatsApp notification scan failed', { error: err.message }));
  }

  cron.schedule('* * * * *', async () => {
    try {
      const result = await query(
        `UPDATE appointment_holds
         SET status = 'expired', released_at = COALESCE(released_at, NOW())
         WHERE status = 'active' AND expires_at <= NOW()`
      );
      if (result.rowCount) {
        logger.info('Expired appointment holds released', { count: result.rowCount });
      }
    } catch (err) {
      logger.error('Appointment hold cleanup failed', { error: (err as Error).message });
    }
  });

  cron.schedule('0 2 * * *', async () => {
    logger.info('Running daily maintenance');
    try {
      await query('CHECKPOINT');
      logger.info('Checkpoint complete');
    } catch (err) {
      logger.error('Checkpoint failed', { error: (err as Error).message });
    }
  });

  cron.schedule('0 3 * * *', async () => {
    logger.info('Archiving old leads');
    try {
      const result = await query(
        `UPDATE appointment_requests
         SET is_archived = true,
             archived_at = COALESCE(archived_at, NOW()),
             updated_at = NOW()
         WHERE status IN ('completed', 'closed_no_response')
         AND created_at < NOW() - INTERVAL '90 days'
         AND COALESCE(is_archived, false) = false`
      );
      logger.info('Old leads archived', { count: result.rowCount || 0 });
    } catch (err) {
      logger.error('Lead archive cleanup failed', { error: (err as Error).message });
    }
  });

  cron.schedule('*/15 * * * *', async () => {
    try {
      const expired = await query(`UPDATE intake_invitations SET status='expired',updated_at=NOW() WHERE status='active' AND expires_at<=NOW()`);
      const sessions = await query(`UPDATE verified_contact_sessions SET session_token_hash=NULL,updated_at=NOW() WHERE session_token_hash IS NOT NULL AND session_expires_at<=NOW()`);
      if (expired.rowCount || sessions.rowCount) logger.info('Remote intake security cleanup complete', { invitations_expired: expired.rowCount || 0, sessions_closed: sessions.rowCount || 0 });
    } catch (err) { logger.error('Remote intake cleanup failed', { error: (err as Error).message }); }
  });

  if (config.env === 'development') {
    logger.info('Background jobs registered', { schedule: 'daily' });
  }
}
