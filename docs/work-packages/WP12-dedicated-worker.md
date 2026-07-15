# WP12 — Dedicated leased worker

Status: implemented and locally verified. Production activation still requires a configured Render background-worker service and the staging acceptance run.

## Production boundary

API replicas serve HTTP only. Operational jobs run through `node dist/worker.js` in a separately built, signed, non-root image. PostgreSQL remains the coordination source: a worker atomically claims one due job with `FOR UPDATE SKIP LOCKED`, receives a fencing token, and renews its bounded lease while executing.

The first job set covers notification delivery, document processing, payment reconciliation, appointment-hold cleanup, expired intake cleanup, WhatsApp notifications, and lead archival. Application-managed PostgreSQL `CHECKPOINT` has been removed.

## Failure and shutdown behavior

- A terminating worker stops polling before it drains its active handler.
- An expired lease can be claimed by another instance; a stale instance cannot record success because completion requires its current fencing token.
- Failures use bounded exponential backoff and move the schedule to `dead_letter` after the configured maximum.
- Notification items also carry leases, recover abandoned `sending` rows, and use a stable email message ID to reduce duplicate delivery risk.
- Worker heartbeats and queue/dead-letter totals are exposed to the single administrator at `GET /api/admin/operations/worker-health`.

## Deployment

Create one Render background-worker service per environment from the `spandan-worker` signed digest. Disable auto-deploy, set the Docker command to `node dist/worker.js`, set maximum shutdown delay to 30 seconds, and do not configure a pre-deploy migration. Provide the same application secrets as the API only where a worker handler needs them, plus its transaction-pooler database URL.

The release pipeline verifies and deploys API, worker, and frontend digests from the same commit. The API pre-deploy job applies the expand migration before either runtime begins. Rollback restores frontend, worker, then API images without reversing schema.

## Acceptance evidence

Local gates cover type checking, worker lifecycle/failure tests, policy checks, migration validation, and deployment service validation. Staging must additionally demonstrate that two workers do not both claim a job, terminating an active worker permits recovery within the lease SLO, due/dead-letter health is visible, and an accepted notification or payment job is not lost during a rolling deploy.
