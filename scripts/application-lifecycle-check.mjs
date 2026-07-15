import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const policy = JSON.parse(read('infrastructure/application-lifecycle-policy.json'));
const index = read('backend/src/index.ts');
const lifecycle = read('backend/src/lifecycle/applicationLifecycle.ts');
const worker = read('backend/src/worker/runtime.ts');
const database = read('backend/src/config/database.ts');
const deployment = JSON.parse(read('infrastructure/deployment-policy.json'));
const dockerfile = read('backend/Dockerfile');
const test = read('backend/tests/applicationLifecycle.test.ts');
const example = read('backend/.env.example');
const errors = [];

if (policy.schemaVersion !== 1 || policy.platform !== 'render')
  errors.push('Unsupported application lifecycle policy.');
if (policy.applicationShutdownTimeoutMs >= policy.platformShutdownDelayMs)
  errors.push('Application shutdown must finish before the platform deadline.');
if (deployment.services?.api?.maxShutdownDelaySeconds * 1000 !== policy.platformShutdownDelayMs)
  errors.push('Render and application lifecycle shutdown windows disagree.');
if (deployment.services?.api?.healthPath !== policy.probes?.readinessPath)
  errors.push('Render must route health through readiness, not liveness.');
for (const required of [
  'server.close(',
  'server.closeIdleConnections()',
  'server.closeAllConnections()',
  'readiness.beginDrain()',
  'closeDatabase()',
  'Promise.race',
]) {
  if (!lifecycle.includes(required)) errors.push(`Lifecycle coordinator is missing: ${required}`);
}
for (const required of [
  'startApplication',
  'installTerminationHandlers',
  'pool.end()',
  'if (!readiness.isReady)',
  'CachedHealthProbe',
  "app.use('/api', globalLimiter)",
]) {
  if (!index.includes(required)) errors.push(`API lifecycle is missing: ${required}`);
}
if (index.indexOf("app.get('/api/ready'") > index.indexOf("app.use('/api', globalLimiter)"))
  errors.push('Readiness is behind ordinary API rate limiting.');
for (const required of ['async stop()', 'this.accepting = false', 'await this.activeJob']) {
  if (!worker.includes(required)) errors.push(`Worker lifecycle is missing: ${required}`);
}
if (database.includes('process.exit(-1)'))
  errors.push('Idle database errors must not terminate the process directly.');
if (!dockerfile.includes('http://127.0.0.1:4000/api/health'))
  errors.push('Container liveness must remain independent of database readiness.');
if (!test.includes('response.writeHead(201)') || !test.includes("readiness.current, 'draining'"))
  errors.push('Accepted-write drain characterization is missing.');
if (!example.includes('SHUTDOWN_TIMEOUT_MS=25000'))
  errors.push('Environment example is missing the bounded shutdown timeout.');

if (errors.length) {
  console.error('Application lifecycle policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Application lifecycle policy valid: readiness-first drain completes inside Render’s 30-second window.'
);
