# Admin Appointments Plan

**Route:** `/admin/appointments`  
**Current files:** `frontend/src/app/admin/appointments/page.tsx`  
**Complexity:** L  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Provide a fast searchable appointment work queue with safe transitions, responsive detail, and filter-matched export.

## Current findings

- Search applies only to downloaded limited rows.
- No pagination metadata.
- Status select does not clearly expose backend-allowed transitions.
- Wide table relies on horizontal scroll.
- No canonical row detail/history.
- localStorage auth.

## Target workflow/layout

Header + authorized staff-book action; Today/Tomorrow/Week/Custom; doctor/status/source filters; debounced server search; responsive list; detail drawer; allowed transition menu; export using current filters.

## Component/state plan

Shared AppointmentList/Card/DetailDrawer/StatusActionMenu; URL-sync filters; dashboard compact variant; no copied mobile fetch.

## API/database plan

List adds page/pageSize/search/sort/filters/pagination and allowed actions. Detail endpoint if list payload would expose too much. Status mutation validates transition, version, role, audit. Export uses identical server filters and safe CSV.

## Responsive behavior


- **Phone:** drawer navigation, card/list data view, filter sheet, full-screen detail, no required horizontal table scroll.
- **Tablet:** compact table or card hybrid, wrapped filters, side drawer where space permits.
- **Desktop:** table/grid plus detail drawer, sticky header, visible primary action.
- Test 320/390/768/1024/1440 px, 200% zoom, long values, empty/error/loading, and keyboard-only use.


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

25-row pages, debounced/cancelled search, date/doctor/status/search indexes, local row mutation/rollback, streamed export.

## Security, privacy, and audit

Permission for contact/status/export; mask list; audit changes; no medical reason analytics; backend transition authority; CSV formula-injection protection.

## Implementation sequence

Pagination/search/sort; transition map; URL state; responsive list/detail; local mutation; export parity; remove local filters/localStorage.

## Acceptance criteria

Search across all data; pagination correct; forced invalid transition rejected; export parity; no phone table overflow; no full-page reload per row.

## Required tests

Pagination/search, transition auth/version conflict, export parity/injection, cancellation, phone card/detail, large data, audit.

## Dependencies/risks

Depends on cookie-only admin session, responsive shell, typed pagination, backend authorization, and audit logging.
