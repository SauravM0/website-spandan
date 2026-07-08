# Admin Operations Page Deprecation Plan

**Route:** `/admin/operations`  
**Current files:** `frontend/src/app/admin/operations/page.tsx`  
**Complexity:** S  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Eliminate duplicated operational UI after moving unique functions to canonical routes.

## Current findings

- Loads dashboard, appointments, orders, payments, rules, and overrides.
- Overlaps dashboard/calendar/list pages.
- Not linked in primary nav.
- Duplicate actions create regression and permission risk.

## Target workflow/layout

No final screen. Migrate metrics to `/admin`, schedule/settings to calendar, appointments/orders/payments to their routes. Temporarily redirect to `/admin`, then remove.

## Component/state plan

Do not redesign. Inventory unique code, move reusable logic into canonical components/services, delete route/imports after parity. No copied helper solely for redirect.

## API/database plan

No duplicate API. Retain endpoints used by canonical routes; consolidate replaced dashboard/calendar contracts; remove unused endpoints only after telemetry/reference scan.

## Responsive behavior

Only redirect behavior; no separate UI.

## Loading, empty, error, and mutation behavior

- Use layout-stable skeletons.
- Keep safe current data visible during filter refresh.
- Cancel stale requests.
- Row mutations show local pending state and rollback on error.
- Do not use optimistic updates for irreversible/high-risk finance/calendar operations without server confirmation.
- Distinguish no records from no filter matches.
- Show stable error code/request ID and retry.
- Never silently lose a failed write.

## Performance

Removal eliminates redundant broad requests and bundle code.

## Security, privacy, and audit

Redirect remains protected; capabilities reside in destination routes; no stale bookmarked page.

## Implementation sequence

Inventory; migrate; parity checklist; redirect; monitor; delete page/imports/tests; remove unused helpers/endpoints.

## Acceptance criteria

No unique function lost; route redirects; no nav link; no duplicate action components; dead code/API references removed.

## Required tests

Parity checklist, redirect/auth, dead-code scan, destination E2E, API usage telemetry.

## Dependencies/risks

Do after dashboard/calendar/list refactors.
