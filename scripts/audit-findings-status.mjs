import fs from 'node:fs';
import path from 'node:path';

const auditPath = path.resolve('docs/audit-findings.json');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const findings = Array.isArray(audit.findings) ? audit.findings : [];
const errors = [];

if (findings.length === 0) {
  errors.push('No audit findings found.');
}

const counts = {};
const p0Open = [];

for (const finding of findings) {
  for (const field of ['id', 'severity', 'status', 'owner', 'title', 'next']) {
    if (!finding[field]) errors.push(`${finding.id || 'unknown'} missing ${field}`);
  }

  const key = `${finding.severity}:${finding.status}`;
  counts[key] = (counts[key] || 0) + 1;

  if (finding.severity === 'P0' && !['mitigated'].includes(finding.status)) {
    p0Open.push(finding);
  }
}

console.log('Spandan audit findings');
console.log('');
for (const finding of findings) {
  console.log(`${finding.id} [${finding.severity}] ${finding.status} - ${finding.title}`);
  console.log(`  owner: ${finding.owner}`);
  console.log(`  next: ${finding.next}`);
}

console.log('');
console.log(
  `Summary: ${Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key}=${count}`)
    .join(', ')}`
);
console.log(`Open P0 requiring release-owner review: ${p0Open.length}`);

if (errors.length > 0) {
  console.error('');
  console.error('Audit register validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
