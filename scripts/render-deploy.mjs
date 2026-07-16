import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RENDER_API_BASE = 'https://api.render.com/v1';

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function assertDigestReference(image) {
  if (!/^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(image || '')) {
    throw new Error('Image must be an immutable lowercase GHCR sha256 digest reference.');
  }
  return image;
}

export function deployState(status) {
  if (status === 'live') return 'succeeded';
  if (/failed|canceled|cancelled|deactivated/i.test(status || '')) return 'failed';
  return 'pending';
}

export function jobState(status) {
  if (status === 'succeeded') return 'succeeded';
  if (['failed', 'canceled', 'cancelled'].includes(status || '')) return 'failed';
  return 'pending';
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const values = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    if (!key?.startsWith('--') || rest[index + 1] === undefined) {
      throw new Error(`Invalid argument near ${key || '<end>'}.`);
    }
    values[key.slice(2)] = rest[index + 1];
  }
  return { command, values };
}

function required(values, name) {
  const value = values[name]?.trim();
  if (!value) throw new Error(`--${name} is required.`);
  return value;
}

function positiveNumber(values, name, fallback) {
  const value = values[name] === undefined ? fallback : Number(values[name]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} must be positive.`);
  return value;
}

function boundedRate(values, name, fallback) {
  const value = values[name] === undefined ? fallback : Number(values[name]);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`--${name} must be between 0 and 1.`);
  }
  return value;
}

function positiveInteger(values, name, fallback) {
  const value = positiveNumber(values, name, fallback);
  if (!Number.isInteger(value)) throw new Error(`--${name} must be an integer.`);
  return value;
}

async function renderRequest(path, options = {}) {
  const token = process.env.RENDER_API_KEY?.trim();
  if (!token) throw new Error('RENDER_API_KEY is required.');

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(`${RENDER_API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return response.status === 204 ? {} : response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) ? retryAfter * 1_000 : attempt * 2_000);
      continue;
    }
    throw new Error(
      `Render API ${options.method || 'GET'} ${path} failed with ${response.status}.`
    );
  }
  throw new Error('Render API retry budget exhausted.');
}

function unwrapList(body, key) {
  const values = Array.isArray(body) ? body : body?.[key] || [];
  return values.map((value) => value[key.slice(0, -1)] || value);
}

function resourceId(body, key) {
  return body?.id || body?.[key]?.id;
}

async function waitForDeploy(serviceId, deployId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const body = await renderRequest(
      `/services/${encodeURIComponent(serviceId)}/deploys/${encodeURIComponent(deployId)}`
    );
    const deploy = body.deploy || body;
    const state = deployState(deploy.status);
    process.stderr.write(`Render deploy ${deployId}: ${deploy.status}\n`);
    if (state === 'succeeded') return deploy;
    if (state === 'failed') throw new Error(`Render deploy ${deployId} ended as ${deploy.status}.`);
    await sleep(10_000);
  }
  throw new Error(`Render deploy ${deployId} exceeded its timeout.`);
}

async function currentLiveDeploy(serviceId) {
  const body = await renderRequest(`/services/${encodeURIComponent(serviceId)}/deploys?limit=20`);
  return unwrapList(body, 'deploys').find((deploy) => deploy.status === 'live') || null;
}

