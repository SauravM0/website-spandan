# WP03 — Environment isolation

## Outcome

Development, staging, and production have explicit, machine-checked identity and data policies. Lower environments are synthetic-only. Hosted staging/production startup rejects local or mismatched Supabase database URLs.

## Environment contract

| Environment | NODE_ENV | DEPLOYMENT_ENV | DATA_POLICY | Data |
| --- | --- | --- | --- | --- |
| Development | development | development | synthetic-only | Synthetic/local |
| Test | test | test | synthetic-only | Ephemeral synthetic |
| Staging | production | staging | synthetic-only | Synthetic hosted project |
| Production | production | production | production-patient-data | Approved patient data |

Each Render environment must supply a unique `ENVIRONMENT_NAME`, `SUPABASE_PROJECT_REF`, `DATABASE_URL`, and separate provider/monitoring credentials. Secrets are entered in Render, never committed.

## Cloud provisioning checklist

1. Create three Supabase projects or local-development plus distinct hosted staging/production projects.
2. Record each hosted project reference only in its corresponding Render secret group.
3. Create Render project environments named `spandan-development`, `spandan-staging`, and `spandan-production` with network isolation enabled where supported.
4. Protect production from destructive non-admin actions.
5. Populate separate PhonePe, SMTP, WhatsApp, storage, and monitoring secrets; leave unapproved features disabled.
6. Run `npm run environments:check`, then start each service and confirm its safe environment identity in redacted startup telemetry.

Render Blueprint services are intentionally deferred to WP04 because the current frontend Dockerfile still targets an incompatible static export. This prevents provisioning a known-broken service definition.

## Verification

- Contract check rejects duplicate environment names and project-ref secret names.
- Backend tests reject project mismatch, local production DB, incorrect runtime mode, and production data in staging.
- Full release check must pass.

## Rollback

Revert the WP03 commit and remove only unpopulated Render/Supabase staging resources. Never delete a populated production project during rollback; disable traffic and preserve audit/backup evidence.
