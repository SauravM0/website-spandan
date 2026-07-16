import { query } from '../config/database';
import { config } from '../config';
import { processNotificationOutbox } from '../services/notifications';
import { processJobs as processDocumentJobs } from '../services/medicalDocuments';
import { processAdminExportJobs, reconcilePendingPayments } from '../services/operations';
import { isWhatsAppConfigured, sendWhatsAppEnquiryNotification } from '../services/whatsapp';
import { logger } from '../utils/logger';
import type { WorkerJobHandler } from './runtime';

async function processWhatsAppNotifications(): Promise<void> {
  if (!isWhatsAppConfigured()) return;
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
         WHERE nl.appointment_request_id = ar.id AND nl.channel = 'whatsapp'
       )
     ORDER BY ar.created_at ASC LIMIT 10`
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
      );
    } catch (error) {
      logger.error('WhatsApp notification failed', { error_code: 'WHATSAPP_DELIVERY_FAILED' });
      await query(
        `INSERT INTO notification_log
           (appointment_request_id, channel, status, attempt, error_message)
         VALUES ($1, 'whatsapp', 'failed', 1, 'WhatsApp delivery failed.')`,
        [lead.id]
      );
    }
  }
}

const notificationOutbox: WorkerJobHandler = async (job, instanceId) => {
  await processNotificationOutbox(10, {
    ownerId: instanceId,
    token: job.leaseToken,
    leaseSeconds: job.leaseSeconds,
  });
};

export function createWorkerJobHandlers(): Record<string, WorkerJobHandler> {
  return {
    'notification-outbox': notificationOutbox,
    'document-processing': async () => {
      await query(
        `UPDATE document_processing_jobs
         SET status = 'failed', available_at = NOW(), lease_owner = NULL,
             lease_token = NULL, lease_expires_at = NULL, last_error_code = 'WORKER_LEASE_EXPIRED',
             updated_at = NOW()
         WHERE status = 'running' AND locked_at <= NOW() - INTERVAL '30 seconds'`
      );
      await processDocumentJobs();
    },
    'payment-reconciliation': async () => {
      await reconcilePendingPayments(25);
    },
    'appointment-hold-cleanup': async () => {
      await query(
        `UPDATE appointment_holds
         SET status = 'expired', released_at = COALESCE(released_at, NOW())
         WHERE status = 'active' AND expires_at <= NOW()`
      );
    },
    'remote-intake-cleanup': async () => {
      await query(
        `UPDATE intake_invitations SET status='expired',updated_at=NOW()
         WHERE status='active' AND expires_at<=NOW()`
      );
      await query(
        `UPDATE verified_contact_sessions SET session_token_hash=NULL,updated_at=NOW()
         WHERE session_token_hash IS NOT NULL AND session_expires_at<=NOW()`
      );
    },
    'whatsapp-notification': async () => {
      if (config.whatsapp.enabled) await processWhatsAppNotifications();
    },
    'lead-archive': async () => {
      await query(
        `UPDATE appointment_requests
         SET is_archived = true, archived_at = COALESCE(archived_at, NOW()), updated_at = NOW()
         WHERE status IN ('completed', 'closed_no_response')
           AND created_at < NOW() - INTERVAL '90 days'
           AND COALESCE(is_archived, false) = false`
      );
    },
    'admin-export': async (_job, instanceId) => {
      await processAdminExportJobs(instanceId);
    },
  };
}
