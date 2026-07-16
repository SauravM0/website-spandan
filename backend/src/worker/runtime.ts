import { randomUUID } from 'node:crypto';
import type { ClaimedWorkerJob, WorkerLeaseStore } from './leaseStore';
import { getDatabasePoolSnapshot } from '../config/database';
import { telemetrySnapshot } from '../observability/metrics';

export type WorkerJobHandler = (job: ClaimedWorkerJob, instanceId: string) => Promise<void>;

export type WorkerRuntimeOptions = {
  store: WorkerLeaseStore;
  handlers: Record<string, WorkerJobHandler>;
  version: string;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  leaseSeconds: number;
  instanceId?: string;
  log?: {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };
};

const errorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code).slice(0, 80)
    : 'WORKER_JOB_FAILED';

export class WorkerRuntime {
  readonly instanceId: string;
  private accepting = false;
  private activeJob: Promise<void> | undefined;
  private pollTimer: NodeJS.Timeout | undefined;
  private heartbeatTimer: NodeJS.Timeout | undefined;
  private heartbeatCount = 0;

  constructor(private readonly options: WorkerRuntimeOptions) {
    this.instanceId = options.instanceId || randomUUID();
  }

  async start(): Promise<void> {
    if (this.accepting) return;
    await this.options.store.register(this.instanceId, this.options.version);
    this.accepting = true;
    this.heartbeatTimer = setInterval(() => {
      void this.recordHeartbeat();
    }, this.options.heartbeatIntervalMs);
    this.schedulePoll(0);
    this.options.log?.info('Worker started', { version: this.options.version });
  }

  private async recordHeartbeat(): Promise<void> {
    try {
      await this.options.store.heartbeat(this.instanceId, 'active');
      this.heartbeatCount += 1;
      if (this.heartbeatCount % 6 === 0) {
        const health = await this.options.store.health();
        this.options.log?.info('Worker health', {
          ...health,
          process: telemetrySnapshot().process,
          database: getDatabasePoolSnapshot(),
          version: this.options.version,
        });
      }
    } catch {
      this.options.log?.warn('Worker heartbeat failed', {
        error_code: 'WORKER_HEARTBEAT_FAILED',
      });
    }
  }

  private schedulePoll(delayMs: number): void {
    if (!this.accepting) return;
    this.pollTimer = setTimeout(() => void this.poll(), delayMs);
  }

  private async poll(): Promise<void> {
    if (!this.accepting || this.activeJob) return;
    let claimed = false;
    try {
      const job = await this.options.store.claim(this.instanceId, this.options.leaseSeconds);
      if (!job) {
        return;
      }
      claimed = true;
      this.activeJob = this.execute(job);
      await this.activeJob;
    } catch {
      this.options.log?.error('Worker poll failed', { error_code: 'WORKER_POLL_FAILED' });
    } finally {
      this.activeJob = undefined;
      this.schedulePoll(claimed ? 0 : this.options.pollIntervalMs);
    }
  }

  private async execute(job: ClaimedWorkerJob): Promise<void> {
    const startedAt = process.hrtime.bigint();
    const handler = this.options.handlers[job.name];
    const leaseHeartbeatMs = Math.max(1_000, Math.floor((job.leaseSeconds * 1_000) / 3));
    const leaseHeartbeat = setInterval(() => {
      void this.options.store
        .extend(this.instanceId, job)
        .then((extended) => {
          if (!extended) this.options.log?.warn('Worker job lease lost', { job: job.name });
        })
        .catch(() =>
          this.options.log?.warn('Worker job lease heartbeat failed', {
            job: job.name,
            error_code: 'WORKER_LEASE_HEARTBEAT_FAILED',
          })
        );
    }, leaseHeartbeatMs);
    try {
      if (!handler)
        throw Object.assign(new Error('No registered worker job handler.'), {
          code: 'WORKER_HANDLER_MISSING',
        });
      await handler(job, this.instanceId);
      if (!(await this.options.store.succeed(this.instanceId, job))) {
        this.options.log?.warn('Stale worker completion rejected', { job: job.name });
      } else {
        this.options.log?.info('Worker job completed', {
          job: job.name,
          duration_ms: Math.round(Number(process.hrtime.bigint() - startedAt) / 1_000_000),
          outcome: 'success',
        });
      }
    } catch (error) {
      await this.options.store.fail(this.instanceId, job, errorCode(error));
      this.options.log?.error('Worker job failed', {
        job: job.name,
        duration_ms: Math.round(Number(process.hrtime.bigint() - startedAt) / 1_000_000),
        outcome: 'error',
        error_code: errorCode(error),
      });
    } finally {
      clearInterval(leaseHeartbeat);
    }
  }

  async stop(): Promise<void> {
    if (!this.accepting) return;
    this.accepting = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    await this.options.store.heartbeat(this.instanceId, 'draining');
    await this.activeJob;
    await this.options.store.stop(this.instanceId);
    this.options.log?.info('Worker stopped');
  }
}
