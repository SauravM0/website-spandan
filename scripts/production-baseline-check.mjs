import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'docs/production-baseline.json'), 'utf8'));
const errors = [];

if (baseline.schemaVersion !== 1) errors.push('Unsupported production baseline schema.');
if (!/^[0-9a-f]{40}$/.test(baseline.baselineCommit || '')) errors.push('Baseline commit must be a full Git SHA.');
if (!baseline.baselineTag) errors.push('Baseline tag is required.');
if (baseline.architecture !== 'modular-monolith') errors.push('Baseline architecture must remain modular-monolith.');
if (baseline.runtime?.timezone !== 'Asia/Kolkata') errors.push('Baseline timezone must be Asia/Kolkata.');

const migrations = fs.readdirSync(path.join(root, 'backend/migrations')).filter((file) => file.endsWith('.sql')).sort();
if (migrations.length !== baseline.schema?.migrationCount) errors.push(`Migration count drift: expected ${baseline.schema?.migrationCount}, found ${migrations.length}.`);
if (migrations.at(-1) !== baseline.schema?.migrationHead) errors.push(`Migration head drift: expected ${baseline.schema?.migrationHead}, found ${migrations.at(-1)}.`);

for (const file of baseline.evidence || []) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing baseline evidence: ${file}.`);
}

const envExample = fs.readFileSync(path.join(root, 'backend/.env.example'), 'utf8');
for (const [name, expected] of Object.entries(baseline.intentionalFeatureGates || {})) {
  if (!envExample.includes(`${name}=${expected}`)) errors.push(`Feature gate drift in backend/.env.example: ${name} must default to ${expected}.`);
}

for (const [group, routes] of Object.entries(baseline.apiContracts || {})) {
  if (!Array.isArray(routes) || routes.length === 0) errors.push(`API contract group is empty: ${group}.`);
}

if (errors.length) {
  console.error('Production baseline check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Production baseline valid: ${baseline.baselineTag}, ${migrations.length} migrations, ${Object.keys(baseline.apiContracts).length} API groups.`);
