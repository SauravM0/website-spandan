import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/package-order-lifecycle-policy.json'));
const migration = read('backend/migrations/038_package_order_lifecycle.sql');
const service = read('backend/src/services/operations.ts');
const routes = read('backend/src/routes/adminOperations.ts');
const controller = read('backend/src/controllers/operationsController.ts');
const frontend = read('frontend/src/app/admin/(protected)/package-orders/page.tsx');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP20')
  errors.push('Unsupported package-order lifecycle policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Deployment must retain the approved sole-administrator model.');
if (policy.states?.length !== 12) errors.push('The package-order state model is incomplete.');
for (const required of [
  'package_order_events',
  'package_order_price_confirmations',
  'package_order_events_immutable',
  'package_order_action_queue',
])
  if (!migration.includes(required)) errors.push(`Lifecycle migration is missing ${required}.`);
for (const required of [
  'FOR UPDATE',
  'PACKAGE_ORDER_VERSION_CONFLICT',
  'PACKAGE_ORDER_REFUND_EVIDENCE_REQUIRED',
  'package_order.transitioned',
  'package_order.price_confirmed',
  'package_order.assigned',
])
  if (!service.includes(required)) errors.push(`Lifecycle service is missing ${required}.`);
for (const route of [
  "'/package-orders/:id'",
  "'/package-orders/:id/transitions'",
  "'/package-orders/:id/assign'",
  "'/package-orders/:id/price-confirmation'",
])
  if (!routes.includes(route)) errors.push(`Admin route is missing ${route}.`);
if (!controller.includes('IDEMPOTENCY_KEY_REQUIRED'))
  errors.push('Package-order mutations do not require idempotency.');
if (!frontend.includes('allowed_actions') || !frontend.includes('timeline'))
  errors.push('Admin package-order workflow is incomplete.');

if (errors.length) {
  console.error('Package-order lifecycle policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Package-order lifecycle policy valid: versioned workflow, immutable audit, and action queue.'
);
