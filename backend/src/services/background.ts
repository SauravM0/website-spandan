import cron, { type ScheduledTask } from 'node-cron';
import { query } from '../config/database';
import { config } from '../config';
import { isWhatsAppConfigured, sendWhatsAppEnquiryNotification } from './whatsapp';
import { processNotificationOutbox } from './notifications';
import { logger } from '../utils/logger';
import { processJobs as processDocumentJobs } from './medicalDocuments';
import { reconcilePendingPayments } from './operations';

type Job = () => Promise<void>;
type Schedule = (
  expression: string,
  job: () => void | Promise<void>
) => Pick<ScheduledTask, 'stop'>;

export type BackgroundJobController = {
  stopAccepting(): Promise<void>;
  drain(): Promise<void>;
  readonly accepting: boolean;
  readonly activeCount: number;
};

export class BackgroundJobRuntime implements BackgroundJobController {
  private isAccepting = true;
  private readonly tasks: Array<Pick<ScheduledTask, 'stop'>> = [];
  private readonly active = new Set<Promise<void>>();
  private readonly runningNames = new Set<string>();

  constructor(
    private readonly schedule: Schedule,
    private readonly onError: (name: string, error: unknown) => void
  ) {}

  get accepting(): boolean {
    return this.isAccepting;
  }

  get activeCount(): number {
    return this.active.size;
  }

  register(expression: string, name: string, job: Job): void {
    const task = this.schedule(expression, () => this.execute(name, job));
    this.tasks.push(task);
  }

  runNow(name: string, job: Job): Promise<void> {
    return this.execute(name, job);
  }

  private execute(name: string, job: Job): Promise<void> {
    if (!this.isAccepting || this.runningNames.has(name)) return Promise.resolve();
    this.runningNames.add(name);
    const execution = Promise.resolve()
      .then(job)
      .catch((error) => this.onError(name, error))
      .finally(() => {
        this.runningNames.delete(name);
        this.active.delete(execution);
      });
    this.active.add(execution);
    return execution;
  }

  async stopAccepting(): Promise<void> {
    if (!this.isAccepting) return;
    this.isAccepting = false;
    await Promise.all(this.tasks.map((task) => task.stop()));
  }

  async drain(): Promise<void> {
    await Promise.allSettled([...this.active]);
  }
}

async function sendPendingWhatsAppNotifications(): Promise<void> {
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
    } catch (error) {
      logger.error('WhatsApp notification failed', { error: (error as Error).message });
      await query(
        `INSERT INTO notification_log
           (appointment_request_id, channel, status, attempt, error_message)
         VALUES ($1, 'whatsapp', 'failed', 1, $2)`,
        [lead.id, (error as Error).message]
      ).catch(() => {});
    }
  }
}

export function startBackgroundJobs(): BackgroundJobController {
  const runtime = new BackgroundJobRuntime(
    (expression, job) => cron.schedule(expression, job),
    (name) => logger.error('Background job failed', { job: name, error_code: 'JOB_FAILED' })
  );

  runtime.register('* * * * *', 'document-processing', async () => {
    await processDocumentJobs();
  });
  runtime.register('* * * * *', 'notification-outbox', async () => {
    const processed = await processNotificationOutbox();
    if (processed > 0) logger.info('Processed notification outbox', { count: processed });
  });
  runtime.register('*/5 * * * *', 'payment-reconciliation', async () => {
    const result = await reconcilePendingPayments(25);
    if (result.checked || result.exceptions)
      logger.info('Payment reconciliation completed', result);
  });
  runtime.register('* * * * *', 'appointment-hold-cleanup', async () => {
    const result = await query(
      `UPDATE appointment_holds
       SET status = 'expired', released_at = COALESCE(released_at, NOW())
       WHERE status = 'active' AND expires_at <= NOW()`
    );
    if (result.rowCount)
      logger.info('Expired appointment holds released', { count: result.rowCount });
  });
  runtime.register('0 2 * * *', 'database-checkpoint', async () => {
    logger.info('Running daily maintenance');
    await query('CHECKPOINT');
    logger.info('Checkpoint complete');
  });
  runtime.register('0 3 * * *', 'lead-archive', async () => {
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
  });
  runtime.register('*/15 * * * *', 'remote-intake-cleanup', async () => {
    const expired = await query(
      `UPDATE intake_invitations SET status='expired',updated_at=NOW()
       WHERE status='active' AND expires_at<=NOW()`
    );
    const sessions = await query(
      `UPDATE verified_contact_sessions SET session_token_hash=NULL,updated_at=NOW()
       WHERE session_token_hash IS NOT NULL AND session_expires_at<=NOW()`
    );
    if (expired.rowCount || sessions.rowCount) {
      logger.info('Remote intake security cleanup complete', {
        invitations_expired: expired.rowCount || 0,
        sessions_closed: sessions.rowCount || 0,
      });
    }
  });

  void runtime.runNow('notification-outbox', async () => {
    await processNotificationOutbox();
  });
  void runtime.runNow('document-processing', async () => {
    await processDocumentJobs();
  });
  if (isWhatsAppConfigured()) {
    runtime.register('* * * * *', 'whatsapp-notification', sendPendingWhatsAppNotifications);
    void runtime.runNow('whatsapp-notification', sendPendingWhatsAppNotifications);
  }
  if (config.env === 'development') logger.info('Background jobs registered');
  return runtime;
}
