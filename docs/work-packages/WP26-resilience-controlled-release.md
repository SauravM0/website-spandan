# WP26 — Resilience, backup, and controlled release

## Release status

The application controls are implemented, but production readiness is not claimed until a completed evidence file passes `npm run resilience:evidence -- <file>`. The template intentionally contains null values so that an unperformed drill cannot pass silently.

## Backup and isolated restore drill

1. Confirm Supabase PITR and backup retention in the production project and record provider evidence without credentials or patient data.
2. Create a new isolated non-production Supabase project. Never restore over development, staging, or production.
3. Restore the selected database recovery point and any approved object storage backup into that isolated target.
4. Measure backup recovery-point age as RPO and elapsed restore time as RTO.
5. Reconcile row totals, payment totals and states, appointments, the append-only audit chain, worker queues, and object counts.
6. Delete the isolated restore after evidence approval under the retention policy.

The gate requires RTO ≤2 hours and RPO ≤15 minutes. Store only timestamps, counts, hashes, result flags, and provider/run identifiers—never PHI or database URLs.

## Load, soak, and failure drill

Use production-shaped synthetic data in staging. Run a 60-minute soak at twice forecast peak across dashboard, lists, search, booking, payment recovery, and SSE. The combined error rate must remain below 0.5%, with stable memory and database-pool use.

Inject database latency, terminate a worker during an accepted job, disable the payment/notification provider, and terminate an API replica during an accepted booking. Verify bounded recovery, no duplicate side effects, no lost accepted writes, actionable alerts, and dead-letter visibility.

## Staff pilot and rollout

1. Keep `PUBLIC_COMMERCE_MODE=disabled` and `PHONEPE_ENABLED=false` initially.
2. Set `PUBLIC_COMMERCE_MODE=staff_pilot` with a server-only `STAFF_PILOT_TOKEN` for the approved staff drill.
3. Resolve every P0/P1 issue and test immediate safe-disable plus previous-image rollback.
4. Use the hosting release controls for a limited public observation window, while the application remains fail-closable.
5. Set `PUBLIC_COMMERCE_MODE=public` only after the completed WP26 evidence validates.
6. Enable PhonePe only after the separate finance/provider pilot; set `PHONEPE_PILOT_APPROVED=true` with its retained approval evidence.

If any gate fails, return the commerce mode to `disabled`, preserve accepted writes, restore retained frontend/worker/API image deploys, and never reverse the expanded database schema.
