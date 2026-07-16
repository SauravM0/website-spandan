import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const policyPath = path.resolve('infrastructure/resilience-release-policy.json');

function requireTrue(value, label, errors) {
  if (value !== true) errors.push(`${label} must be true.`);
}

export function validateResilienceEvidence(evidence, policy) {
  const errors = [];
  if (evidence?.schemaVersion !== 1) errors.push('Unsupported evidence schema.');
  if (!/^[a-f0-9]{40}$/.test(evidence?.releaseSha || '')) {
    errors.push('releaseSha must be a full lowercase commit SHA.');
  }
  if (!evidence?.completedAt || Number.isNaN(Date.parse(evidence.completedAt))) {
    errors.push('completedAt must be an ISO timestamp.');
  }

  const restore = evidence?.restore || {};
  if (restore.targetEnvironment !== policy.recovery.restoreTarget || restore.productionTargetUsed) {
    errors.push('Restore must run only in the isolated non-production target.');
  }
  requireTrue(restore.pitrEnabled, 'restore.pitrEnabled', errors);
  requireTrue(restore.databaseBackupVerified, 'restore.databaseBackupVerified', errors);
  if (!['not-applicable', 'verified'].includes(restore.objectStorage)) {
    errors.push('restore.objectStorage must be not-applicable or verified.');
  }
  if (!(restore.rtoSeconds > 0 && restore.rtoSeconds <= policy.recovery.rtoSeconds)) {
    errors.push(`Restore RTO must be at most ${policy.recovery.rtoSeconds} seconds.`);
  }
  if (!(restore.rpoSeconds >= 0 && restore.rpoSeconds <= policy.recovery.rpoSeconds)) {
    errors.push(`Restore RPO must be at most ${policy.recovery.rpoSeconds} seconds.`);
  }
  for (const field of ['rowTotals', 'payments', 'appointments', 'auditChain', 'queues']) {
    requireTrue(restore.reconciliation?.[field], `restore.reconciliation.${field}`, errors);
  }

  const resilience = evidence?.resilience || {};
  if (resilience.soakDurationSeconds < policy.resilience.soakDurationSeconds) {
    errors.push(`Soak duration must be at least ${policy.resilience.soakDurationSeconds} seconds.`);
  }
  if (resilience.peakMultiplier < policy.resilience.peakMultiplier) {
    errors.push(`Peak load must be at least ${policy.resilience.peakMultiplier}x forecast.`);
  }
  if (!(resilience.errorRate >= 0 && resilience.errorRate < policy.resilience.maximumErrorRate)) {
    errors.push(`Error rate must be below ${policy.resilience.maximumErrorRate}.`);
  }
  requireTrue(resilience.stableMemory, 'resilience.stableMemory', errors);
  requireTrue(resilience.stablePool, 'resilience.stablePool', errors);
  for (const field of [
    'databaseLatency',
    'workerDeath',
    'providerOutage',
    'deploymentTermination',
  ]) {
    requireTrue(
      resilience.failureScenarios?.[field],
      `resilience.failureScenarios.${field}`,
      errors
    );
  }

  const pilot = evidence?.pilot || {};
  requireTrue(pilot.staffPilotCompleted, 'pilot.staffPilotCompleted', errors);
  if (pilot.unresolvedP0 !== 0 || pilot.unresolvedP1 !== 0) {
    errors.push('Staff pilot must have zero unresolved P0/P1 issues.');
  }
  requireTrue(
    pilot.publicRolloutStoppedAndRestoredTested,
    'pilot.publicRolloutStoppedAndRestoredTested',
    errors
  );

  if (evidence?.phonePe?.enabled && !evidence.phonePe.separatePilotCompleted) {
    errors.push('PhonePe cannot be enabled before its separate finance/provider pilot.');
  }
  if (!Array.isArray(evidence?.evidenceReferences) || evidence.evidenceReferences.length < 4) {
    errors.push('At least four non-PHI evidence references are required.');
  }
  return errors;
}

export function verifyEvidenceFile(file) {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const evidence = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const errors = validateResilienceEvidence(evidence, policy);
  if (errors.length) throw new Error(errors.join('\n'));
  return evidence;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/resilience-evidence.mjs <completed-evidence.json>');
    process.exit(2);
  }
  try {
    const evidence = verifyEvidenceFile(file);
    console.log(`WP26 evidence valid for ${evidence.releaseSha}.`);
  } catch (error) {
    console.error(`WP26 evidence rejected:\n${error.message}`);
    process.exit(1);
  }
}
