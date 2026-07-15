import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const policy = JSON.parse(read('infrastructure/deployment-policy.json'));
const deployWorkflow = read('.github/workflows/deploy.yml');
const rollbackWorkflow = read('.github/workflows/rollback.yml');
const orchestrator = read('scripts/render-deploy.mjs');
const backendDockerfile = read('backend/Dockerfile');
const frontendDockerfile = read('frontend/Dockerfile');
const backend = read('backend/src/index.ts');
const frontendHealth = read('frontend/src/app/healthz/route.ts');
const errors = [];

if (policy.schemaVersion !== 1 || policy.provider !== 'render') {
  errors.push('Deployment policy must use the supported Render schema.');
}
if (!policy.artifacts?.sameDigestInStagingAndProduction) {
  errors.push('Staging and production must use identical image digests.');
}
if (!policy.artifacts?.signatureVerificationRequired) {
  errors.push('Artifact signature verification is required before deployment.');
}
if (policy.promotion?.autoDeployAllowed || policy.promotion?.overlappingReleaseAllowed) {
  errors.push('Render auto-deploy and overlapping releases must remain disabled.');
}
if (
  policy.services?.worker?.status !== 'blocked' ||
  policy.services?.worker?.workPackage !== 'WP12'
) {
  errors.push('Worker deployment must remain blocked until WP12.');
}
if (policy.rollback?.databaseReversalAllowed || !policy.rollback?.acceptedWritesPreserved) {
  errors.push('Rollback must preserve database writes and forbid schema reversal.');
}

for (const workflow of [deployWorkflow, rollbackWorkflow]) {
  for (const line of workflow.split(/\r?\n/).filter((entry) => /\buses:/.test(entry))) {
    if (!/@[0-9a-f]{40}(?:\s|$)/.test(line)) {
      errors.push(`Deployment action is not commit-pinned: ${line.trim()}`);
    }
  }
}

for (const required of [
  'workflow_run:',
  "github.event.workflow_run.event == 'push'",
  'github.event.workflow_run.head_repository.full_name == github.repository',
  'environment: staging',
  'environment: production',
  'cosign verify',
  'needs: [prepare, staging]',
  'node scripts/render-deploy.mjs verify-service',
  'node scripts/render-deploy.mjs deploy',
  'node scripts/render-deploy.mjs smoke',
  'if: failure()',
  'concurrency:',
]) {
  if (!deployWorkflow.includes(required))
    errors.push(`Deployment workflow is missing: ${required}`);
}
for (const required of [
  'confirmation',
  'environment: production',
  'node scripts/render-deploy.mjs rollback',
  'frontend',
  'api',
  'node scripts/render-deploy.mjs smoke',
]) {
  if (!rollbackWorkflow.includes(required))
    errors.push(`Rollback workflow is missing: ${required}`);
}
for (const required of [
  'imageUrl: image',
  '/rollback',
  'previousDeployId',
  'Render auto-deploy must be disabled',
  'pre-deploy command must be node dist/migrate.js',
]) {
  if (!orchestrator.includes(required)) errors.push(`Render orchestrator is missing: ${required}`);
}
if (!backendDockerfile.includes('APP_VERSION=${OCI_REVISION}'))
  errors.push('API image does not expose its immutable version.');
if (!frontendDockerfile.includes('APP_VERSION=${OCI_REVISION}'))
  errors.push('Frontend image does not expose its immutable version.');
if (!backend.includes("version: process.env.APP_VERSION || 'development'"))
  errors.push('API health does not expose its version.');
if (!frontendHealth.includes("version: process.env.APP_VERSION || 'development'"))
  errors.push('Frontend health does not expose its version.');

if (errors.length) {
  console.error('Deployment policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  'Deployment policy valid: signed digest promotion, protected production, write-safe rollback.'
);
