import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import {
  assertDigestReference,
  deployState,
  jobState,
  runSmoke,
  validateRenderService,
} from '../scripts/render-deploy.mjs';

const digest = `ghcr.io/sauravm0/website-spandan/spandan-api@sha256:${'a'.repeat(64)}`;

test('only immutable GHCR digest references are deployable', () => {
  assert.equal(assertDigestReference(digest), digest);
  for (const invalid of [
    'ghcr.io/sauravm0/website-spandan/spandan-api:main',
    'docker.io/example/api@sha256:' + 'a'.repeat(64),
    'ghcr.io/Owner/Api@sha256:' + 'a'.repeat(64),
    'ghcr.io/owner/api@sha256:short',
  ]) {
    assert.throws(() => assertDigestReference(invalid), /immutable lowercase GHCR/);
  }
});

test('Render deploy and job states fail closed', () => {
  assert.equal(deployState('live'), 'succeeded');
  assert.equal(deployState('update_failed'), 'failed');
  assert.equal(deployState('canceled'), 'failed');
  assert.equal(deployState('update_in_progress'), 'pending');
  assert.equal(jobState('succeeded'), 'succeeded');
  assert.equal(jobState('failed'), 'failed');
  assert.equal(jobState('running'), 'pending');
});

test('Render service policy requires controlled deployment, migration, and health paths', () => {
  assert.doesNotThrow(() =>
    validateRenderService(
      {
        autoDeploy: false,
        image: { imagePath: 'ghcr.io/sauravm0/website-spandan/spandan-api:bootstrap' },
        serviceDetails: {
          preDeployCommand: 'node dist/migrate.js',
          healthCheckPath: '/api/ready',
          maxShutdownDelaySeconds: 30,
        },
      },
      { kind: 'api', repository: 'ghcr.io/sauravm0/website-spandan/spandan-api' }
    )
  );
  assert.throws(
    () =>
      validateRenderService(
        { autoDeploy: true, serviceDetails: { preDeployCommand: 'node dist/migrate.js' } },
        { kind: 'api', repository: 'ghcr.io/example/api' }
      ),
    /auto-deploy must be disabled/
  );
  assert.throws(
    () =>
      validateRenderService(
        {
          autoDeploy: false,
          image: { imagePath: 'ghcr.io/example/api:bootstrap' },
          serviceDetails: { healthCheckPath: '/api/ready', maxShutdownDelaySeconds: 30 },
        },
        { kind: 'api', repository: 'ghcr.io/example/api' }
      ),
    /pre-deploy command/
  );
});

async function withProbeServer(version, run) {
  const server = http.createServer((request, response) => {
    response.setHeader('cache-control', 'no-store');
    if (request.url === '/api/health' || request.url === '/healthz') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ status: 'ok', version }));
      return;
    }
    if (request.url === '/api/ready') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ status: 'ready', version }));
      return;
    }
    response.setHeader('content-type', 'text/html');
    response.end(
      request.url === '/book-appointment'
        ? '<!doctype html><h1>Book Appointment</h1>'
        : '<!doctype html><h1>Admin Login</h1>'
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

test('release smoke validates version, routes, error rate, and latency', async () => {
  await withProbeServer('release-sha', async (baseUrl) => {
    const result = await runSmoke({
      apiUrl: baseUrl,
      frontendUrl: baseUrl,
      expectedVersion: 'release-sha',
      samples: 2,
      intervalMs: 1,
      maxP95Ms: 5_000,
      maxErrorRate: 0,
    });
    assert.equal(result.requests, 12);
    assert.equal(result.failures, 0);
    assert.equal(result.version, 'release-sha');

    await assert.rejects(
      runSmoke({
        apiUrl: baseUrl,
        frontendUrl: baseUrl,
        expectedVersion: 'wrong-release',
        samples: 1,
        intervalMs: 1,
        maxP95Ms: 5_000,
        maxErrorRate: 0,
      }),
      /error rate/
    );
  });
});
