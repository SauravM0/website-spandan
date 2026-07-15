# WP08 — Transactional migration ledger

## Outcome

Database changes now run through a checksum-enforced, append-only `schema_migrations` ledger. A session-level PostgreSQL advisory lock allows only one migration executor, each migration and its ledger record commit in one transaction, and a failed migration rolls back without erasing previously accepted changes.

The Express API does not import or run migration code. Render must override the API image command with `node dist/migrate.js` for a one-off pre-deployment migration job. API startup remains `node dist/index.js`.

## Existing production database adoption

The current reviewed legacy baseline is migration 31. On the first deployment only, the release owner may set `MIGRATION_BASELINE_VERSION=31` on the one-off migration job after confirming the database is the reviewed baseline. The runner verifies critical relations, constraints, and the diagnostic catalogue before recording historical checksums as `adopted`; it does not replay their SQL.

Never set this variable for a clean database, an unknown database, or later deployments. Automatic baseline inference is intentionally forbidden.

## Compatibility rules

Migration 32 and later require one marker:

```sql
-- migration-phase: expand
```

Allowed values are `expand`, `migrate`, and `contract`. Destructive or newly mandatory changes belong to a later contract migration and require `-- compatibility-approved: WP<number>`. The previous application image must continue working after expand and migrate phases.

## Deployment sequence

1. Build and identify one immutable API image.
2. Run that image once with `node dist/migrate.js` and production database credentials.
3. Stop deployment immediately if the job fails.
4. Deploy API and worker images only after the migration job succeeds.
5. Roll back application images without reversing accepted database writes.

## Recovery and rollback

Never edit, delete, or rename an applied migration. Repair a failed, unrecorded migration and rerun the one-off job. For an applied schema defect, append a compatible corrective migration. The ledger itself rejects updates, deletes, and truncation.

Application rollback uses the previous image against the expanded schema. Destructive schema reversal is not part of the rollback procedure.
