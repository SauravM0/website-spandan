# WP09 — Deployment and rollback pipeline

## Outcome

Successful signed-image publication on `main` now starts a single serialized release. The pipeline resolves the immutable API and frontend digests, verifies their keyless signatures, deploys those exact digests to staging, runs API migrations through Render's pre-deploy command, deploys the frontend, and blocks promotion when smoke or observation probes fail.

Production promotion uses the protected GitHub `production` environment. Configure that environment with the sole administrator as required reviewer. Staging is the release canary; Render then performs zero-downtime replacement and rolls multiple instances one at a time when the service is scaled beyond one instance.

## Required Render configuration

Create image-backed API and frontend services in both Render environments. Disable Render auto-deploy and overlapping deploys. Configure:

| Setting            | API                                            | Frontend                                            |
| ------------------ | ---------------------------------------------- | --------------------------------------------------- |
| Health check       | `/api/ready`                                   | `/healthz`                                          |
| Pre-deploy command | `node dist/migrate.js`                         | none                                                |
| Persistent disk    | none                                           | none                                                |
| Image repository   | `ghcr.io/sauravm0/website-spandan/spandan-api` | `ghcr.io/sauravm0/website-spandan/spandan-frontend` |

The pre-deploy command runs from the exact API artifact before Render routes traffic to it. A migration failure leaves the previously successful service live.

## GitHub environments

Create `staging` and `production` environments. Each contains:

- Secret `RENDER_API_KEY`.
- Variable `RENDER_API_SERVICE_ID`.
- Variable `RENDER_FRONTEND_SERVICE_ID`.
- Variable `API_URL`.
- Variable `FRONTEND_URL`.

The Render services, not GitHub Actions, hold database and provider credentials. Staging credentials and data remain synthetic-only. Production requires reviewer approval and must prevent self-bypass where the repository plan supports it.

## Smoke and observation gates

The release checks direct API health/readiness, frontend health, same-origin API proxying, public booking rendering, admin-login rendering, immutable application version, error rate, and p95 response time. No patient identifiers, credentials, provider payloads, or clinical data enter release evidence. Rollback evidence stores only a hash of the non-PHI incident/change reference.

Payment drift and worker queues remain disabled/unavailable until their owning work packages add privacy-safe telemetry. The release pipeline must not pretend those signals exist.

## Automatic and manual rollback

If staging or production fails after a successful service deploy, the workflow attempts to restore the captured previous frontend deploy and then the previous API deploy. The manual rollback workflow requires the exact retained Render deploy IDs, the target application version, a reason, the literal confirmation `ROLLBACK`, and protected production approval.

Rollback never reverses migrations or deletes accepted patient/payment writes. It restores prior application images against the compatible expanded schema. Render must retain the referenced registry digests and deploy artifacts.

## Evidence and external activation

Every release retains digest, deploy-ID, smoke, timing, and rollback evidence as a GitHub artifact. Actual deployment remains inactive until the GitHub environments, Render service variables, API key, image registry credential, and production reviewer protection are configured by the sole administrator.
