import cron from 'node-cron';
import { query } from '../config/database';
import { config } from '../config';
import { isWhatsAppConfigured, sendWhatsAppEnquiryNotification } from './whatsapp';

let whatsappNotificationJobRunning = false;

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
        console.error('WhatsApp notification failed:', err);
        await query(
          `INSERT INTO notification_log (appointment_request_id, channel, status, attempt, error_message)
           VALUES ($1, 'whatsapp', 'failed', 1, $2)`,
          [lead.id, (err as Error).message]
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[Cron] WhatsApp notification scan failed:', err);
  } finally {
    whatsappNotificationJobRunning = false;
  }
}

export function startBackgroundJobs(): void {
  if (isWhatsAppConfigured()) {
    cron.schedule('* * * * *', sendPendingWhatsAppNotifications);
    sendPendingWhatsAppNotifications().catch((err) => console.error('Initial WhatsApp notification scan failed:', err));
  }

  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Running daily maintenance...');
    try {
      await query('CHECKPOINT');
      console.log('[Cron] Checkpoint complete');
    } catch (err) {
      console.error('[Cron] Checkpoint failed:', err);
    }
  });

  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Archiving old leads...');
    try {
      const result = await query(
        `UPDATE appointment_requests
         SET message = COALESCE(message || '', '') || ' [Auto-archived after 90 days]'
         WHERE status IN ('completed', 'closed_no_response')
         AND created_at < NOW() - INTERVAL '90 days'`
      );
      console.log(`[Cron] Archived ${result.rowCount} old leads`);
    } catch (err) {
      console.error('[Cron] Cleanup failed:', err);
    }
  });

  if (config.env === 'development') {
    console.log('Background jobs registered (daily schedule)');
  }
}
