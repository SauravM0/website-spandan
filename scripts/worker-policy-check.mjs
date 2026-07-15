import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const policy = JSON.parse(read('infrastructure/worker-policy.json'));
const api = read('backend/src/index.ts');
const runtime = read('backend/src/worker/runtime.ts');
const main = read('backend/src/worker/main.ts');
const leases = read('backend/src/worker/leaseStore.ts');
const jobs = read('backend/src/worker/jobs.ts');
const migration = read('backend/migrations/032_dedicated_worker_runtime.sql');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP12')
  errors.push('Unsupported worker policy.');
if (policy.apiRunsOperationalJobs || /startBackgroundJobs|worker\/main|worker\/jobs/.test(api))
  errors.push('API replicas must not start or import operational worker jobs.');
if (!runtime.includes('accepting = false') || !runtime.includes('await this.activeJob'))
  errors.push('Worker shutdown must stop claims and drain its active job.');
if (!main.includes('heartbeatIntervalMs > 5_000') || !main.includes('leaseSeconds < 15'))
  errors.push('Worker heartbeat and lease configuration must preserve the recovery SLO.');
for (const required of ['FOR UPDATE SKIP LOCKED', 'lease_token', 'dead_lettered_at', 'heartbeat']) {
  if (!leases.includes(required) && !migration.includes(required))
    errors.push(`Worker leases are missing: ${required}`);
}
if (/\bCHECKPOINT\b/i.test(jobs) || /\bCHECKPOINT\b/i.test(runtime))
  errors.push('Application-managed PostgreSQL CHECKPOINT is forbidden.');
if (!migration.includes('-- migration-phase: expand'))
  errors.push('Worker migration must remain expand-compatible.');
if (!read('backend/src/routes/adminOperations.ts').includes("'/worker-health'"))
  errors.push('Worker heartbeat and queue health must be visible to the administrator.');

if (errors.length) {
  console.error('Worker policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Worker policy valid: dedicated runtime, leased claims, graceful failover, and dead letters.'
);
