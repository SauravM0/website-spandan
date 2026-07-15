import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ClaimedWorkerJob,
  WorkerHealthSnapshot,
  WorkerLeaseStore,
} from '../src/worker/leaseStore';
import { WorkerRuntime } from '../src/worker/runtime';

class FakeLeaseStore implements WorkerLeaseStore {
  claimResult: ClaimedWorkerJob | null = {
    name: 'notification-outbox',
    leaseToken: '00000000-0000-4000-8000-000000000001',
    leaseSeconds: 30,
  };
  claims = 0;
  successes = 0;
  failures = 0;
  stopped = 0;
  async register() {}
  async heartbeat() {}
  async stop() {
    this.stopped += 1;
  }
  async claim() {
    this.claims += 1;
    const result = this.claimResult;
    this.claimResult = null;
    return result;
  }
  async extend() {
    return true;
  }
  async succeed() {
    this.successes += 1;
    return true;
  }
  async fail() {
    this.failures += 1;
    return true;
  }
  async health(): Promise<WorkerHealthSnapshot> {
    return {
      activeWorkers: 1,
      staleWorkers: 0,
      dueJobs: 0,
      deadLetterJobs: 0,
      oldestDueSeconds: 0,
    };
  }
}

test('worker stops polling and drains its accepted leased job before stopping', async () => {
  const store = new FakeLeaseStore();
  let started!: () => void;
  let finish!: () => void;
  const jobStarted = new Promise<void>((resolve) => (started = resolve));
  const jobFinished = new Promise<void>((resolve) => (finish = resolve));
  let effects = 0;
  const runtime = new WorkerRuntime({
    store,
    handlers: {
      'notification-outbox': async () => {
        started();
        await jobFinished;
        effects += 1;
      },
    },
    version: 'test',
    pollIntervalMs: 5,
    heartbeatIntervalMs: 60_000,
    leaseSeconds: 30,
    instanceId: '00000000-0000-4000-8000-000000000010',
  });
  await runtime.start();
  await jobStarted;
  const stopping = runtime.stop();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(store.stopped, 0);
  finish();
  await stopping;
  assert.equal(effects, 1);
  assert.equal(store.successes, 1);
  assert.equal(store.stopped, 1);
  const claimsAfterStop = store.claims;
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(store.claims, claimsAfterStop);
});

test('worker records a bounded job failure instead of succeeding it', async () => {
  const store = new FakeLeaseStore();
  let failed!: () => void;
  const failureRecorded = new Promise<void>((resolve) => (failed = resolve));
  const originalFail = store.fail.bind(store);
  store.fail = async (...args) => {
    const result = await originalFail(...args);
    failed();
    return result;
  };
  const runtime = new WorkerRuntime({
    store,
    handlers: {
      'notification-outbox': async () => {
        throw Object.assign(new Error('provider'), { code: 'PROVIDER_DOWN' });
      },
    },
    version: 'test',
    pollIntervalMs: 50,
    heartbeatIntervalMs: 60_000,
    leaseSeconds: 30,
    instanceId: '00000000-0000-4000-8000-000000000011',
  });
  await runtime.start();
  await failureRecorded;
  await runtime.stop();
  assert.equal(store.failures, 1);
  assert.equal(store.successes, 0);
});

test('API source does not start or import operational worker jobs', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const source = await fs.readFile(path.resolve(__dirname, '../src/index.ts'), 'utf8');
  assert.equal(source.includes('startBackgroundJobs'), false);
  assert.equal(source.includes('./worker'), false);
  assert.equal(source.includes('CHECKPOINT'), false);
});
