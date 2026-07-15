import { randomUUID } from 'node:crypto';
import { query } from '../config/database';

export type ClaimedWorkerJob = {
  name: string;
  leaseToken: string;
  leaseSeconds: number;
};

export type WorkerHealthSnapshot = {
  activeWorkers: number;
  staleWorkers: number;
  dueJobs: number;
  deadLetterJobs: number;
  oldestDueSeconds: number;
};

export interface WorkerLeaseStore {
  register(instanceId: string, version: string): Promise<void>;
  heartbeat(instanceId: string, status: 'active' | 'draining'): Promise<void>;
  stop(instanceId: string): Promise<void>;
  claim(instanceId: string, leaseSeconds: number): Promise<ClaimedWorkerJob | null>;
  extend(instanceId: string, job: ClaimedWorkerJob): Promise<boolean>;
  succeed(instanceId: string, job: ClaimedWorkerJob): Promise<boolean>;
  fail(instanceId: string, job: ClaimedWorkerJob, errorCode: string): Promise<boolean>;
  health(): Promise<WorkerHealthSnapshot>;
}

export class PostgresWorkerLeaseStore implements WorkerLeaseStore {
  async register(instanceId: string, version: string): Promise<void> {
    await query(
      `INSERT INTO worker_instances (id, service_version, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (id) DO UPDATE
       SET service_version = EXCLUDED.service_version, status = 'active',
           heartbeat_at = NOW(), stopped_at = NULL`,
      [instanceId, version]
    );
  }

  async heartbeat(instanceId: string, status: 'active' | 'draining'): Promise<void> {
    await query(
      `UPDATE worker_instances SET status = $2, heartbeat_at = NOW()
       WHERE id = $1 AND status <> 'stopped'`,
      [instanceId, status]
    );
  }

  async stop(instanceId: string): Promise<void> {
    await query(
      `UPDATE worker_instances
       SET status = 'stopped', heartbeat_at = NOW(), stopped_at = NOW()
       WHERE id = $1`,
      [instanceId]
    );
  }

  async claim(instanceId: string, leaseSeconds: number): Promise<ClaimedWorkerJob | null> {
    const leaseToken = randomUUID();
    const result = await query<{ name: string }>(
      `WITH candidate AS (
         SELECT name FROM worker_jobs
         WHERE status = 'enabled' AND next_run_at <= NOW()
           AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())
         ORDER BY next_run_at, name
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE worker_jobs job
       SET lease_owner = $1, lease_token = $2,
           lease_expires_at = NOW() + make_interval(secs => $3),
           total_attempts = total_attempts + 1, last_started_at = NOW(), updated_at = NOW()
       FROM candidate WHERE job.name = candidate.name
       RETURNING job.name`,
      [instanceId, leaseToken, leaseSeconds]
    );
    return result.rows[0] ? { name: result.rows[0].name, leaseToken, leaseSeconds } : null;
  }

  async extend(instanceId: string, job: ClaimedWorkerJob): Promise<boolean> {
    const result = await query(
      `UPDATE worker_jobs SET lease_expires_at = NOW() + make_interval(secs => $3), updated_at = NOW()
       WHERE name = $1 AND lease_owner = $2 AND lease_token = $4 AND status = 'enabled'`,
      [job.name, instanceId, job.leaseSeconds, job.leaseToken]
    );
    return result.rowCount === 1;
  }

  async succeed(instanceId: string, job: ClaimedWorkerJob): Promise<boolean> {
    const result = await query(
      `UPDATE worker_jobs
       SET next_run_at = NOW() + make_interval(secs => interval_seconds),
           lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
           consecutive_failures = 0, last_succeeded_at = NOW(), last_error_code = NULL,
           updated_at = NOW()
       WHERE name = $1 AND lease_owner = $2 AND lease_token = $3 AND status = 'enabled'`,
      [job.name, instanceId, job.leaseToken]
    );
    return result.rowCount === 1;
  }

  async fail(instanceId: string, job: ClaimedWorkerJob, errorCode: string): Promise<boolean> {
    const result = await query(
      `UPDATE worker_jobs
       SET consecutive_failures = consecutive_failures + 1,
           total_failures = total_failures + 1,
           status = CASE WHEN consecutive_failures + 1 >= max_attempts THEN 'dead_letter' ELSE status END,
           dead_lettered_at = CASE WHEN consecutive_failures + 1 >= max_attempts THEN NOW() ELSE NULL END,
           next_run_at = NOW() + make_interval(secs => LEAST(900, (5 * POWER(2, consecutive_failures))::integer)),
           lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
           last_failed_at = NOW(), last_error_code = $4, updated_at = NOW()
       WHERE name = $1 AND lease_owner = $2 AND lease_token = $3 AND status = 'enabled'`,
      [job.name, instanceId, job.leaseToken, errorCode]
    );
    return result.rowCount === 1;
  }

  async health(): Promise<WorkerHealthSnapshot> {
    const result = await query<{
      active_workers: number;
      stale_workers: number;
      due_jobs: number;
      dead_letter_jobs: number;
      oldest_due_seconds: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM worker_instances WHERE status = 'active' AND heartbeat_at > NOW() - INTERVAL '15 seconds') AS active_workers,
         (SELECT COUNT(*)::int FROM worker_instances WHERE status IN ('active','draining') AND heartbeat_at <= NOW() - INTERVAL '15 seconds') AS stale_workers,
         COUNT(*) FILTER (
           WHERE status = 'enabled' AND next_run_at <= NOW()
             AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())
         )::int AS due_jobs,
         COUNT(*) FILTER (WHERE status = 'dead_letter')::int AS dead_letter_jobs,
         COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - next_run_at))) FILTER (
           WHERE status = 'enabled' AND next_run_at <= NOW()
             AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())
         ), 0)::int AS oldest_due_seconds
       FROM worker_jobs`
    );
    const row = result.rows[0];
    return {
      activeWorkers: Number(row?.active_workers || 0),
      staleWorkers: Number(row?.stale_workers || 0),
      dueJobs: Number(row?.due_jobs || 0),
      deadLetterJobs: Number(row?.dead_letter_jobs || 0),
      oldestDueSeconds: Number(row?.oldest_due_seconds || 0),
    };
  }
}
