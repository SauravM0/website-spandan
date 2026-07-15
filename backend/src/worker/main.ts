import { config } from '../config';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { createWorkerJobHandlers } from './jobs';
import { PostgresWorkerLeaseStore } from './leaseStore';
import { WorkerRuntime } from './runtime';

const positiveInteger = (name: string, fallback: number): number => {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive integer.`);
  return value;
};

export async function workerMain(): Promise<void> {
  const heartbeatIntervalMs = positiveInteger('WORKER_HEARTBEAT_INTERVAL_MS', 5_000);
  const leaseSeconds = positiveInteger('WORKER_LEASE_SECONDS', 30);
  if (heartbeatIntervalMs > 5_000) {
    throw new Error('WORKER_HEARTBEAT_INTERVAL_MS must be at most 5000.');
  }
  if (leaseSeconds < 15) {
    throw new Error('WORKER_LEASE_SECONDS must be at least 15.');
  }
  const runtime = new WorkerRuntime({
    store: new PostgresWorkerLeaseStore(),
    handlers: createWorkerJobHandlers(),
    version: process.env.APP_VERSION || 'development',
    pollIntervalMs: positiveInteger('WORKER_POLL_INTERVAL_MS', 1_000),
    heartbeatIntervalMs,
    leaseSeconds,
    log: logger,
  });
  await runtime.start();

  let stopping: Promise<void> | undefined;
  const stop = (signal: NodeJS.Signals) => {
    if (stopping) return;
    logger.info('Worker drain started', { signal });
    stopping = (async () => {
      let timeout: NodeJS.Timeout | undefined;
      try {
        const deadline = new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error(`Worker shutdown exceeded ${config.shutdownTimeoutMs}ms.`)),
            config.shutdownTimeoutMs
          );
          timeout.unref();
        });
        await Promise.race([runtime.stop(), deadline]);
        await pool.end();
      } catch {
        process.exitCode = 1;
        logger.error('Worker drain failed', { error_code: 'WORKER_SHUTDOWN_FAILED' });
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    })();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}
