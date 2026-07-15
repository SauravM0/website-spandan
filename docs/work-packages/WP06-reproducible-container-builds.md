# WP06 — Reproducible container builds

## Outcome

The API and frontend use the same digest-pinned Node 22 Alpine multi-platform base, locked dependency installation, non-root runtime users, health checks, production-only API dependencies, and OCI traceability labels. CI independently rebuilds each commit, compares image identities, creates SBOM evidence, rejects high/critical vulnerabilities, publishes by immutable SHA tag, attaches provenance, and signs the digest with keyless Cosign.

## Artifact contract

| Artifact | Context | Runtime | Publicly deployable |
| --- | --- | --- | --- |
| API | `backend` | Node/Express, user `express` | After signed scan passes |
| Frontend | `frontend` | Next.js standalone, user `nextjs` | After signed scan passes |
| Worker | Not buildable yet | Blocked on WP12 | No |

The worker is intentionally not faked: background jobs currently start inside `backend/src/index.ts`. WP12 must create an independent entry point and remove API-owned job execution before a worker artifact can pass this policy.

## Supply-chain policy

- Build metadata comes from the Git commit SHA and commit timestamp, not wall-clock time.
- GitHub Actions are pinned to full commit SHAs.
- Pull requests retain CycloneDX SBOM artifacts and fail on any high/critical OS or library vulnerability.
- Main publishes `sha-<full commit>` plus a movable `main` convenience tag, but deployment must use the digest only.
- BuildKit emits maximum provenance and an SBOM attestation; GitHub provenance and a keyless Cosign signature are attached to the published digest.
- No vulnerability exception exists. Adding one requires a separately reviewed, expiring risk acceptance and a policy change.

## Verification and rollback

Run `npm run containers:check` and the full release gate. With Docker running, run the container workflow or build each Dockerfile twice using the same metadata and compare image IDs. Verify a published artifact with Cosign and its GitHub attestation before configuring Render. Rollback selects a previously verified digest; never rebuild an old tag.

Docker Desktop was unavailable during local WP06 implementation, so actual layer builds, SBOM contents, vulnerability results, signatures, and reproducibility comparison remain mandatory CI evidence before this package's operational gate can close.
