# Admin Dashboard Plan

**Route:** `/admin`  
**Current files:** `frontend/src/app/admin/page.tsx`  
**Complexity:** L  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Show what requires action today using one server-aggregated payload instead of downloading broad lists.

## Current findings

- Multiple requests for dashboard, today appointments, 100 orders, 100 payments.
- Browser calculates counts.
- Browser “today” can be timezone-sensitive.
- Duplicates `/admin/operations`.
- Weak prioritization of payment/notification/follow-up problems.

## Target workflow/layout

Clinic day header; prioritized action queue; summary cards with drill-down; limited today appointment queue; limited recent issues; system warnings. Operational actions—not decorative charts—get priority.

## Component/state plan

Keep route; focused widgets from one DashboardView; reuse compact appointment/payment/status components; mutation refreshes affected widget/payload; do not copy full list tables.

## API/database plan

Extend `/admin/operations/dashboard`: clinicDate/generatedAt, metrics, actionItems, limited todayAppointments/paymentIssues/notificationFailures, capability actions. Use filtered SQL aggregates and explicit Asia/Kolkata boundaries.

## Responsive behavior

Phone vertical action cards and appointment cards; tablet two columns; desktop 12-column grid with action queue priority; wide screens do not stretch widgets.

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

One dashboard request after session; target p95 <600 ms after measurement/indexing; skeleton mirrors grid; manual refresh keeps old safe data; no broad list fetch for counts.

## Security, privacy, and audit

Capability actions; masked contacts in overview; full detail only in route/drawer; audited status actions; no medical reason analytics/logging.

## Implementation sequence

Dashboard DTO; SQL aggregates; timezone boundaries; action layout; shared compact rows; remove extra requests/operations duplicate; add endpoint metrics.

## Acceptance criteria

One data request; counts match filtered lists/DB; IST today correct; phone no overflow; row action local; no downloaded broad datasets.

## Required tests

Aggregate fixtures, timezone, roles, endpoint query count, mutation refresh, responsive visual, latency/load.

## Dependencies/risks

Depends on cookie-only admin session, responsive shell, typed pagination, backend authorization, and audit logging.
