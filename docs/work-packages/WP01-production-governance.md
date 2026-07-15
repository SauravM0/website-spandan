# WP01 — Production ownership and governance

## Decision

Production uses one application account identified as `sole-clinic-admin`. That account owns product, engineering, privacy administration, security administration, data, finance, operations, release, and rollback responsibilities. No additional staff login is approved.

Clinical data collection remains disabled. Legal and clinical-safety reviews are external release gates: assigning the sole administrator as the accountable owner does not constitute professional approval.

## Incident objectives

- Security or privacy event: acknowledge within 15 minutes.
- Booking or payment outage: acknowledge within 30 minutes.
- Other production issue: acknowledge within 4 hours.
- Escalation contact: sole clinic administrator.

## P0/P1 tracking gate

| Finding | Owner | Due | Acceptance test |
| --- | --- | --- | --- |
| P0-001 | sole-clinic-admin | 2026-07-31 | Clean production frontend container serves mutable public and protected admin routes. |
| P0-002 | sole-clinic-admin | 2026-07-31 | Public and admin route-group isolation tests pass. |
| P0-003 | sole-clinic-admin | 2026-07-31 | Protected pages and APIs reject missing/revoked cookie sessions. |
| P0-004 | sole-clinic-admin | 2026-08-07 | Asia/Kolkata boundary tests pass for booking, calendar, payment, and reporting dates. |
| P0-005 | sole-clinic-admin | 2026-08-07 | Frontend displays only the server-authoritative versioned price quote. |
| P0-006 | sole-clinic-admin | 2026-08-07 | Public forms and stored free text contain no ABHA/Aadhaar collection path. |
| P0-007 | sole-clinic-admin | 2026-08-15 | Qualified external legal reviewer approves privacy text against the data inventory. |
| P0-008 | sole-clinic-admin | 2026-08-07 | Payment E2E covers pending, retry, recovery, failure, and delayed success. |
| P0-009 | sole-clinic-admin | 2026-08-15 | Clinic facts resolve from one verified source in public content and metadata. |
| P0-010 | sole-clinic-admin | 2026-08-15 | Replacement admin routes cover all supported operations before legacy removal. |
| P1-001 | sole-clinic-admin | 2026-08-31 | Production-shaped dashboard query meets the approved p95 target. |
| P1-002 | sole-clinic-admin | 2026-08-31 | Every operational collection is bounded and deterministically paginated. |
| P1-003 | sole-clinic-admin | 2026-09-15 | Checkout and calendar behavior is covered by extracted unit and E2E tests. |
| P1-004 | sole-clinic-admin | 2026-08-31 | Critical admin lists work at 320 px without required horizontal scrolling. |

## Release gate

Structural governance checks must pass in development. Production checks intentionally remain red until:

1. Qualified legal and clinical-safety reviewers are named with evidence.
2. The next phase is explicitly approved with evidence.
3. All open P0 findings are mitigated or receive documented, time-limited acceptance.

The release workflow must call the production variants of both governance checks and may not replace them with the structural development checks.

## Rollback

If the account model changes unexpectedly, disable production deployment, retain the existing sole administrator session evidence, revoke unauthorized sessions, and restore the last approved governance records. Governance rollback must never delete audit evidence.
