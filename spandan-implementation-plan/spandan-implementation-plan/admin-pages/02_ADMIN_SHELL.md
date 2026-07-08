# Admin Shell and Navigation Plan

**Route:** `all protected `/admin/*``  
**Current files:** `src/app/admin/layout.tsx` and `components/layout/AdminLayout.tsx`  
**Complexity:** L  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Provide one fast, role-aware, responsive shell controlling session, navigation, page chrome, and global errors.

## Current findings

- Every page wraps itself in `AdminLayout`.
- Horizontal scrolling nav does not scale.
- User/role loaded from localStorage.
- No centralized 401/403/session-expiry behavior.
- Public/admin shell separation is weak.
- No shared page header/filter/detail responsive primitives.

## Target workflow/layout

Desktop collapsible sidebar grouped into Operations, Patients, Finance, Content/Settings; sticky top bar. Tablet icon rail/drawer. Phone drawer + title/primary action. Nav shown by backend capabilities.

## Component/state plan

Render AdminLayout once in protected layout; remove page wrappers. Add AdminSessionProvider, AdminPageHeader, AdminNav, mobile drawer, error boundary, ResponsiveDataView, FilterBar, Pagination, StatusBadge. No separate mobile business logic.

## API/database plan

`/auth/me` returns staff, role, capabilities, expiry, optional scope. API client uses credentials, centralized 401, permission state for 403, abort/normalized errors, no fake Authorization token.

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

Session fetched once; shell loaded once; careful route prefetch; lazy heavy calendar; avoid per-page `/auth/me`.

## Security, privacy, and audit

Backend capability authority; logout clears server cookie; no patient data in global persistence; focus-trapped drawer; permission-aware commands.

## Implementation sequence

Route groups; session provider/client behavior; sidebar/drawer; move wrapper to layout; remove wrappers/localStorage; capability map; shared primitives; full visual/a11y test.

## Acceptance criteria

Exactly one shell; login isolated; no localStorage auth; 401 no loop; 403 no leak; nav usable 320–1440.

## Required tests

Session guard, role nav, 401/403, drawer focus, shell visual matrix, no duplicate wrapper, logout/expiry E2E.

## Dependencies/risks

Depends on cookie-only admin session, responsive shell, typed pagination, backend authorization, and audit logging.
