import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/admin-workflow-policy.json'));
const service = read('backend/src/services/adminWorkflow.ts');
const routes = read('backend/src/routes/adminOperations.ts');
const controller = read('backend/src/controllers/operationsController.ts');
const dashboard = read('frontend/src/app/admin/(protected)/page.tsx');
const layout = read('frontend/src/components/layout/AdminLayout.tsx');
const search = read('frontend/src/components/admin/AdminGlobalSearch.tsx');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP22')
  errors.push('Unsupported admin workflow policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Admin workflow must retain the sole-administrator model.');
if (policy.taskSources?.length !== 6) errors.push('Needs-action sources are incomplete.');
for (const required of [
  'roleHasPermission',
  'getNeedsActionQueue',
  'searchAdminWorkflow',
  'getWorkItemDetail',
  'tasks.slice(0, 50)',
  'results.slice(0, 20)',
])
  if (!service.includes(required)) errors.push(`Admin workflow service is missing ${required}.`);
for (const route of [
  "'/workflow/search'",
  "'/workflow/needs-action'",
  "'/workflow/items/:type/:id'",
])
  if (!routes.includes(route)) errors.push(`Admin workflow route is missing ${route}.`);
if (!controller.includes('needsAction') || !controller.includes('identityReviews'))
  errors.push('Today dashboard does not include workflow tasks and identity reviews.');
if (!dashboard.includes('Unified Work Item') || !dashboard.includes('admin_recent_work_ids'))
  errors.push('Unified detail or ID-only recent history is missing.');
if (!layout.includes('AdminGlobalSearch') || !search.includes('searchAdminWorkflow'))
  errors.push('Permission-aware global search is not mounted.');

if (errors.length) {
  console.error('Admin workflow policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Admin workflow policy valid: task queue, scoped search, unified detail, and ID-only history.'
);
