import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const policy = JSON.parse(read('infrastructure/database-connectivity-policy.json'));
const databasePolicy = read('backend/src/config/databasePolicy.ts');
const database = read('backend/src/config/database.ts');
const migration = read('backend/src/migrate.ts');
const example = read('backend/.env.example');
const integrationTest = read('backend/tests/databasePool.integration.test.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.runtime?.provider !== 'supabase')
  errors.push('Database connectivity policy must use the supported Supabase schema.');
if (policy.runtime?.mode !== 'transaction' || policy.runtime?.port !== 6543)
  errors.push('Runtime traffic must use a port-6543 transaction pooler.');
if (!policy.runtime?.tlsVerificationRequired || policy.runtime?.preparedStatementsAllowed)
  errors.push('Verified TLS is required and prepared statements must remain disabled.');
if (policy.budget?.targetPercent < 70 || policy.budget?.targetPercent > 80)
  errors.push('Connection target must remain between 70 and 80 percent.');
const planned =
  policy.runtime.defaultMaximumPoolSizePerReplica *
    (policy.budget.maximumApiReplicas + policy.budget.rollingSurgeReplicas) +
  policy.budget.workerReserve +
  policy.budget.migrationReserve +
  policy.budget.administrationReserve;
const target = Math.floor(policy.budget.connectionQuota * (policy.budget.targetPercent / 100));
if (planned > target) errors.push(`Default connection plan ${planned} exceeds target ${target}.`);
for (const required of [
  'port !== 6543',
  'rejectUnauthorized: true',
  'DB_IDLE_TRANSACTION_TIMEOUT_MS',
  'DB_STATEMENT_TIMEOUT_MS',
  'DB_ROLLING_SURGE_REPLICAS',
  'DB_REGION_RTT_P95_MS',
  "service === 'migration' ? 1",
]) {
  if (!databasePolicy.includes(required)) errors.push(`Database policy is missing: ${required}`);
}
for (const required of [
  'safeQueryIdentity',
  'databasePoolSnapshot',
  'Named prepared statements are disabled',
]) {
  if (!database.includes(required)) errors.push(`Database runtime is missing: ${required}`);
}
if (!migration.includes("createDatabaseRuntimePolicy(process.env, 'migration')"))
  errors.push('Migration job does not use its direct single-connection policy.');
for (const required of [
  'MIGRATION_DATABASE_URL=',
  'DB_POOL_MAX=10',
  'DB_CONNECTION_TARGET_PERCENT=75',
  'DB_REGION_RTT_P95_MS=',
]) {
  if (!example.includes(required)) errors.push(`Environment example is missing: ${required}`);
}
if (!integrationTest.includes('forecastPeakConcurrency * 2') || !integrationTest.includes('< 100'))
  errors.push('Integration test must prove the twice-peak, sub-100ms pool acquisition target.');
if (errors.length) {
  console.error('Database connectivity policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  `Database connectivity policy valid: ${planned}/${policy.budget.connectionQuota} planned connections, ${target} target.`
);
