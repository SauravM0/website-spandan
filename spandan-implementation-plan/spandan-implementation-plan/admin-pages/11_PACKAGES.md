# Admin Package Management Plan

**Route:** `/admin/packages`  
**Current files:** `frontend/src/app/admin/packages/page.tsx`, `components/admin/PackageEditor.tsx`, backend admin packages  
**Complexity:** L  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Safely edit package identity, content, pricing, preparation, tests, publish/bookable state, and public preview.

## Current findings

- Main page mainly read-only although editor/PUT exist.
- Backend list performs one test query per package (N+1).
- No pagination/search/publish workflow or concurrency control.
- Test-list CRUD and cache invalidation are incomplete.
- Existing orders must preserve historical snapshots.

## Target workflow/layout

Search/category/status list with price/published/bookable/updated; editor sections for identity, suitability, pricing/validity, ordered tests, preparation, visit/report, related content, publish; preview; save draft/publish with validation/version.

## Component/state plan

Keep route and integrate/refactor existing PackageEditor. Add TestsEditor, PriceEditor, PublishControls. Drawer/full-screen editor by viewport; dirty-state warning; accessible reorder not drag-only.

## API/database plan

Fix N+1 via aggregate/two batched queries; list omits tests, detail includes ordered tests. Transactional package+tests update; price/date validation; optimistic version; audit; tag invalidation; admin capability. Historical order snapshot unchanged.

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

Paginated list; detail on demand; bounded query count; targeted invalidation; no full tests in list.

## Security, privacy, and audit

Admin capability; audit price/publish; publication validation; conflict prevention; sanitize descriptions.

## Implementation sequence

Fix N+1/DTO; integrate editor; transactional tests/pricing/publish; conflict/dirty; preview/invalidation; responsive editor; historical snapshot tests.

## Acceptance criteria

Bounded queries; public updates after invalidation; concurrent edit safe; deactivation blocks new order but preserves history; phone editor complete.

## Required tests

Query-count regression, transaction, price/date, publish/invalidate, conflict, inactive checkout, snapshot, role/audit, phone editor.

## Dependencies/risks

Requires package content/publish governance.
