import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const read = (file: string) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('domain invalidations are payload-free and written by transactional table triggers', () => {
  const migration = read('migrations/041_admin_domain_events.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS admin_domain_events/);
  assert.match(migration, /event_type TEXT NOT NULL/);
  assert.match(migration, /entity_id UUID NOT NULL/);
  assert.match(migration, /entity_version INTEGER NOT NULL/);
  assert.doesNotMatch(migration, /payload|patient_name|phone|email|amount/);
  for (const table of [
    'appointments',
    'package_orders',
    'payments',
    'notification_outbox',
    'patient_match_reviews',
  ])
    assert.match(migration, new RegExp(`ON ${table}`));
});

test('SSE is authenticated, permission scoped, resumable, bounded, and payload-free', () => {
  const route = read('src/routes/adminEvents.ts');
  const service = read('src/services/adminEventStream.ts');
  assert.match(route, /authenticate/);
  assert.match(route, /DASHBOARD_READ/);
  assert.match(service, /Last-Event-ID/);
  assert.match(service, /roleHasPermission/);
  assert.match(service, /doctorCanReceive/);
  assert.match(service, /MAX_CONNECTIONS_PER_REPLICA = 1_200/);
  assert.match(service, /res\.writableLength > 64 \* 1024/);
  assert.match(service, /setInterval\(\(\) => void poll\(\), POLL_INTERVAL_MS\)/);
  assert.match(service, /event: domain-event/);
  assert.doesNotMatch(service, /patient_name|phone|email|raw_response|amount/);
});

test('admin client invalidates authoritative APIs with reconnect and visible polling fallback', () => {
  const bridge = fs.readFileSync(
    new URL('../../frontend/src/components/admin/AdminRealtimeBridge.tsx', import.meta.url),
    'utf8'
  );
  const hook = fs.readFileSync(
    new URL('../../frontend/src/lib/adminRealtime.ts', import.meta.url),
    'utf8'
  );
  const layout = fs.readFileSync(
    new URL('../../frontend/src/components/layout/AdminLayout.tsx', import.meta.url),
    'utf8'
  );
  assert.match(bridge, /new EventSource\('\/api\/admin\/events'/);
  assert.match(bridge, /visibilityState === 'visible'/);
  assert.match(bridge, /FALLBACK_JITTER_MS/);
  assert.match(bridge, /Live/);
  assert.match(bridge, /Reconnecting/);
  assert.match(bridge, /Stale - polling/);
  assert.match(hook, /ADMIN_DOMAIN_EVENT/);
  assert.match(hook, /ADMIN_REALTIME_REFRESH/);
  assert.match(layout, /AdminRealtimeBridge/);
});
