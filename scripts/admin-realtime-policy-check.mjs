import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const policy = JSON.parse(read('infrastructure/admin-realtime-policy.json'));
const migration = read('backend/migrations/041_admin_domain_events.sql');
const service = read('backend/src/services/adminEventStream.ts');
const route = read('backend/src/routes/adminEvents.ts');
const bridge = read('frontend/src/components/admin/AdminRealtimeBridge.tsx');
const errors = [];

if (policy.schemaVersion !== 1 || policy.workPackage !== 'WP23')
  errors.push('Unsupported admin realtime policy.');
if (policy.deploymentModel !== 'sole-administrator')
  errors.push('Realtime workflow must retain the sole-administrator deployment model.');
if (policy.containsSensitivePayload !== false || policy.eventFields?.length !== 5)
  errors.push('Realtime events must use the five-field payload-free contract.');
if (policy.capacity?.idleConnectionsPerReplica < 1000)
  errors.push('Event stream capacity must cover 1000 idle connections.');
if (policy.capacity?.databasePollersPerReplica !== 1)
  errors.push('Event streaming must share one database poller per replica.');
for (const type of policy.events || []) {
  if (!migration.includes(type) || !service.includes(type))
    errors.push(`Realtime event type is not implemented end to end: ${type}.`);
}
for (const required of ['Last-Event-ID', 'roleHasPermission', 'doctorCanReceive', '1_200']) {
  if (!service.includes(required)) errors.push(`Event stream is missing ${required}.`);
}
if (!route.includes('authenticate') || !route.includes('DASHBOARD_READ'))
  errors.push('Event stream route is not authenticated and capability protected.');
if (!bridge.includes("new EventSource('/api/admin/events'") || !bridge.includes('visibilityState'))
  errors.push('Browser SSE or visibility-aware fallback is missing.');

if (errors.length) {
  console.error('Admin realtime policy check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  'Admin realtime policy valid: transactional events, scoped SSE, resume, and safe polling.'
);
