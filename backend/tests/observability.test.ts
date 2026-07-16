import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';
import {
  normalizeMetricRoute,
  observeBookingConfirmation,
  observeBookingHold,
  observeHttp,
  observeWebVital,
  resetTelemetryForTests,
  telemetrySnapshot,
} from '../src/observability/metrics';
import { parseWebVital, validMetricsAuthorization } from '../src/routes/telemetry';
import { renderPrometheus } from '../src/observability/operationalSnapshot';
import { requestTelemetry } from '../src/middleware/requestTelemetry';
import { requestId } from '../src/middleware/requestId';

test('HTTP telemetry is bounded, route-template based, and records auth/error classes', () => {
  resetTelemetryForTests();
  const route = normalizeMetricRoute('GET', '/api/admin/patients', '/:id');
  assert.equal(route, 'GET /api/admin/patients/:id');
  assert.equal(normalizeMetricRoute('GET', '', '/patients/real-patient-id?phone=1'), 'unmatched');
  observeHttp({ method: 'GET', route, status: 403, durationMs: 80 });
  observeHttp({ method: 'POST', route: 'POST /api/bookings', status: 500, durationMs: 120 });
  observeHttp({
    method: 'POST',
    route: 'POST /api/appointments/holds',
    status: 409,
    durationMs: 90,
  });
  observeBookingHold();
  observeBookingConfirmation();
  const snapshot = telemetrySnapshot();
  assert.equal(snapshot.http.totalRequests, 3);
  assert.equal(snapshot.http.auth403, 1);
  assert.equal(snapshot.http.response5xx, 1);
  assert.equal(snapshot.http.latencyMs.p95, 120);
  assert.deepEqual(snapshot.bookings, {
    holds: 1,
    confirmations: 1,
    conflicts: 1,
    conversionRatio: 1,
  });
});

test('request middleware records the Express route template instead of the real identifier', async () => {
  resetTelemetryForTests();
  const app = express();
  const router = express.Router();
  app.use(requestId, requestTelemetry);
  router.get('/:id', (_req, res) => res.json({ ok: true }));
  app.use('/api/test', router);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Test server address unavailable.');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/test/private-patient-id`, {
      headers: { 'x-request-id': '919999999999' },
    });
    assert.notEqual(response.headers.get('x-request-id'), '919999999999');
    assert.match(response.headers.get('x-request-id') || '', /^[a-f0-9-]{36}$/i);
    const routes = telemetrySnapshot().http.series.map((series) => series.route);
    assert.deepEqual(routes, ['GET /api/test/:id']);
    assert.doesNotMatch(routes.join(' '), /private-patient-id/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test('Web Vitals accept only allowlisted aggregate fields', () => {
  resetTelemetryForTests();
  const valid = parseWebVital({
    name: 'LCP',
    value: 2100,
    rating: 'good',
    routeGroup: 'booking-appointment',
  });
  assert.ok(valid);
  observeWebVital(valid);
  assert.deepEqual(telemetrySnapshot().webVitals, [
    { name: 'LCP', routeGroup: 'booking-appointment', sampleCount: 1, p75: 2100 },
  ]);
  assert.equal(parseWebVital({ ...valid, routeGroup: '/patients/private-id' }), null);
  assert.equal(parseWebVital({ ...valid, name: 'patient_name' }), null);
  assert.equal(parseWebVital({ ...valid, value: Number.NaN }), null);
});

test('metrics authentication accepts only the configured bearer secret', () => {
  assert.equal(validMetricsAuthorization('a'.repeat(48), `Bearer ${'a'.repeat(48)}`), true);
  assert.equal(validMetricsAuthorization('a'.repeat(48), `Bearer ${'b'.repeat(48)}`), false);
  assert.equal(validMetricsAuthorization('a'.repeat(48), ''), false);
  assert.equal(validMetricsAuthorization('', `Bearer ${'a'.repeat(48)}`), false);
});

test('Prometheus output contains operational aggregates without sensitive payload fields', () => {
  const output = renderPrometheus({
    ...telemetrySnapshot(),
    database: {
      acquisitionSampleCount: 1,
      acquisitionP95Ms: 10,
      querySampleCount: 1,
      queryP95Ms: 20,
      queryErrorCount: 0,
      totalConnections: 2,
      idleConnections: 1,
      waitingRequests: 0,
    },
    worker: {
      activeWorkers: 1,
      staleWorkers: 0,
      dueJobs: 0,
      deadLetterJobs: 0,
      oldestDueSeconds: 0,
    },
    payments: { pending: 1, failed: 0, oldestPendingSeconds: 30 },
    notifications: { queued: 0, deadLetters: 0, oldestQueuedSeconds: 0 },
    bookings: {
      holds: 2,
      confirmations: 1,
      conflicts: 0,
      conversionRatio: 0.5,
      openScheduleConflicts: 0,
    },
  });
  assert.match(output, /spandan_http_latency_p95_ms/);
  assert.match(output, /spandan_worker_active 1/);
  for (const forbidden of [
    'patient_name',
    'phone',
    'clinical_text',
    'provider_payload',
    'payment_id',
  ]) {
    assert.doesNotMatch(output, new RegExp(forbidden, 'i'));
  }
});
