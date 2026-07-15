import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import {
  CachedHealthProbe,
  createApplicationLifecycle,
  ReadinessState,
} from '../src/lifecycle/applicationLifecycle';
import { BackgroundJobRuntime } from '../src/services/background';

const listen = (server: http.Server): Promise<number> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected TCP address.');
      resolve(address.port);
    });
  });

test('shutdown fails readiness before draining an accepted write and closes the database last', async () => {
  let acceptWrite!: () => void;
  let finishWrite!: () => void;
  const accepted = new Promise<void>((resolve) => (acceptWrite = resolve));
  const finish = new Promise<void>((resolve) => (finishWrite = resolve));
  const order: string[] = [];
  const server = http.createServer(async (_request, response) => {
    order.push('write-accepted');
    acceptWrite();
    await finish;
    order.push('write-committed');
    response.setHeader('connection', 'close');
    response.writeHead(201).end('accepted');
  });
  const port = await listen(server);
  const readiness = new ReadinessState();
  readiness.markReady();
  const lifecycle = createApplicationLifecycle({
    server,
    readiness,
    timeoutMs: 1_000,
    background: {
      stopAccepting: async () => void order.push('jobs-stopped'),
      drain: async () => void order.push('jobs-drained'),
    },
    closeDatabase: async () => void order.push('database-closed'),
  });

  const response = new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
    const request = http.request(
      { host: '127.0.0.1', port, method: 'POST', path: '/booking' },
      (result) => {
        let body = '';
        result.setEncoding('utf8');
        result.on('data', (chunk) => (body += chunk));
        result.on('end', () => resolve({ status: result.statusCode, body }));
      }
    );
    request.on('error', reject);
    request.end();
  });

  await accepted;
  const firstShutdown = lifecycle.shutdown('SIGTERM');
  const secondShutdown = lifecycle.shutdown('SIGTERM');
  assert.equal(firstShutdown, secondShutdown);
  assert.equal(readiness.isReady, false);
  assert.equal(readiness.current, 'draining');
  finishWrite();

  assert.deepEqual(await response, { status: 201, body: 'accepted' });
  await firstShutdown;
  assert.equal(readiness.current, 'stopped');
  assert.ok(order.indexOf('write-committed') < order.indexOf('database-closed'));
  assert.ok(order.indexOf('jobs-drained') < order.indexOf('database-closed'));
});

test('shutdown deadline force-closes stuck HTTP connections and fails closed', async () => {
  let requestStarted!: () => void;
  const started = new Promise<void>((resolve) => (requestStarted = resolve));
  const server = http.createServer(() => requestStarted());
  const port = await listen(server);
  const readiness = new ReadinessState();
  readiness.markReady();
  const lifecycle = createApplicationLifecycle({
    server,
    readiness,
    timeoutMs: 25,
    background: { stopAccepting: async () => {}, drain: async () => new Promise(() => {}) },
    closeDatabase: async () => {},
  });
  const requestClosed = new Promise<void>((resolve) => {
    const request = http.get({ host: '127.0.0.1', port, path: '/stuck' });
    request.on('error', () => resolve());
  });
  await started;
  await assert.rejects(lifecycle.shutdown('SIGTERM'), /exceeded 25ms/);
  await requestClosed;
  assert.equal(readiness.current, 'stopped');
});

test('background runtime stops scheduling new work and drains the active job', async () => {
  const callbacks: Array<() => void | Promise<void>> = [];
  let stopCount = 0;
  const failures: string[] = [];
  const runtime = new BackgroundJobRuntime(
    (_expression, callback) => {
      callbacks.push(callback);
      return { stop: async () => void (stopCount += 1) };
    },
    (name) => failures.push(name)
  );
  let started!: () => void;
  let finish!: () => void;
  const jobStarted = new Promise<void>((resolve) => (started = resolve));
  const jobFinished = new Promise<void>((resolve) => (finish = resolve));
  let executions = 0;
  runtime.register('* * * * *', 'test-job', async () => {
    executions += 1;
    started();
    await jobFinished;
  });

  void callbacks[0]();
  await jobStarted;
  assert.equal(runtime.activeCount, 1);
  await runtime.stopAccepting();
  assert.equal(runtime.accepting, false);
  assert.equal(stopCount, 1);
  await callbacks[0]();
  assert.equal(executions, 1);
  const drain = runtime.drain();
  finish();
  await drain;
  assert.equal(runtime.activeCount, 0);
  assert.deepEqual(failures, []);
});

test('concurrent readiness checks share one cached database probe', async () => {
  let now = 1_000;
  let checks = 0;
  const probe = new CachedHealthProbe(
    async () => {
      checks += 1;
      await new Promise((resolve) => setImmediate(resolve));
    },
    1_000,
    () => now
  );
  assert.deepEqual(
    await Promise.all(Array.from({ length: 50 }, () => probe.run())),
    Array(50).fill(true)
  );
  assert.equal(checks, 1);
  assert.equal(await probe.run(), true);
  assert.equal(checks, 1);
  now += 1_001;
  assert.equal(await probe.run(), true);
  assert.equal(checks, 2);
});

test('source keeps probes outside rate limiting and pool errors non-fatal', async () => {
  const fs = await import('node:fs/promises');
  const index = await fs.readFile(path.resolve(__dirname, '../src/index.ts'), 'utf8');
  const database = await fs.readFile(path.resolve(__dirname, '../src/config/database.ts'), 'utf8');
  assert.ok(
    index.indexOf("app.get('/api/ready'") < index.indexOf("app.use('/api', globalLimiter)")
  );
  assert.ok(index.includes('if (!readiness.isReady)'));
  assert.equal(database.includes('process.exit(-1)'), false);
});
