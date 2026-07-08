# Admin Leads List Plan

**Route:** `/admin/leads`  
**Current files:** `frontend/src/app/admin/leads/page.tsx`  
**Complexity:** M  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Provide a complete searchable follow-up queue without duplicate lead-detail behavior or current-page-only filtering.

## Current findings

- Backend pagination metadata is discarded.
- Search/type/date filters only downloaded records.
- Inline history expansion duplicates `/admin/leads/[id]`.
- Broad contact/message display.
- “Patients” nav label may misrepresent enquiries.
- No owner/due/SLA model.

## Target workflow/layout

Use “Enquiries/Leads” naming; New/Follow-up/Contacted/Closed presets; server filters/search/date/type; paginated responsive list; masked contact; canonical detail; safe quick actions; assignment/due date only after workflow agreement.

## Component/state plan

Keep list/detail routes. Remove inline history/detail duplication. Reuse LeadDetailPanel only canonically. URL filters/pagination and shared actions.

## API/database plan

Preserve backend pagination in frontend wrapper. Add status/type/date/search/page/pageSize/sort and optional assignment/due filters. List excludes full message/history; detail remains authority.

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

Server pagination/indexed normalized phone/name/status/date; debounce/cancel; history only in detail; retain current list during refetch.

## Security, privacy, and audit

Mask contact; capabilities for contact/export/status; audit notes/status; no health enquiry analytics/log; retention for closed leads.

## Implementation sequence

Clarify domain name; preserve metadata; server filters; remove inline detail; responsive list; assignment only if approved; retention/access tests.

## Acceptance criteria

Search full dataset; pagination correct; one canonical detail; archive/closed defined; phone list hides unnecessary message.

## Required tests

Pagination/filter/search, URL state, detail nav, status/audit, masking/role, large data, phone.

## Dependencies/risks

Depends on cookie-only admin session, responsive shell, typed pagination, backend authorization, and audit logging.
