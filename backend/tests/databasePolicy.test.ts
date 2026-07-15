import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDatabaseBudget, createDatabaseRuntimePolicy } from '../src/config/databasePolicy';
import {
  databasePoolSnapshot,
  recordDatabaseTiming,
  resetDatabaseTimingForTests,
  safeQueryIdentity,
  setDatabaseTimingObserver,
} from '../src/config/databaseTelemetry';

const hostedEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  DEPLOYMENT_ENV: 'staging',
  SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
  DATABASE_URL:
    'postgresql://postgres.abcdefghijklmnopqrst:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  MIGRATION_DATABASE_URL:
    'postgresql://postgres:secret@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
  APPLICATION_REGION: 'render-singapore',
  SUPABASE_REGION: 'ap-south-1',
  DB_REGION_RTT_TARGET_MS: '100',
  DB_REGION_RTT_P95_MS: '42',
  DB_CONNECTION_QUOTA: '60',
  DB_MAX_API_REPLICAS: '2',
});

test('hosted API uses the transaction pooler with verified TLS and bounded sessions', () => {
  const policy = createDatabaseRuntimePolicy(hostedEnvironment(), 'api');
  assert.equal(policy.port, 6543);
  assert.equal(policy.poolConfig.max, 10);
  assert.equal(policy.poolConfig.min, 0);
  assert.equal(policy.poolConfig.statement_timeout, 10_000);
  assert.equal(policy.poolConfig.idle_in_transaction_session_timeout, 15_000);
  assert.deepEqual(policy.poolConfig.ssl, { rejectUnauthorized: true });
});

test('hosted migration uses one verified direct connection', () => {
  const policy = createDatabaseRuntimePolicy(hostedEnvironment(), 'migration');
  assert.equal(policy.host, 'db.abcdefghijklmnopqrst.supabase.co');
  assert.equal(policy.port, 5432);
  assert.equal(policy.poolConfig.max, 1);
  assert.deepEqual(policy.poolConfig.ssl, { rejectUnauthorized: true });
});

test('hosted runtime rejects session/direct endpoints and URL TLS overrides', () => {
  const sessionMode = hostedEnvironment();
  sessionMode.DATABASE_URL = sessionMode.DATABASE_URL?.replace(':6543/', ':5432/');
  assert.throws(
    () => createDatabaseRuntimePolicy(sessionMode, 'api'),
    /transaction pooler on port 6543/
  );
  const tlsOverride = hostedEnvironment();
  tlsOverride.DATABASE_URL += '?sslmode=no-verify';
  assert.throws(() => createDatabaseRuntimePolicy(tlsOverride, 'api'), /must not contain sslmode/);
});

test('hosted startup rejects missing direct migration URL and stale region evidence', () => {
  const missingMigration = hostedEnvironment();
  delete missingMigration.MIGRATION_DATABASE_URL;
  assert.throws(
    () => createDatabaseRuntimePolicy(missingMigration, 'migration'),
    /direct db\.<project>\.supabase\.co:5432|separate MIGRATION_DATABASE_URL/
  );
  const slowRegion = hostedEnvironment();
  slowRegion.DB_REGION_RTT_P95_MS = '101';
  assert.throws(() => createDatabaseRuntimePolicy(slowRegion, 'api'), /exceeds the 100ms target/);

  const implicitQuota = hostedEnvironment();
  delete implicitQuota.DB_CONNECTION_QUOTA;
  assert.throws(
    () => createDatabaseRuntimePolicy(implicitQuota, 'api'),
    /requires explicit DB_CONNECTION_QUOTA/
  );
});

test('connection budget includes rolling surge and operational reserves', () => {
  const budget = calculateDatabaseBudget({});
  assert.equal(budget.plannedConnections, 41);
  assert.equal(budget.targetConnections, 45);
  assert.throws(
    () => calculateDatabaseBudget({ DB_MAX_API_REPLICAS: '3' }),
    /requires 51 connections.*permits 45/
  );
  assert.throws(
    () => calculateDatabaseBudget({ DB_CONNECTION_TARGET_PERCENT: '85' }),
    /between 70 and 80/
  );
});

test('database telemetry records fingerprints and timings without SQL or parameters', () => {
  resetDatabaseTimingForTests();
  const events: unknown[] = [];
  setDatabaseTimingObserver((event) => events.push(event));
  const identity = safeQueryIdentity('SELECT * FROM patients WHERE phone = $1');
  assert.equal(identity.operation, 'SELECT');
  assert.equal(identity.fingerprint.length, 16);
  assert.equal(JSON.stringify(identity).includes('patients'), false);
  assert.equal(JSON.stringify(identity).includes('phone'), false);
  for (const durationMs of [1, 2, 3, 4, 80]) {
    recordDatabaseTiming({
      kind: 'acquire',
      service: 'api',
      durationMs,
      outcome: 'success',
      totalConnections: 2,
      idleConnections: 1,
      waitingRequests: 0,
    });
  }
  const snapshot = databasePoolSnapshot({ totalCount: 2, idleCount: 1, waitingCount: 0 });
  assert.equal(snapshot.acquisitionP95Ms, 80);
  assert.equal(events.length, 5);
  assert.equal(JSON.stringify(events).includes('SELECT'), false);
  setDatabaseTimingObserver();
});
