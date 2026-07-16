import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { validateResilienceEvidence } from '../scripts/resilience-evidence.mjs';

const policy = JSON.parse(fs.readFileSync('infrastructure/resilience-release-policy.json', 'utf8'));
const valid = () => ({
  schemaVersion: 1,
  releaseSha: 'a'.repeat(40),
  completedAt: '2026-07-16T10:00:00.000Z',
  restore: {
    targetEnvironment: 'isolated-nonproduction-project',
    productionTargetUsed: false,
    pitrEnabled: true,
    databaseBackupVerified: true,
    objectStorage: 'not-applicable',
    rtoSeconds: 3600,
    rpoSeconds: 600,
    reconciliation: {
      rowTotals: true,
      payments: true,
      appointments: true,
      auditChain: true,
      queues: true,
    },
  },
  resilience: {
    soakDurationSeconds: 3600,
    peakMultiplier: 2,
    errorRate: 0.004,
    stableMemory: true,
    stablePool: true,
    failureScenarios: {
      databaseLatency: true,
      workerDeath: true,
      providerOutage: true,
      deploymentTermination: true,
    },
  },
  pilot: {
    staffPilotCompleted: true,
    unresolvedP0: 0,
    unresolvedP1: 0,
    publicRolloutStoppedAndRestoredTested: true,
  },
  phonePe: { enabled: false, separatePilotCompleted: false },
  evidenceReferences: ['restore-log', 'reconciliation-log', 'soak-report', 'pilot-report'],
});

test('complete non-PHI WP26 evidence passes every release target', () => {
  assert.deepEqual(validateResilienceEvidence(valid(), policy), []);
});

test('unsafe restore, weak load, unresolved incidents, and unpiloted PhonePe fail closed', () => {
  const evidence = valid();
  evidence.restore.productionTargetUsed = true;
  evidence.restore.rtoSeconds = 7201;
  evidence.resilience.errorRate = 0.005;
  evidence.pilot.unresolvedP1 = 1;
  evidence.phonePe.enabled = true;
  const errors = validateResilienceEvidence(evidence, policy).join('\n');
  assert.match(errors, /isolated non-production/);
  assert.match(errors, /RTO/);
  assert.match(errors, /Error rate/);
  assert.match(errors, /zero unresolved P0\/P1/);
  assert.match(errors, /PhonePe/);
});
