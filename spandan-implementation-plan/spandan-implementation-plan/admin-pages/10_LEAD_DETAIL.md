# Admin Lead Detail Plan

**Route:** `/admin/leads/[id]`  
**Current files:** existing page, `LeadDetailClient`, detail components  
**Complexity:** M  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Make one canonical surface for enquiry context, contact attempts, notes, history, and approved lifecycle transitions.

## Current findings

- Detail behavior duplicated in list.
- Transition/note validation and optimistic concurrency need definition.
- Contact/history access needs role control.
- Assignment/due data absent if operationally required.

## Target workflow/layout

Reference/status/type header; contact/context; original enquiry safely formatted; linked doctor/package; activity timeline; note/status action; authorized contact actions; linked appointment/order after conversion.

## Component/state plan

Keep route and make existing detail client/panel canonical. Remove list expansion. Separate summary, timeline, mutation form. Use version/updated timestamp.

## API/database plan

Detail returns lead/history/notes/allowed actions. Status+note mutation validates transition and version, writes lead/history/audit atomically, optionally links conversion. Avoid separate uncoordinated writes.

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

One detail request; timeline pagination if large; patch local entity after mutation.

## Security, privacy, and audit

Full contact only authorized; every mutation audited; sanitize free text; no third-party analytics; retention/deletion policy.

## Implementation sequence

Lifecycle; consolidate implementation; versioned atomic mutation; linked entities/contact; remove inline list; role/audit tests.

## Acceptance criteria

Direct URL canonical; concurrent edit conflicts; timeline actor/order correct; permissions enforced; back preserves filters.

## Required tests

Detail/history integrity, concurrency, transitions/audit, sanitization, role/masking, back state, phone timeline.

## Dependencies/risks

Depends on cookie-only admin session, responsive shell, typed pagination, backend authorization, and audit logging.
