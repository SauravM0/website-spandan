import fs from 'node:fs';

const path = new URL('../docs/platform-foundation/governance.json', import.meta.url);
const governance = JSON.parse(fs.readFileSync(path, 'utf8'));
const errors = [];
const validStatuses = new Set(['active', 'restricted', 'disabled']);

if (governance.schemaVersion !== 1) errors.push('Unsupported governance schemaVersion.');
if (governance.timezone !== 'Asia/Kolkata') errors.push('Platform timezone must be Asia/Kolkata.');
if (governance.accountModel?.mode !== 'single-administrator') errors.push('Production account model must remain single-administrator until a reviewed change approves additional staff accounts.');
if (governance.accountModel?.productionAccountCount !== 1) errors.push('Single-administrator mode requires exactly one production account.');
if (!Array.isArray(governance.capabilities) || governance.capabilities.length === 0) errors.push('Capability map is empty.');

const names = new Set();
for (const capability of governance.capabilities || []) {
  if (!capability.name || names.has(capability.name)) errors.push(`Missing or duplicate capability: ${capability.name || '<empty>'}.`);
  names.add(capability.name);
  if (!capability.sourceOfTruth) errors.push(`${capability.name}: sourceOfTruth is required.`);
  if (!validStatuses.has(capability.status)) errors.push(`${capability.name}: invalid status.`);
  if (capability.status === 'active' && !capability.owner) errors.push(`${capability.name}: active capability requires an owner.`);
}

const clinical = governance.capabilities?.find((item) => item.name === 'clinical-record');
if (!clinical || (governance.productionClinicalDataEnabled === false && clinical.status !== 'disabled')) {
  errors.push('Clinical-record capability must remain disabled while productionClinicalDataEnabled is false.');
}

if (process.argv.includes('--production')) {
  for (const [role, owner] of Object.entries(governance.owners || {})) {
    if (!owner) errors.push(`Production owner is unassigned: ${role}.`);
  }
  const nextGate = governance.phaseGates?.[`phase${Number(governance.phase) + 1}`];
  if (!nextGate?.approved || !Array.isArray(nextGate.evidence) || nextGate.evidence.length === 0) {
    errors.push(`Phase ${Number(governance.phase) + 1} is not approved with evidence.`);
  }
  for (const [review, gate] of Object.entries(governance.externalReviewGates || {})) {
    if (gate.required && (!gate.approved || !gate.approver || !Array.isArray(gate.evidence) || gate.evidence.length === 0)) {
      errors.push(`Required external review is not approved with evidence: ${review}.`);
    }
  }
}

if (errors.length) {
  console.error('Platform governance check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Platform governance structure valid: ${governance.capabilities.length} capabilities, phase ${governance.phase}.`);
