import assert from 'node:assert/strict';
import test from 'node:test';

const connectionString = process.env.TEST_DATABASE_URL;
const databaseTest = connectionString ? test : test.skip;

databaseTest('pool acquisition p95 stays below 100ms at twice forecast peak', async () => {
  process.env.DATABASE_URL = connectionString;
  process.env.DEPLOYMENT_ENV = 'test';
  process.env.NODE_ENV = 'test';
  process.env.DB_POOL_MAX = '10';
  const { getDatabasePoolSnapshot, pool, query } = await import('../src/config/database');
  const forecastPeakConcurrency = 20;
  try {
    await Promise.all(
      Array.from({ length: forecastPeakConcurrency * 2 }, () => query('SELECT pg_sleep(0.01)'))
    );
    const snapshot = getDatabasePoolSnapshot();
    assert.equal(snapshot.acquisitionSampleCount, forecastPeakConcurrency * 2);
    assert.ok(
      snapshot.acquisitionP95Ms < 100,
      `pool acquisition p95 was ${snapshot.acquisitionP95Ms.toFixed(2)}ms`
    );
    assert.ok(snapshot.totalConnections <= 10);
  } finally {
    await pool.end();
  }
});
