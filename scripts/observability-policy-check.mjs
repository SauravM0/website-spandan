import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const policy = JSON.parse(read('infrastructure/observability-policy.json'));
const index = read('backend/src/index.ts');
const metrics = read('backend/src/observability/metrics.ts');
const operational = read('backend/src/observability/operationalSnapshot.ts');
const telemetry = read('backend/src/routes/telemetry.ts');
const reporter = read('frontend/src/components/telemetry/WebVitalsReporter.tsx');
const adminRoutes = read('backend/src/routes/adminOperations.ts');
const workerRuntime = read('backend/src/worker/runtime.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP13')
  errors.push('Unsupported observability policy.');
if (
  policy.scrape?.path !== '/api/internal/metrics' ||
  policy.scrape?.authentication !== 'bearer-token'
)
  errors.push('Metrics scrape must use the protected internal endpoint.');
if (!index.includes('requestTelemetry') || !index.includes('telemetryRoutes'))
  errors.push('API request telemetry and routes are not mounted.');
for (const required of [
  'p50',
  'p95',
  'p99',
  'auth401',
  'auth403',
  'rateLimited429',
  'residentMemoryBytes',
  'eventLoopLagP95Ms',
]) {
  if (!metrics.includes(required)) errors.push(`Runtime telemetry is missing: ${required}`);
}
for (const required of ['database', 'worker', 'payments', 'notifications', 'bookings']) {
  if (!operational.includes(required)) errors.push(`Operational snapshot is missing: ${required}`);
}
if (
  !telemetry.includes('timingSafeEqual') ||
  !telemetry.includes('METRICS_AUTHENTICATION_REQUIRED')
)
  errors.push('Metrics authentication must fail closed with constant-time comparison.');
if (!reporter.includes('useReportWebVitals') || !reporter.includes("credentials: 'omit'"))
  errors.push('Frontend Web Vitals must be anonymous and omit staff cookies.');
if (
  !adminRoutes.includes("'/observability'") ||
  !adminRoutes.includes('PERMISSIONS.DASHBOARD_READ')
)
  errors.push('The sole administrator needs a permission-protected operational snapshot.');
if (
  !workerRuntime.includes('telemetrySnapshot().process') ||
  !workerRuntime.includes('duration_ms')
)
  errors.push('The non-HTTP worker must emit process health and bounded job timings.');
if (
  (policy.alerts || []).length < 8 ||
  policy.alerts.some(
    (alert) =>
      alert.owner !== 'sole-clinic-admin' ||
      !alert.expression ||
      !Number.isInteger(alert.forSeconds) ||
      alert.forSeconds < 60
  )
)
  errors.push(
    'All required production alerts must be executable and owned by the sole administrator.'
  );
if ((policy.dashboards || []).length < 7)
  errors.push('All operational dashboard groups are required.');
for (const forbidden of ['patient_name', 'provider_payload', 'clinical_text']) {
  if (metrics.toLowerCase().includes(forbidden) || operational.toLowerCase().includes(forbidden))
    errors.push(`Metric implementation contains forbidden sensitive field: ${forbidden}`);
}

if (errors.length) {
  console.error('Observability policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  `Observability policy valid: ${policy.dashboards.length} dashboards and ${policy.alerts.length} owned alerts.`
);
