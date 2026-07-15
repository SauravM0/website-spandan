import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const policy = JSON.parse(read('infrastructure/container-policy.json'));
const workflow = read('.github/workflows/container-security.yml');
const errors = [];

if (policy.schemaVersion !== 1) errors.push('Unsupported container policy schema.');
if (!policy.supplyChain?.deployByDigestOnly) errors.push('Deployment must be digest-only.');
if (policy.workerArtifact?.status !== 'blocked' || policy.workerArtifact?.workPackage !== 'WP12') {
  errors.push('The absent worker artifact must remain explicitly blocked on WP12.');
}
if (policy.vulnerabilityPolicy?.exceptions?.length) errors.push('No vulnerability exception is approved in WP06.');

for (const artifact of policy.artifacts || []) {
  const dockerfile = read(artifact.dockerfile);
  const base = policy.baseImages?.node22Alpine;
  if (!base?.includes('@sha256:') || !dockerfile.includes(`ARG NODE_IMAGE=${base}`)) {
    errors.push(`${artifact.name} does not use the approved digest-pinned base image.`);
  }
  if (!dockerfile.includes(`USER ${artifact.runtimeUser}`)) errors.push(`${artifact.name} does not run as its non-root user.`);
  if (!dockerfile.includes('HEALTHCHECK')) errors.push(`${artifact.name} has no image health check.`);
  if (!dockerfile.includes('org.opencontainers.image.revision')) errors.push(`${artifact.name} is missing OCI traceability labels.`);
  if (/COPY\s+\.env|COPY\s+\.\s+\.\s*$/m.test(dockerfile) && !fs.existsSync(path.join(root, artifact.context, '.dockerignore'))) {
    errors.push(`${artifact.name} build context is not protected by .dockerignore.`);
  }
}

const backend = read('backend/Dockerfile');
if (!/npm ci --omit=dev/.test(backend)) errors.push('API runtime dependencies are not production-only.');
if (!/COPY --from=production-dependencies/.test(backend)) errors.push('API runtime does not copy the pruned dependency layer.');
const frontend = read('frontend/Dockerfile');
if (!frontend.includes('/app/.next/standalone')) errors.push('Frontend runtime is not using standalone output.');

const actionLines = workflow.split(/\r?\n/).filter((line) => line.trim().startsWith('uses:') || line.trim().startsWith('- uses:'));
for (const line of actionLines) {
  if (!/@[0-9a-f]{40}(?:\s|$)/.test(line)) errors.push(`Workflow action is not commit-pinned: ${line.trim()}`);
}
for (const required of ['sbom: true', 'provenance: mode=max', 'cosign sign --yes', 'severity: HIGH,CRITICAL', "exit-code: '1'", 'Rebuild independently and compare image identity']) {
  if (!workflow.includes(required)) errors.push(`Container workflow is missing: ${required}`);
}

if (errors.length) {
  console.error('Container policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Container policy valid: ${policy.artifacts.length} buildable artifacts; worker blocked on ${policy.workerArtifact.workPackage}.`);
