# WP14 — Sole-administrator authentication hardening

Status: implemented and locally verified. Authenticator enrollment and recovery evidence must be completed by the sole administrator in staging before production promotion.

## Login and MFA

Password verification now creates a five-minute, context-bound challenge rather than a session. The sole active administrator must complete TOTP enrollment or a normal TOTP challenge before an eight-hour session is issued. The encrypted seed uses its own versioned key; eight one-time recovery codes are displayed once and only salted user-bound hashes are stored. Successful TOTP counters cannot be replayed.

Account and IP failure counters live in PostgreSQL, so throttling is consistent across API replicas. Progressive blocks start after five failures and increase at eight and ten failures. The existing process limiter remains as a coarse additional boundary.

## Sessions and sensitive actions

Sessions expire after 30 minutes of inactivity and have an eight-hour absolute ceiling. Authentication checks the database on every request, so logout, password change, or manual revocation takes effect on the next request and meets the five-second objective. The administrator can list and revoke their own sessions; provider-derived IP and user-agent hashes are not returned.

Refunds, sensitive exports, price changes, privacy/security mutations, session revocation, and password changes require a fresh TOTP or unused recovery code. Step-up remains valid for ten minutes. Changing the password uses the current password plus step-up MFA and revokes every active session transactionally.

## Staging procedure

Set a unique `MFA_ENCRYPTION_KEY` and version in the staging secret manager. Log in with the sole administrator password, enroll the authenticator, save the recovery codes offline, then verify login, invalid-code throttling, recovery-code one-time use, idle expiry, absolute expiry, session revocation, password-change logout, and every protected action. Record privacy-safe screenshots, request IDs, status codes, and timings; never record the TOTP seed, recovery codes, password, cookie, or JWT.

Production promotion is blocked until enrollment ownership and recovery-code custody are recorded. Losing both the authenticator and recovery codes requires a controlled database recovery runbook with identity verification and audit evidence; there is deliberately no public MFA-reset endpoint.
