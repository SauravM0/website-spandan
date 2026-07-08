import fs from 'node:fs';
import path from 'node:path';

const roadmapPath = path.resolve('docs/delivery-roadmap.json');
const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));

const phases = Array.isArray(roadmap.phases) ? roadmap.phases : [];
if (phases.length === 0) {
  console.error('No roadmap phases found.');
  process.exit(1);
}

const counts = phases.reduce((acc, phase) => {
  acc[phase.status] = (acc[phase.status] || 0) + 1;
  return acc;
}, {});

console.log('Spandan delivery roadmap');
console.log('');
for (const phase of phases) {
  const gates = Array.isArray(phase.gates) ? phase.gates.length : 0;
  console.log(`${phase.id}: ${phase.name}`);
  console.log(`  status: ${phase.status}`);
  console.log(`  gates: ${gates}`);
  console.log(`  objective: ${phase.objective}`);
}

console.log('');
console.log(
  `Summary: ${Object.entries(counts)
    .map(([status, count]) => `${status}=${count}`)
    .join(', ')}`
);
