# Admin Calendar and Availability Plan

**Route:** `/admin/calendar`  
**Current files:** `frontend/src/app/admin/calendar/page.tsx` (~1,100 lines)  
**Complexity:** L  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Safely manage recurring availability, date overrides, slots, and booking settings while showing public impact and existing appointment conflicts.

## Current findings

- One component owns rules, overrides, appointments, settings, public slots, views, and mutations.
- Several range requests must be reconciled in browser.
- Bulk date save can issue one request per date and partially succeed.
- Date logic duplicated.
- Mobile month grid is operationally unsuitable.
- No formal unsaved/conflict/version workflow.

## Target workflow/layout

Doctor/range controls; Agenda/Week/Month views; normalized effective-status layer; selected-day inspector with appointments/public slots; override editor; transactional bulk preview; recurring rules; separate booking settings panel.

## Component/state plan

Within same route extract useCalendarViewModel/reducer, toolbar, MonthGrid, WeekView, AgendaView, DayInspector, OverrideEditor, BulkDialog, RulesEditor, SettingsPanel. Same normalized model for all breakpoints.

## API/database plan

Add calendar-view aggregator in existing operations service/controller using existing availability logic: rules, overrides, effective schedule, booked counts/summaries, public slot counts, settings/version, warnings. Batch override mutation validates all dates/conflicts, writes one transaction/audit, returns created/updated/skipped/conflicted, invalidates public availability. Use version on settings/rules.

## Responsive behavior


- **320–767 px:** default agenda/day list, sticky doctor/date, full-height edit sheet, conflicts before save; no compressed month grid.
- **768–1023 px:** default week view with selected-day drawer; month overview read-only/drill-in.
- **1024 px+:** month grid + selected-day side panel, legend/text labels, keyboard navigation where feasible, bulk preview.


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

Session + doctor list + one calendar-view request; batch writes; cached doctor/settings; cancel stale month/doctor requests; selected-day detail on demand; profile doctor/date indexes; lazy route chunk.

## Security, privacy, and audit

Capabilities for schedule/settings; audit actor/before/after/dates/reason; never silently close dates with appointments; no medical reason in overview; clinic timezone only.

## Implementation sequence

Date tests; normalized DTO; aggregator/batch transaction; extract model/views; mobile agenda/tablet week; conflict/unsaved; migrate unique operations settings; remove N-request code; load/a11y test.

## Acceptance criteria

Batch atomic; public slots consistent; conflict requires explicit handling; all views same effective availability; no stale doctor data; 320 usable; stale settings edit detected.

## Required tests

Availability precedence, batch rollback/conflict, timezone, request cancellation, roles, public/admin consistency E2E, view visuals, dialog focus, query count/load.

## Dependencies/risks

Highest-risk admin refactor; requires real reception workflow validation.
