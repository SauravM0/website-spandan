# Admin Payments Plan

**Route:** `/admin/payments`  
**Current files:** `frontend/src/app/admin/payments/page.tsx`  
**Complexity:** L  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Provide finance/reception reconciliation for successful, pending, failed, and duplicate-risk payments without exposing provider secrets.

## Current findings

- Search only loaded rows; no pagination.
- No provider/payment event timeline or safe recheck.
- Receipt URL handling inconsistent.
- Refund capability/policy not modeled.
- Compact screens depend on table overflow.

## Target workflow/layout

Filtered status summary; date/status/entity/provider filters; server search; responsive list; detail with linked entity, normalized event timeline, receipt/notification, reconciliation; safe provider recheck; refund only after full workflow.

## Component/state plan

PaymentList/Detail/Timeline/ReceiptActions; central asset URL; URL filters; never raw provider JSON.

## API/database plan

Paginated list/search/sort; safe detail events. Recheck is capability protected, rate-limited, idempotent, audited, records provider event and valid transition. Streamed CSV with escaping. No refund endpoint/UI until complete.

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

Pages 25/50; index transaction/reference/status/date; detail history on demand; row-local recheck; streamed export.

## Security, privacy, and audit

Mask contact; no provider credentials/signatures/raw payload; finance capability/audit; CSV formula-injection prevention; receipt authorization.

## Implementation sequence

Pagination/search/detail; normalize statuses/events; central receipt URL; safe recheck; responsive list/timeline; secure export; defer refunds.

## Acceptance criteria

Search all data; recheck safe/idempotent; success cannot regress incorrectly; export parity/injection safe; no raw secret data; phone supports actions.

## Required tests

Pagination/search, webhook/recheck race, transitions, receipt auth, CSV injection, role/audit, phone timeline.

## Dependencies/risks

Depends on cookie-only admin session, responsive shell, typed pagination, backend authorization, and audit logging.