export function validateRenderService(service, { kind, repository }) {
  const details = service.serviceDetails || service;
  if (![false, 'no'].includes(service.autoDeploy)) {
    throw new Error('Render auto-deploy must be disabled; releases are pipeline-controlled.');
  }
  const imagePath = service.image?.imagePath || details.imagePath || details.image?.imagePath || '';
  if (!imagePath) throw new Error('Render service must be backed by a prebuilt registry image.');
  if (!imagePath.startsWith(repository)) {
    throw new Error(`Render service image repository does not match ${repository}.`);
  }
  if (kind === 'api') {
    if (details.preDeployCommand !== 'node dist/migrate.js') {
      throw new Error('API service pre-deploy command must be node dist/migrate.js.');
    }
    if (details.healthCheckPath !== '/api/ready' && service.healthCheckPath !== '/api/ready') {
      throw new Error('API service health check path must be /api/ready.');
    }
    const shutdownDelay = details.maxShutdownDelaySeconds ?? service.maxShutdownDelaySeconds;
    if (shutdownDelay !== 30) {
      throw new Error('API service maximum shutdown delay must be 30 seconds.');
    }
  } else if (kind === 'frontend') {
    if (details.healthCheckPath !== '/healthz' && service.healthCheckPath !== '/healthz') {
      throw new Error('Frontend service health check path must be /healthz.');
    }
  } else if (kind === 'worker') {
    const command = details.dockerCommand || details.startCommand || service.dockerCommand;
    if (command !== 'node dist/worker.js') {
      throw new Error('Worker service command must be node dist/worker.js.');
    }
    if (details.preDeployCommand || service.preDeployCommand) {
      throw new Error('Worker service must not run database migrations.');
    }
    const shutdownDelay = details.maxShutdownDelaySeconds ?? service.maxShutdownDelaySeconds;
    if (shutdownDelay !== 30) {
      throw new Error('Worker service maximum shutdown delay must be 30 seconds.');
    }
  } else {
    throw new Error('Service kind must be api, worker, or frontend.');
  }
}

async function verifyService(values) {
  const serviceId = required(values, 'service-id');
  const kind = required(values, 'kind');
  const repository = required(values, 'repository');
  const body = await renderRequest(`/services/${encodeURIComponent(serviceId)}`);
  validateRenderService(body.service || body, { kind, repository });
  return { serviceId, kind, verified: true };
}

async function deploy(values) {
  const serviceId = required(values, 'service-id');
  const image = assertDigestReference(required(values, 'image'));
  const timeoutMs = positiveNumber(values, 'timeout-ms', 20 * 60 * 1_000);
  const previous = await currentLiveDeploy(serviceId);
  const body = await renderRequest(`/services/${encodeURIComponent(serviceId)}/deploys`, {
    method: 'POST',
    body: JSON.stringify({ imageUrl: image }),
  });
  const deployId = resourceId(body, 'deploy');
  if (!deployId)
    throw new Error('Render did not return a deploy ID; overlapping queued deploys are forbidden.');
  const completed = await waitForDeploy(serviceId, deployId, timeoutMs);
  return {
    serviceId,
    image,
    deployId,
    previousDeployId: previous?.id || null,
    status: completed.status,
  };
}

