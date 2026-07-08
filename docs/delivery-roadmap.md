# Spandan Delivery Roadmap

This roadmap turns the implementation plan into delivery phases, gates, and evidence. It should be reviewed before each release candidate alongside `docs/release-runbook.md`.

## Current Delivery Rule

Operational and revenue workflows come before public marketing polish. Scheduling, payments, package purchases, admin reconciliation, notifications, and lead follow-up carry the highest production risk.

## Phase Overview

| Phase | Name | Current status | Release gate |
| --- | --- | --- | --- |
| 0 | Baseline and verification | In progress | Verified facts, secrets, staging, roles, and approved content inventory |
| 1 | Architecture and security | In progress | Server deployment, admin guard, cookie session, CSRF/origin, API errors, pagination |
| 2 | Responsive system | In progress | Public/admin shell, shared data primitives, skeleton/error states, responsive matrix |
| 3 | Operational and revenue workflows | In progress | Booking, package purchase, calendar, appointments, payments, notifications |
| 4 | Public trust pages | Pending | Verified public content only |
| 5 | Admin CRM and content | In progress | Dashboard, leads, package editor, audit/RBAC, operations deprecation |
| 6 | Legal, accessibility, and hardening | Pending | Privacy/terms, accessibility audit, load tests, backup restore, monitoring, rollout |

## Delivery Order

1. Keep the release gate green: `npm run release:check`.
2. Review audit findings: `npm run audit:findings`.
3. Finish any incomplete Phase 1 and Phase 2 platform items that block workflows.
4. Finish Phase 3 workflows before lower-risk visual/content work.
5. Finish Phase 5 admin CRM/content items that replace `/admin/operations`.
6. Complete Phase 4 public trust pages using verified content only.
7. Complete Phase 6 legal, accessibility, observability, backup, and staged rollout gates.

## Phase Gates

### Phase 0 - Baseline and Verification

- Clean release branch identified.
- Secrets reviewed outside source control.
- Staging environment reproduces production build.
- Clinic, doctor, package, contact, and policy facts verified.
- Approved media and testimonials inventoried.
- Admin roles and status transitions reviewed.

### Phase 1 - Architecture and Security

- Next server deployment path confirmed.
- Public and admin shells separated.
- Layout-level admin guard active.
- Cookie admin session and CSRF/origin controls verified.
- Typed API errors and pagination contracts used by admin lists.
- Timezone and settings utilities used by scheduling paths.
- Privacy-safe logging reviewed.

### Phase 2 - Responsive System

- Public header, drawer, footer, and sticky actions verified.
- Admin sidebar and mobile drawer verified.
- Shared admin data primitives used for list/table/card views.
- Skeleton, empty, error, and mutation states covered.
- Responsive matrix captured for 320, 390, 768, 1024, 1280, and 1440 px.

### Phase 3 - Operational and Revenue Workflows

- Appointment booking to payment confirmation tested.
- Admin calendar and appointments tested.
- Package booking and package orders tested.
- Payments search, export, detail, and recheck tested.
- Notifications retry and manual follow-up tested.
- No stale price, availability, or payment fallback is treated as authority.

### Phase 4 - Public Trust Pages

- Home content verified.
- Doctors list and detail verified.
- Packages list and detail verified.
- Facilities, about, and contact verified.
- Resources, videos, and tools reviewed for clinical claims.
- Marathi and Hindi expansion checked where content exists.

### Phase 5 - Admin CRM and Content

- Dashboard aggregation verified.
- Leads list and detail canonical flow verified.
- Package editor version/audit behavior verified.
- Audit and RBAC behavior reviewed.
- Legacy `/admin/operations` removed or redirected after replacement coverage.

### Phase 6 - Legal, Accessibility, and Hardening

- Privacy and terms approved.
- Retention and deletion policy approved.
- Manual accessibility audit completed.
- Load and concurrency tests completed.
- Backup restore verified.
- Monitoring and support runbook owners assigned.
- Staged rollout and rollback owner named.

## Status Command

Use this to print the phase status from the machine-readable roadmap:

```bash
npm run roadmap:status
```

The source of truth for phase status is `docs/delivery-roadmap.json`.
