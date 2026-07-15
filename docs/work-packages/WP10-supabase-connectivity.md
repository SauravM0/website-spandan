# WP10 — Supabase connectivity and connection budgets

## Outcome

Hosted API traffic now fails startup unless `DATABASE_URL` is a Supabase transaction-pooler endpoint on port 6543 with certificate verification enabled by application configuration. Named prepared statements are rejected because Supabase transaction mode does not support them. Local development and CI may continue to use local PostgreSQL without TLS.

Migrations use the separate `MIGRATION_DATABASE_URL` direct endpoint on port 5432 with a one-connection pool. Runtime and migration URLs must identify the configured Supabase project. URL-level SSL options are rejected so they cannot replace the verified TLS object; optionally supply the downloaded server root certificate through `DB_SSL_CA` using escaped newlines.

## Capacity model

The default API pool is 10 connections per replica, with two live replicas and one rolling-deployment surge replica. Five future worker connections, one migration connection, and five administrative connections are reserved. This plans 41 of a configured quota of 60 and remains below the 75% target of 45. Startup rejects any configuration that exceeds its 70–80% target.

The configured quota must be the administrator-approved safe limit for the selected Supabase compute and pooler. Before scaling Render, update `DB_MAX_API_REPLICAS`, run the policy check, and confirm Supabase Observability shows the same connection baseline. Pools keep `min=0` so a rolling deployment does not open every possible connection at startup.

## Region and performance evidence

Set `APPLICATION_REGION` and `SUPABASE_REGION` from the deployed services. Measure database round-trip p95 from staging at twice forecast peak, then set `DB_REGION_RTT_P95_MS`; hosted startup rejects evidence above `DB_REGION_RTT_TARGET_MS` (100 ms by default). The PostgreSQL integration gate independently requires pool-acquisition p95 below 100 ms under twice-forecast concurrency.

## Privacy-safe diagnostics

Acquisition and query timing events contain only outcome, duration, pool counts, SQL operation, and a one-way SQL fingerprint. SQL text, bound values, patient identifiers, and connection strings are never logged. `getDatabasePoolSnapshot()` exposes the rolling acquisition p95 and connection counts for WP13 observability without exposing database contents.

## Activation checklist

1. Copy the API transaction-pooler URI and direct migration URI from the matching Supabase project.
2. Enable Supabase SSL enforcement during an approved maintenance window.
3. Configure the connection quota and reserves from the selected Supabase compute tier.
4. Place Render and Supabase in the lowest-latency available region pair and record the staging RTT.
5. Run the twice-peak integration/load test during staging deployment and inspect connection usage during a rolling API replacement.
6. Keep worker capacity reserved but the worker service disabled until WP12.
