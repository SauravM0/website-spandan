# Admin Notifications Plan

**Route:** `/admin/notifications`  
**Current files:** `frontend/src/app/admin/notifications/page.tsx`  
**Complexity:** M  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Identify failed clinic messages, understand safe failure categories, and retry only when policy permits.

## Current findings

- No server pagination/filter/search.
- Destinations may be overexposed.
- Retry/backoff/max attempts unclear.
- No permanent failure/dead-letter workflow.
- No detailed entity/attempt context.

## Target workflow/layout

Status/channel/date/entity filters; queued/failed/permanent summary; masked list; detail with template/entity/attempts/normalized error/eligibility; safe retry; controlled bulk retry; manual follow-up/dead letter.

## Component/state plan

NotificationList/Detail/RetryAction; shared masking/status; local retry update.

## API/database plan

Paginated filters. DTO redacts message/provider secrets. Retry enforces state, max attempts, cooldown, lock/idempotency, role, audit, returns next status. Explicit dead-letter state.

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

Server pagination, status/channel/date indexes, detail on demand, worker/backlog metrics, no full-list polling.

## Security, privacy, and audit

Mask destination; no tokens/raw payload; redacted preview; capability/audit.

## Implementation sequence

Define retry/dead-letter; pagination/filter/detail; normalized errors/masking; responsive list; safe retry/bulk; monitoring.

## Acceptance criteria

Ineligible retry rejected UI/API; attempt/cooldown correct; masked list; concurrent retry does not duplicate; manual cases clear.

## Required tests

Retry lock/idempotency, max/cooldown, pagination, redaction, role/audit, worker/dead-letter, phone.

## Dependencies/risks

Depends on cookie-only admin session, responsive shell, typed pagination, backend authorization, and audit logging.
