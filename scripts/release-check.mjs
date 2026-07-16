import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'cmd.exe' : 'npm';

const steps = [
  ['platform:check', ['run', 'platform:check']],
  ['privacy-security:check', ['run', 'privacy-security:check']],
  ['baseline:check', ['run', 'baseline:check']],
  ['environments:check', ['run', 'environments:check']],
  ['frontend-runtime:check', ['run', 'frontend-runtime:check']],
  ['secrets:check', ['run', 'secrets:check']],
  ['containers:check', ['run', 'containers:check']],
  ['ci:check', ['run', 'ci:check']],
  ['migrations:check', ['run', 'migrations:check']],
  ['deployments:check', ['run', 'deployments:check']],
  ['deployments:test', ['run', 'deployments:test']],
  ['database:check', ['run', 'database:check']],
  ['lifecycle:check', ['run', 'lifecycle:check']],
  ['worker:check', ['run', 'worker:check']],
  ['observability:check', ['run', 'observability:check']],
  ['auth:check', ['run', 'auth:check']],
  ['clinical-auth:check', ['run', 'clinical-auth:check']],
  ['public-payments:check', ['run', 'public-payments:check']],
  ['authoritative-payments:check', ['run', 'authoritative-payments:check']],
  ['appointment-transitions:check', ['run', 'appointment-transitions:check']],
  ['appointment-rescheduling:check', ['run', 'appointment-rescheduling:check']],
  ['patient-identity:check', ['run', 'patient-identity:check']],
  ['admin-workflow:check', ['run', 'admin-workflow:check']],
  ['admin-realtime:check', ['run', 'admin-realtime:check']],
  ['admin-performance:check', ['run', 'admin-performance:check']],
  ['package-orders:check', ['run', 'package-orders:check']],
  ['migrations:validate', ['run', 'migrations:validate']],
  ['backend:typecheck', ['run', 'backend:typecheck']],
  ['backend:test', ['run', 'backend:test']],
  ['backend:build', ['run', 'backend:build']],
  ['frontend:test', ['run', 'frontend:test']],
  ['frontend:build', ['run', 'frontend:build']],
];

const includeAudit =
  process.env.RUN_SECURITY_AUDIT === '1' ||
  process.env.npm_lifecycle_event === 'release:check:full';

if (includeAudit) {
  steps.push(['audit', ['run', 'audit']]);
}

function runStep(label, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`);
    const commandArgs = isWindows ? ['/d', '/s', '/c', 'npm.cmd', ...args] : args;
    const child = spawn(npm, commandArgs, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

for (const [label, args] of steps) {
  await runStep(label, args);
}

console.log('\nRelease check passed.');
if (!includeAudit) {
  console.log('Security audit skipped. Set RUN_SECURITY_AUDIT=1 for the full production gate.');
}
