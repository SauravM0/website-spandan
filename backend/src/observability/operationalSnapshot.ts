import { getDatabasePoolSnapshot, query } from '../config/database';
import { PostgresWorkerLeaseStore } from '../worker/leaseStore';
import { telemetrySnapshot } from './metrics';
import { adminEventStreamSnapshot } from '../services/adminEventStream';

const number = (value: unknown): number => Number(value || 0);

export async function operationalSnapshot() {
  const [payments, notifications, conflicts, worker] = await Promise.all([
    query(`SELECT
      COUNT(*) FILTER (WHERE status IN ('created','pending','processing','verification_required','refund_pending'))::int AS pending,
      COUNT(*) FILTER (WHERE status IN ('failed','expired'))::int AS failed,
      COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - created_at))) FILTER
        (WHERE status IN ('created','pending','processing','verification_required','refund_pending')), 0)::int AS oldest_pending_seconds
      FROM payments`),
    query(`SELECT
      COUNT(*) FILTER (WHERE status IN ('queued','retrying','sending'))::int AS queued,
      COUNT(*) FILTER (WHERE status IN ('permanent_failure','dead_letter','manual_follow_up'))::int AS dead_letters,
      COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - created_at))) FILTER
        (WHERE status IN ('queued','retrying','sending')), 0)::int AS oldest_queued_seconds
      FROM notification_outbox`),
    query(`SELECT COUNT(*)::int AS open_conflicts
      FROM schedule_conflict_cases WHERE status IN ('open','ready')`),
    new PostgresWorkerLeaseStore().health(),
  ]);
  const payment = payments.rows[0] || {};
  const notification = notifications.rows[0] || {};
  const runtime = telemetrySnapshot();
  return {
    ...runtime,
    database: getDatabasePoolSnapshot(),
    eventStreams: adminEventStreamSnapshot(),
    worker,
    payments: {
      pending: number(payment.pending),
      failed: number(payment.failed),
      oldestPendingSeconds: number(payment.oldest_pending_seconds),
    },
    notifications: {
      queued: number(notification.queued),
      deadLetters: number(notification.dead_letters),
      oldestQueuedSeconds: number(notification.oldest_queued_seconds),
    },
    bookings: {
      ...runtime.bookings,
      openScheduleConflicts: number(conflicts.rows[0]?.open_conflicts),
    },
  };
}

const metric = (name: string, value: number, labels = '') => `${name}${labels} ${value}`;
const label = (value: string) => value.replace(/[^a-zA-Z0-9_/:. -]/g, '_').slice(0, 160);

export function renderPrometheus(
  snapshot: Awaited<ReturnType<typeof operationalSnapshot>>
): string {
  const lines = [
    metric(
      'spandan_build_info',
      1,
      `{version="${label(snapshot.application.version)}",role="${label(snapshot.application.processRole)}"}`
    ),
    metric('spandan_http_requests_total', snapshot.http.totalRequests),
    metric('spandan_http_responses_4xx_total', snapshot.http.response4xx),
    metric('spandan_http_responses_5xx_total', snapshot.http.response5xx),
    metric('spandan_http_401_total', snapshot.http.auth401),
    metric('spandan_http_403_total', snapshot.http.auth403),
    metric('spandan_http_429_total', snapshot.http.rateLimited429),
    metric('spandan_http_latency_p50_ms', snapshot.http.latencyMs.p50),
    metric('spandan_http_latency_p95_ms', snapshot.http.latencyMs.p95),
    metric('spandan_http_latency_p99_ms', snapshot.http.latencyMs.p99),
    metric('spandan_process_resident_memory_bytes', snapshot.process.residentMemoryBytes),
    metric('spandan_process_heap_used_bytes', snapshot.process.heapUsedBytes),
    metric('spandan_process_event_loop_lag_p95_ms', snapshot.process.eventLoopLagP95Ms),
    metric('spandan_database_pool_total', snapshot.database.totalConnections),
    metric('spandan_database_pool_idle', snapshot.database.idleConnections),
    metric('spandan_database_pool_waiting', snapshot.database.waitingRequests),
    metric('spandan_database_acquisition_p95_ms', snapshot.database.acquisitionP95Ms),
    metric('spandan_database_query_p95_ms', snapshot.database.queryP95Ms),
    metric('spandan_database_query_errors_total', snapshot.database.queryErrorCount),
    metric('spandan_admin_event_stream_connections', snapshot.eventStreams.activeConnections),
    metric('spandan_admin_event_stream_capacity', snapshot.eventStreams.capacityPerReplica),
    metric('spandan_worker_active', snapshot.worker.activeWorkers),
    metric('spandan_worker_stale', snapshot.worker.staleWorkers),
    metric('spandan_worker_due_jobs', snapshot.worker.dueJobs),
    metric('spandan_worker_dead_letter_jobs', snapshot.worker.deadLetterJobs),
    metric('spandan_worker_oldest_due_seconds', snapshot.worker.oldestDueSeconds),
    metric('spandan_payments_pending', snapshot.payments.pending),
    metric('spandan_payments_failed', snapshot.payments.failed),
    metric('spandan_payment_oldest_pending_seconds', snapshot.payments.oldestPendingSeconds),
    metric('spandan_notifications_queued', snapshot.notifications.queued),
    metric('spandan_notifications_dead_letters', snapshot.notifications.deadLetters),
    metric(
      'spandan_notification_oldest_queued_seconds',
      snapshot.notifications.oldestQueuedSeconds
    ),
    metric('spandan_booking_holds_total', snapshot.bookings.holds),
    metric('spandan_booking_confirmations_total', snapshot.bookings.confirmations),
    metric('spandan_booking_conflicts_total', snapshot.bookings.conflicts),
    metric('spandan_booking_conversion_ratio', snapshot.bookings.conversionRatio),
    metric('spandan_booking_open_schedule_conflicts', snapshot.bookings.openScheduleConflicts),
  ];
  for (const series of snapshot.http.series) {
    const labels = `{method="${label(series.method)}",route="${label(series.route)}",status_class="${label(series.statusClass)}"}`;
    lines.push(metric('spandan_http_route_requests_total', series.count, labels));
  }
  for (const value of snapshot.webVitals) {
    const labels = `{name="${label(value.name)}",route_group="${label(value.routeGroup)}"}`;
    lines.push(metric('spandan_web_vital_p75', value.p75, labels));
    lines.push(metric('spandan_web_vital_samples', value.sampleCount, labels));
  }
  return `${lines.join('\n')}\n`;
}
