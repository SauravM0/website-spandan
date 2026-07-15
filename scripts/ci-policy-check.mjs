import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const policy = JSON.parse(read('infrastructure/ci-policy.json'));
const workflow = read(policy.workflow);
const containerWorkflow = read('.github/workflows/container-security.yml');
const errors = [];

if (policy.schemaVersion !== 1) errors.push('Unsupported CI policy schema.');
if (!policy.branchProtection?.required || policy.branchProtection?.allowBypass) {
  errors.push('Branch protection must be mandatory and bypass-free.');
}
if (policy.credentials?.productionCredentialsAllowed !== false) {
  errors.push('Production credentials must be forbidden in CI.');
}

const workflows = [workflow, containerWorkflow];
for (const content of workflows) {
  for (const line of content.split(/\r?\n/).filter((entry) => /\buses:/.test(entry))) {
    if (!/@[0-9a-f]{40}(?:\s|$)/.test(line)) {
      errors.push(`Workflow action is not commit-pinned: ${line.trim()}`);
    }
  }
}

const requiredWorkflowText = [
  'name: Quality',
  'name: Unit and component contracts',
  'name: PostgreSQL migrations and integration',
  'name: Security and dependency policy',
  'name: Dependency and license review',
  'name: CodeQL SAST',
  'name: Critical E2E and API contracts',
  'name: Deliberate gate rejection tests',
  'npm run format:check',
  'npm run lint',
  'npm run backend:typecheck',
  'npm run frontend:typecheck',
  'npm run migrations:validate',
  'npm run migrations:check',
  'npm run database:check',
  'npm --prefix backend run migrate:production',
  'Verify repeat migration is a no-op',
  'npm --prefix backend run test:integration',
  'npm --prefix frontend run test:e2e',
  'actions/dependency-review-action@',
  'github/codeql-action/analyze@',
  'npm --prefix backend audit --audit-level=high',
  'npm --prefix frontend audit --audit-level=high',
  'image: postgres:16-alpine',
];
for (const required of requiredWorkflowText) {
  if (!workflow.includes(required)) errors.push(`Pull-request workflow is missing: ${required}`);
}

const negativeFixtures = {
  type: '__ci_type_failure__.ts',
  migration: '032_ci_missing_phase.sql',
  secret: 'ci-secret-fixture.txt',
  rbac: 'deny-by-default RBAC regression',
  e2e: '__ci_failure__.spec.ts',
};
for (const gate of policy.negativeGateTests || []) {
  if (!workflow.includes(negativeFixtures[gate])) {
    errors.push(`CI does not prove rejection of a broken ${gate} gate.`);
  }
}

for (const forbidden of [
  'SUPABASE_PRODUCTION',
  'PRODUCTION_DATABASE_URL',
  'PHONEPE_CLIENT_SECRET: ${{ secrets.',
]) {
  if (workflow.includes(forbidden))
    errors.push(`CI references forbidden production credential material: ${forbidden}`);
}
if (
  !workflow.includes("DATA_POLICY: 'synthetic-only'") &&
  !read('frontend/playwright.config.ts').includes("DATA_POLICY: 'synthetic-only'")
) {
  errors.push('Critical E2E runtime must explicitly enforce synthetic-only data.');
}

if (errors.length) {
  console.error('CI policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `CI policy valid: ${policy.requiredChecks.length} required checks and ${policy.negativeGateTests.length} deliberate rejection tests.`
);