async function rollback(values) {
  const serviceId = required(values, 'service-id');
  const targetDeployId = required(values, 'deploy-id');
  const timeoutMs = positiveNumber(values, 'timeout-ms', 20 * 60 * 1_000);
  const body = await renderRequest(`/services/${encodeURIComponent(serviceId)}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ deployId: targetDeployId }),
  });
  const rollbackDeployId = resourceId(body, 'deploy');
  if (!rollbackDeployId) throw new Error('Render did not return the rollback deploy ID.');
  const completed = await waitForDeploy(serviceId, rollbackDeployId, timeoutMs);
  return { serviceId, targetDeployId, rollbackDeployId, status: completed.status };
}

function percentile(values, percentileValue) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil((percentileValue / 100) * ordered.length) - 1)] || 0;
}

async function probe(url, expectedVersion, expectJson = true, expectedText = '') {
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'spandan-release-probe/1.0' },
      signal: AbortSignal.timeout(15_000),
    });
    const durationMs = performance.now() - startedAt;
    if (!response.ok) return { ok: false, durationMs, status: response.status };
    if (expectJson) {
      const body = await response.json();
      if (body.status !== 'ok' && body.status !== 'ready')
        return { ok: false, durationMs, status: response.status };
      if (expectedVersion && body.version !== expectedVersion) {
        return { ok: false, durationMs, status: response.status };
      }
    } else {
      const body = await response.text();
      if (expectedText && !body.includes(expectedText)) {
        return { ok: false, durationMs, status: response.status };
      }
    }
    return { ok: true, durationMs, status: response.status };
  } catch {
    return { ok: false, durationMs: performance.now() - startedAt, status: 0 };
  }
}

export async function runSmoke({
  apiUrl,
  frontendUrl,
  expectedVersion,
  samples,
  intervalMs,
  maxP95Ms,
  maxErrorRate,
}) {
  const targets = [
    { url: new URL('/api/health', apiUrl).toString(), json: true, text: '' },
    { url: new URL('/api/ready', apiUrl).toString(), json: true, text: '' },
    { url: new URL('/healthz', frontendUrl).toString(), json: true, text: '' },
    { url: new URL('/api/health', frontendUrl).toString(), json: true, text: '' },
    {
      url: new URL('/book-appointment', frontendUrl).toString(),
      json: false,
      text: 'Book Appointment',
    },
    {
      url: new URL('/admin/login', frontendUrl).toString(),
      json: false,
      text: 'Admin Login',
    },
  ];
  const results = [];
  for (let sample = 0; sample < samples; sample += 1) {
    results.push(
      ...(await Promise.all(
        targets.map((target) => probe(target.url, expectedVersion, target.json, target.text))
      ))
    );
    if (sample + 1 < samples) await sleep(intervalMs);
  }
  const failures = results.filter((result) => !result.ok).length;
  const errorRate = failures / results.length;
  const p95Ms = percentile(
    results.map((result) => result.durationMs),
    95
  );
  if (errorRate > maxErrorRate)
    throw new Error(`Smoke error rate ${errorRate.toFixed(4)} exceeds ${maxErrorRate}.`);
  if (p95Ms > maxP95Ms) throw new Error(`Smoke p95 ${Math.round(p95Ms)}ms exceeds ${maxP95Ms}ms.`);
  return {
    requests: results.length,
    failures,
    errorRate,
    p95Ms: Math.round(p95Ms),
    version: expectedVersion,
  };
}

export async function runMetricsSmoke({ apiUrl, token, expectedVersion }) {
  if (!token) throw new Error('METRICS_BEARER_TOKEN is required.');
  const response = await fetch(new URL('/api/internal/metrics', apiUrl), {
    headers: { authorization: `Bearer ${token}`, 'user-agent': 'spandan-release-probe/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Metrics smoke failed with status ${response.status}.`);
  const body = await response.text();
  for (const requiredMetric of [
    'spandan_build_info',
    'spandan_http_latency_p95_ms',
    'spandan_database_pool_total',
    'spandan_worker_active',
    'spandan_payment_oldest_pending_seconds',
    'spandan_notification_oldest_queued_seconds',
  ]) {
    if (!body.includes(requiredMetric))
      throw new Error(`Metrics smoke is missing ${requiredMetric}.`);
  }
  if (!body.includes(`version="${expectedVersion}"`))
    throw new Error('Metrics scrape does not expose the expected immutable version.');
  if (/patient_name|phone|email|clinical_text|provider_payload|payment_id/i.test(body))
    throw new Error('Metrics scrape contains a forbidden sensitive field.');
  return { status: 'ok', version: expectedVersion, metricLines: body.trim().split(/\r?\n/).length };
}

async function smoke(values) {
  return runSmoke({
    apiUrl: required(values, 'api-url'),
    frontendUrl: required(values, 'frontend-url'),
    expectedVersion: required(values, 'expected-version'),
    samples: positiveInteger(values, 'samples', 1),
    intervalMs: positiveNumber(values, 'interval-ms', 1_000),
    maxP95Ms: positiveNumber(values, 'max-p95-ms', 2_500),
    maxErrorRate: boundedRate(values, 'max-error-rate', 0),
  });
}

async function metricsSmoke(values) {
  return runMetricsSmoke({
    apiUrl: required(values, 'api-url'),
    token: process.env.METRICS_BEARER_TOKEN || '',
    expectedVersion: required(values, 'expected-version'),
  });
}

export async function main(argv = process.argv.slice(2)) {
  const { command, values } = parseArgs(argv);
  let result;
  if (command === 'verify-service') result = await verifyService(values);
  else if (command === 'deploy') result = await deploy(values);
  else if (command === 'rollback') result = await rollback(values);
  else if (command === 'smoke') result = await smoke(values);
  else if (command === 'metrics-smoke') result = await metricsSmoke(values);
  else
    throw new Error('Command must be verify-service, deploy, rollback, smoke, or metrics-smoke.');
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error((error instanceof Error ? error : new Error(String(error))).message);
    process.exitCode = 1;
  });
}
