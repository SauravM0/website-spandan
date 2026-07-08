# Admin Package Orders Plan

**Route:** `/admin/package-orders`  
**Current files:** `frontend/src/app/admin/package-orders/page.tsx`  
**Complexity:** L  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Find and manage orders, patient/package items, payment, preferred dates, preparation, and fulfillment state.

## Current findings

- One fetch/client filtering; no true pagination/search.
- Limited item/detail visibility and no lifecycle.
- Preferred date can look confirmed.
- No payment/receipt/notification timeline.
- Desktop table unsuitable on phone.

## Target workflow/layout

Status/date/package filters; server search; list/card; detail with buyer, items, snapshot price, preferred date, payment/receipt/notification, preparation, fulfillment notes; controlled contact/resend/status actions.

## Component/state plan

OrderList/Card/Detail/StatusActions; reuse payment/notification status. Stored totals only—never recalculate in admin.

## API/database plan

Paginated list and on-demand detail. Define separate order and payment lifecycle with allowed transitions/audit. Preferred date remains request unless capacity confirms. Historical order keeps price/item snapshot when package changes.

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

Server pages; list excludes histories; detail on demand; indexes date/status/phone/reference; row-local actions.

## Security, privacy, and audit

Full patient/contact only in authorized detail; list masked; audit status/contact/resend; no unnecessary medical notes.

## Implementation sequence

Agree lifecycle; paginated list/detail; responsive views; payment/notification timeline; controlled actions; remove client-only assumptions.

## Acceptance criteria

Find beyond first 100; multi-patient items/totals accurate; preferred date correctly labelled; unauthorized access blocked; full phone workflow.

## Required tests

Pagination/search, detail integrity, transitions, payment mismatch, multi-patient, role/audit, phone visual.

## Dependencies/risks

Requires agreed package-order operational lifecycle.
