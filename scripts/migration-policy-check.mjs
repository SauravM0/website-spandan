import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const policy = JSON.parse(read('infrastructure/migration-policy.json'));
const runner = read('backend/src/migrations/runner.ts');
const validator = read('backend/scripts/validate-migrations.ts');
const cli = read('backend/src/migrate.ts');
const databasePolicy = read('backend/src/config/databasePolicy.ts');
const api = read('backend/src/index.ts');
const dockerfile = read('backend/Dockerfile');
const backendPackage = JSON.parse(read('backend/package.json'));
const errors = [];

if (policy.schemaVersion !== 1) errors.push('Unsupported migration policy schema.');
if (!policy.ledger?.appendOnly) errors.push('Migration ledger must be append-only.');
if (policy.compatibility?.strategy !== 'expand-migrate-contract') {
  errors.push('Expand-migrate-contract compatibility is required.');
}
if (policy.legacyAdoption?.automaticAdoption !== false) {
  errors.push('Legacy migration adoption must require explicit operator intent.');
}
if (policy.execution?.runDuringApiStartup !== false) {
  errors.push('Migrations must never run during API startup.');
}

for (const column of policy.ledger?.requiredColumns || []) {
  if (!runner.includes(column)) errors.push(`Migration ledger is missing ${column}.`);
}
for (const required of [
  'pg_advisory_lock',
  'pg_advisory_unlock',
  'prevent_schema_migrations_mutation',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'checksum has changed',
  'MIGRATION_BASELINE_VERSION=31',
]) {
  if (!runner.includes(required)) errors.push(`Migration runner is missing: ${required}`);
}
for (const required of ['migration-phase', 'expand|migrate|contract', 'compatibility-approved']) {
  if (!validator.includes(required)) errors.push(`Migration validator is missing: ${required}`);
}
if (
  !cli.includes("createDatabaseRuntimePolicy(process.env, 'migration')") ||
  !databasePolicy.includes("service === 'migration'") ||
  !databasePolicy.includes('? 1') ||
  !databasePolicy.includes('spandan-schema-migrator')
) {
  errors.push('One-off migration CLI must use a dedicated single-connection pool.');
}
if (/migrat/i.test(api)) errors.push('API startup must not import or execute migration code.');
if (backendPackage.scripts?.['migrate:production'] !== policy.execution?.productionCommand) {
  errors.push('Production migration command does not match policy.');
}
if (!dockerfile.includes('COPY --chown=express:nodejs migrations ./migrations')) {
  errors.push('API artifact does not contain migration SQL for the one-off job.');
}
if (!dockerfile.includes('CMD ["node", "dist/index.js"]')) {
  errors.push('API container default command must remain API-only.');
}

if (errors.length) {
  console.error('Migration policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Migration policy valid: append-only ledger, advisory lock ${policy.locking.key}, one-off execution.`
);
