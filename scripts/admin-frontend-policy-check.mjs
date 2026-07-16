import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/admin-frontend-policy.json'));
const primitives = read('frontend/src/components/admin/AdminPrimitives.tsx');
const dialog = read('frontend/src/components/admin/AdminActionDialog.tsx');
const hooks = read('frontend/src/features/admin/shared/hooks.ts');
const appointments = read('frontend/src/app/admin/(protected)/appointments/page.tsx');
const css = read('frontend/src/styles/globals.css');
const vitals = read('frontend/src/components/telemetry/WebVitalsReporter.tsx');
const errors = [];

function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name === '__tests__') return [];
    return entry.isDirectory() ? collect(target) : /\.tsx?$/.test(entry.name) ? [target] : [];
  });
}
const adminFiles = [
  ...collect('frontend/src/app/admin'),
  ...collect('frontend/src/components/admin'),
  'frontend/src/lib/api.ts',
];
const adminSource = adminFiles.map(read).join('\n');

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP25')
  errors.push('Unsupported admin frontend policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Admin frontend must retain the sole-administrator deployment model.');
if (/window\.(confirm|prompt)\s*\(/.test(adminSource))
  errors.push('Native browser confirmation or prompt remains in an admin workflow.');
for (const required of ['CursorPagination', 'AdminFeedback', 'AdminDrawer', 'FocusTrap'])
  if (!primitives.includes(required))
    errors.push(`Shared admin primitive is missing: ${required}.`);
for (const required of ['role="dialog"', 'aria-modal="true"', "event.key === 'Escape'"])
  if (!dialog.includes(required)) errors.push(`Accessible action dialog is missing ${required}.`);
if (!hooks.includes('AbortController') || !hooks.includes('current.current?.id === state.id'))
  errors.push('Latest-request cancellation and stale-response protection are missing.');
if (!appointments.includes('useSearchParams') || !appointments.includes('router.replace'))
  errors.push('Appointment filters do not survive browser navigation.');
if (!css.includes('prefers-reduced-motion: reduce')) errors.push('Reduced-motion CSS is missing.');
if (!vitals.includes("'LCP'") || !vitals.includes("'INP'"))
  errors.push('LCP or INP telemetry is missing.');
const anyCount = (adminSource.match(/:\s*any\b|as\s+any\b|any\[\]/g) || []).length;
if (anyCount > policy.typing.explicitAnyMaximum)
  errors.push(`Explicit any count ${anyCount} exceeds ${policy.typing.explicitAnyMaximum}.`);

if (errors.length) {
  console.error('Admin frontend policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  `Admin frontend policy valid: accessible primitives, latest requests, URL filters, ${anyCount} explicit any usages.`
);
