import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/resilience-release-policy.json'));
const security = read('backend/src/config/security.ts');
const config = read('backend/src/config/index.ts');
const operations = read('backend/src/routes/operations.ts');
const diagnostics = read('backend/src/routes/diagnosticTests.ts');
const middleware = read('backend/src/middleware/publicRelease.ts');
const runbook = read('docs/work-packages/WP26-resilience-controlled-release.md');
const validator = read('scripts/resilience-evidence.mjs');
const ci = read('.github/workflows/ci.yml');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP26')
  errors.push('Invalid WP26 policy.');
if (
  !policy.recovery.pitrRequired ||
  policy.recovery.rtoSeconds > 7200 ||
  policy.recovery.rpoSeconds > 900
) {
  errors.push('Recovery policy must require PITR with RTO <=2h and RPO <=15m.');
}
if (
  policy.resilience.soakDurationSeconds < 3600 ||
  policy.resilience.peakMultiplier < 2 ||
  policy.resilience.maximumErrorRate > 0.005
) {
  errors.push('Resilience targets do not meet the release acceptance gate.');
}
for (const token of ['PUBLIC_COMMERCE_MODE', 'PHONEPE_PILOT_APPROVED', 'staff_pilot']) {
  if (!security.includes(token) || !config.includes(token))
    errors.push(`Configuration omits ${token}.`);
}
for (const source of [operations, diagnostics]) {
  if (!source.includes('requirePublicCommerceAccess'))
    errors.push('A public write route lacks rollout gating.');
}
for (const token of ['timingSafeEqual', "'disabled'", "'staff_pilot'", "'public'"]) {
  if (!middleware.includes(token)) errors.push(`Public rollout middleware omits ${token}.`);
}
for (const token of [
  'isolated',
  'PITR',
  '60-minute',
  'twice forecast peak',
  'PHONEPE_ENABLED=false',
]) {
  if (!runbook.includes(token)) errors.push(`WP26 runbook omits ${token}.`);
}
for (const token of ['validateResilienceEvidence', 'productionTargetUsed', 'unresolvedP0']) {
  if (!validator.includes(token)) errors.push(`Evidence validator omits ${token}.`);
}
for (const token of ['npm run resilience:check', 'npm run resilience:test']) {
  if (!ci.includes(token)) errors.push(`CI omits ${token}.`);
}

if (errors.length) {
  console.error('Resilience/release policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'WP26 policy valid: isolated restore, resilience gates, staff pilot, and safe rollout.'
);
