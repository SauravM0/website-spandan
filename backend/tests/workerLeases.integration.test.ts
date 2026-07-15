import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresWorkerLeaseStore } from '../src/worker/leaseStore';
import { pool, query } from '../src/config/database';

const databaseTest = process.env.TEST_DATABASE_URL ? test : test.skip;

databaseTest(
  'two workers fence duplicate execution and an expired lease is recovered',
  async () => {
    const store = new PostgresWorkerLeaseStore();
    const workerA = '00000000-0000-4000-8000-000000000101';
    const workerB = '00000000-0000-4000-8000-000000000102';
    const jobName = 'ci-worker-lease';
    try {
      await store.register(workerA, 'ci');
      await store.register(workerB, 'ci');
      await query("UPDATE worker_jobs SET status = 'disabled' WHERE status = 'enabled'");
      await query(
        `INSERT INTO worker_jobs (name, interval_seconds, next_run_at, max_attempts)
       VALUES ($1, 1, NOW(), 2) ON CONFLICT (name) DO UPDATE
       SET status='enabled', next_run_at=NOW(), lease_owner=NULL, lease_token=NULL,
           lease_expires_at=NULL, consecutive_failures=0, dead_lettered_at=NULL`,
        [jobName]
      );
      const claims = await Promise.all([store.claim(workerA, 30), store.claim(workerB, 30)]);
      assert.equal(claims.filter(Boolean).length, 1);
      const first = claims.find(Boolean)!;
      const firstOwner = claims[0] ? workerA : workerB;
      const recoveryOwner = claims[0] ? workerB : workerA;

      await query(
        `UPDATE worker_jobs SET lease_expires_at = NOW() - INTERVAL '1 second' WHERE name = $1`,
        [jobName]
      );
      const recovered = await store.claim(recoveryOwner, 30);
      assert.ok(recovered);
      assert.equal(await store.succeed(firstOwner, first), false);
      assert.equal(await store.succeed(recoveryOwner, recovered!), true);

      await query(`UPDATE worker_jobs SET next_run_at=NOW() WHERE name=$1`, [jobName]);
      const failedOnce = await store.claim(workerA, 30);
      assert.ok(failedOnce);
      assert.equal(await store.fail(workerA, failedOnce!, 'CI_FAILURE'), true);
      await query(`UPDATE worker_jobs SET next_run_at=NOW() WHERE name=$1`, [jobName]);
      const failedTwice = await store.claim(workerB, 30);
      assert.ok(failedTwice);
      assert.equal(await store.fail(workerB, failedTwice!, 'CI_FAILURE'), true);
      const state = await query(
        `SELECT status, consecutive_failures FROM worker_jobs WHERE name=$1`,
        [jobName]
      );
      assert.deepEqual(state.rows[0], { status: 'dead_letter', consecutive_failures: 2 });
    } finally {
      await query(`DELETE FROM worker_jobs WHERE name=$1`, [jobName]).catch(() => {});
      await query(
        `UPDATE worker_jobs SET status='enabled', dead_lettered_at=NULL WHERE status='disabled'`
      ).catch(() => {});
      await query(`DELETE FROM worker_instances WHERE id = ANY($1::uuid[])`, [
        [workerA, workerB],
      ]).catch(() => {});
      await pool.end();
    }
  }
);
