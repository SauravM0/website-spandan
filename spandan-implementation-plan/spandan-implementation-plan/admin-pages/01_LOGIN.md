# Admin Login Plan

**Route:** `/admin/login`  
**Current files:** `frontend/src/app/admin/login/page.tsx`  
**Complexity:** M  
**Rule:** Refactor the existing admin application; do not build a parallel admin.

## Operational objective

Authenticate authorized staff using the existing secure cookie session, without exposing tokens or trusting browser storage.

## Current findings

- Writes fake `admin_token` and user object to localStorage.
- Does not use `/auth/me` as session authority.
- Limited loading, rate-limit, session-expiry, and accessibility states.
- Current layout structure can allow public chrome around login.

## Target workflow/layout

Standalone auth layout; email/password; password visibility; pending submit; generic invalid-credential response; safe rate-limit guidance; support path only. Authenticated staff visiting login redirect to admin.

## Component/state plan

Keep page; small typed form schema; call `/auth/me` on entry; update shared session provider on login; router replace; no localStorage.

## API/database plan

Keep `/auth/login`, `/auth/logout`, `/auth/me`. Verify Secure/HttpOnly/SameSite by environment, normalized email, generic errors, request ID, staff active/role, login audit, expiration policy, logout CSRF/origin.

## Responsive behavior

320 px full-width controls/card; tablet/desktop compact max-width; no public footer/sticky actions; password managers/autofill supported; keyboard must not cover submit/errors.

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

Tiny route bundle; one session check; prevent repeated submit; no redirect/request loop.

## Security, privacy, and audit

No account enumeration, password logging, or token storage. Backend rate limit. Focus error summary. Audit safe success/failure metadata.

## Implementation sequence

Split auth/protected layouts; session provider; remove localStorage; bootstrap/redirect; states/accessibility; verify cookie flags.

## Acceptance criteria

Fake localStorage cannot enter admin; valid cookie works without localStorage; expired/revoked redirects; authenticated login redirect; no public chrome.

## Required tests

Valid/invalid/inactive, rate limit, expired session, protected direct access, CSRF/origin, keyboard/password manager, cookie config.

## Dependencies/risks

Depends on cookie-only admin session, responsive shell, typed pagination, backend authorization, and audit logging.
