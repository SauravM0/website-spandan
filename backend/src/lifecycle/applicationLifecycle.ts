import type { Server } from 'node:http';

export type ApplicationPhase = 'starting' | 'ready' | 'draining' | 'stopped';

export class ReadinessState {
  private phase: ApplicationPhase = 'starting';

  get current(): ApplicationPhase {
    return this.phase;
  }

  get isReady(): boolean {
    return this.phase === 'ready';
  }

  markReady(): void {
    if (this.phase === 'starting') this.phase = 'ready';
  }

  beginDrain(): void {
    if (this.phase !== 'stopped') this.phase = 'draining';
  }

  markStopped(): void {
    this.phase = 'stopped';
  }
}

export class CachedHealthProbe {
  private checkedAt = 0;
  private healthy = false;
  private pending: Promise<boolean> | undefined;

  constructor(
    private readonly check: () => Promise<void>,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now
  ) {}

  run(): Promise<boolean> {
    if (this.checkedAt && this.now() - this.checkedAt < this.ttlMs) {
      return Promise.resolve(this.healthy);
    }
    if (this.pending) return this.pending;
    this.pending = this.check()
      .then(() => true)
      .catch(() => false)
      .then((healthy) => {
        this.healthy = healthy;
        this.checkedAt = this.now();
        return healthy;
      })
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }
}

export type BackgroundLifecycle = {
  stopAccepting(): Promise<void>;
  drain(): Promise<void>;
};

export type ApplicationLifecycleOptions = {
  server: Server;
  readiness: ReadinessState;
  background: BackgroundLifecycle;
  closeDatabase(): Promise<void>;
  timeoutMs: number;
  log?: {
    info(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };
};

export type ApplicationLifecycle = {
  shutdown(reason: string): Promise<void>;
};

function closeHttpServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeIdleConnections();
  });
}

export function createApplicationLifecycle(
  options: ApplicationLifecycleOptions
): ApplicationLifecycle {
  let shutdownPromise: Promise<void> | undefined;

  return {
    shutdown(reason: string): Promise<void> {
      if (shutdownPromise) return shutdownPromise;
      shutdownPromise = (async () => {
        const startedAt = Date.now();
        options.readiness.beginDrain();
        options.log?.info('Application drain started', { reason });

        let timeout: NodeJS.Timeout | undefined;
        const deadline = new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error(`Graceful shutdown exceeded ${options.timeoutMs}ms.`)),
            options.timeoutMs
          );
          timeout.unref();
        });

        try {
          await options.background.stopAccepting();
          const drain = Promise.all([
            closeHttpServer(options.server),
            options.background.drain(),
          ]).then(() => options.closeDatabase());
          await Promise.race([drain, deadline]);
          options.log?.info('Application drain completed', {
            reason,
            duration_ms: Date.now() - startedAt,
          });
        } catch (error) {
          options.server.closeAllConnections();
          options.log?.error('Application drain failed', {
            reason,
            duration_ms: Date.now() - startedAt,
            error_code: 'GRACEFUL_SHUTDOWN_FAILED',
          });
          throw error;
        } finally {
          if (timeout) clearTimeout(timeout);
          options.readiness.markStopped();
        }
      })();
      return shutdownPromise;
    },
  };
}

export function installTerminationHandlers(
  lifecycle: ApplicationLifecycle,
  processTarget: Pick<NodeJS.Process, 'once' | 'off'> & {
    exitCode?: string | number;
  } = process
): () => void {
  const handle = (signal: NodeJS.Signals) => {
    void lifecycle.shutdown(signal).catch(() => {
      processTarget.exitCode = 1;
    });
  };
  processTarget.once('SIGTERM', handle);
  processTarget.once('SIGINT', handle);
  return () => {
    processTarget.off('SIGTERM', handle);
    processTarget.off('SIGINT', handle);
  };
}
