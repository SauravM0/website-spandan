# Audit Findings Register

This register tracks the platform audit findings from `platform/06_AUDIT_FINDINGS.md`. The machine-readable source is `docs/audit-findings.json`.

## Status Rules

- `mitigated`: implementation evidence exists, but the release runbook may still require verification.
- `in_progress`: work is underway and has an owner/evidence, but the finding is not fully closed.
- `needs_verification`: code may already be safe, but a content/legal/privacy check is required.
- `open`: known remaining risk that must not be ignored.

## P0 Findings

| ID | Finding | Status | Owner | Next action |
| --- | --- | --- | --- | --- |
| P0-001 | Static export conflicts with mutable dynamic routes | mitigated | engineering | Deploy with normal Next server runtime and keep build-time API fallback warnings out of production monitoring noise. |
| P0-002 | Root public shell is not structurally isolated from admin | mitigated | engineering | Keep public/admin route groups separate as remaining pages are refactored. |
| P0-003 | Admin trusts fake localStorage token while backend uses cookie | mitigated | engineering | Continue avoiding bearer-token-only admin flows. |
| P0-004 | UTC date helpers can shift clinic dates | open | engineering | Finish replacing UTC date construction with Asia/Kolkata clinic-day helpers and add India boundary tests. |
| P0-005 | Frontend appointment fee is hard-coded separately from backend | in_progress | engineering | Expose appointment quote/fee from backend and remove independent frontend fee constants. |
| P0-006 | ABHA/Aadhaar are collected and placed in free-text notes | needs_verification | privacy | Verify current forms do not collect ABHA/Aadhaar; remove or structure with explicit consent if present. |
| P0-007 | Privacy text does not match actual collection and includes unverified claims/contact | open | legal | Compare policy text against actual collection before production sign-off. |
| P0-008 | Payment confirmation lacks robust pending/retry/recovery | in_progress | engineering | Finish explicit pending/retry/recovery UX and provider race-case verification. |
| P0-009 | Clinic facts are duplicated/inconsistent | in_progress | content | Use central settings source for clinic identity, address, phone, and policy references. |
| P0-010 | `/admin/operations` duplicates other admin routes | in_progress | engineering | Deprecate or redirect after replacement coverage is complete. |

## Current Production Rule

Production release requires either:

- all P0 findings `mitigated`, or
- documented release-owner approval for any remaining P0 with rollback/repair steps in `docs/release-runbook.md`.

Run:

```bash
npm run audit:findings
```

The command reports severity/status counts and exits non-zero if a finding is missing owner/status metadata.
