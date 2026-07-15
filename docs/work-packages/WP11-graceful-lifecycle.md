# WP11 — Graceful process lifecycle management

## Outcome

The API retains its HTTP server and installs idempotent `SIGTERM` and `SIGINT` handlers. Shutdown changes readiness to `draining` immediately, stops cron tasks from claiming new work, stops accepting HTTP connections, waits for accepted requests and active background work, and closes the PostgreSQL pool last. The application deadline is 25 seconds inside Render's configured 30-second shutdown delay.

`/api/health` remains a process-only liveness probe. `/api/ready` checks lifecycle state before touching PostgreSQL and returns `503` throughout drain. Both probes are mounted before the ordinary `/api` rate limiter. Render uses `/api/ready` for deployment health while the container image uses `/api/health` for liveness.

Idle PostgreSQL client errors are logged with a safe error code and the failed client is left for `pg` to remove; they no longer invoke `process.exit`. Query failures make readiness fail naturally. `pool.end()` waits for checked-out transaction clients only after accepted HTTP and background operations finish.

## Failure behavior

If draining exceeds `SHUTDOWN_TIMEOUT_MS`, the API force-closes HTTP connections, records a non-PHI failure code, and leaves a non-zero process exit code. Render retains the outer five-second margin before its `SIGKILL`. The previous image remains rollback-safe because this package changes no schema or accepted-write format.

The existing in-process scheduled jobs now expose stop and drain controls, but remain in the API only until WP12 creates the dedicated worker. Application-managed `CHECKPOINT` removal, database leases, retries, and worker recovery remain WP12 scope.

## Staging verification

1. Configure Render API health path `/api/ready` and maximum shutdown delay `30` seconds.
2. Start a synthetic booking request that pauses inside its transaction, then deploy a new digest.
3. Confirm the old instance returns readiness `503` before exit and the accepted booking commits once.
4. Confirm no avoidable 5xx increase, no database connection spike, and no new cron claim after `SIGTERM`.
5. Retain request ID, lifecycle timings, deploy ID, and synthetic booking ID as evidence without patient data.
