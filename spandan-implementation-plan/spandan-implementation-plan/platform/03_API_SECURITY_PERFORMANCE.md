# API, Security, Data, and Performance

## API client

Refactor the single `frontend/src/lib/api.ts`: typed responses, `AbortSignal`, timeout, normalized errors, automatic credentials, centralized 401 handling, pagination metadata, request IDs, and safe retries only for reads or idempotency-keyed mutations. Never cache authenticated/patient responses in a shared browser cache.

## Authentication

Use HttpOnly, Secure (production), SameSite cookie; `/auth/me` bootstrap; no localStorage/sessionStorage token; route-level session guard; backend role/capability checks. Protect cookie-authenticated mutations with CSRF/origin strategy. Reauthenticate high-risk finance/settings actions if required.

## Public abuse controls

- enquiry: endpoint rate limit, origin/CSRF, duplicate suppression;
- holds: IP + normalized-phone limit, short TTL;
- booking/order/payment: idempotency key;
- receipt email: rate limit/cooldown;
- webhooks: provider signature, replay protection, safe raw-body handling.

Use CAPTCHA only if measured abuse justifies it.

## Data minimization

Appointment reservation should normally require name, normalized phone, doctor, date/time, age/DOB only if needed, guardian for minors, optional receipt email, brief visit category, and consent/policy version. Remove address/PIN/ABHA/Aadhaar unless a documented purpose, secure schema, access policy, retention schedule, and approval exist. Never concatenate identifiers into `reception_notes`.

## Admin list performance

Every list requires server filter/search/sort/pagination. Default page size 25; max 50. Validate indexes for appointment date/doctor/status, payment status/date/transaction, order status/date/phone/reference, notification status/channel/date, lead status/date/phone/name, overrides doctor/date, and package publish state.

Fix package N+1 via join/aggregation or two batched queries.

## Dashboard

One endpoint should return clinic date, metrics, today queue, action alerts, payment/notification failures, and follow-up counts using SQL filtered aggregates and limited rows. Do not download 100 orders/payments to count them.

## Calendar

One calendar-view read per doctor/range; one transactional batch override write; validate conflicts; return created/updated/skipped/conflicted results; invalidate public availability.

## Public caching

After removing static export: revalidate/tag doctors/packages/articles/settings; stale fallback for YouTube; no static cache for availability/payment/admin; CDN for immutable media.

## Release performance targets (to measure, not current claims)

Public p75 mobile: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.10. API p95 targets: public content <400 ms, availability <800 ms, dashboard <600 ms, paginated admin list <700 ms, non-provider mutation <900 ms. First useful warm admin data target ≤1.5 s.

## Payment integrity

Server amount only; one linked entity; idempotent create; return URL never proves success; webhook/provider state authoritative; event history; pending recovery; immutable/versioned receipt; no refund UI before provider/backend/policy/RBAC exist.

## Logging

Log request ID, route, code, duration, staff ID/entity ID where appropriate. Do not log medical reason, identity numbers, passwords/tokens, full provider payload, or routine full phone/email.

## Deployment

Secret store, separate environments, CSP/HSTS/security headers, controlled migrations, backups/restore drill, dependency/secret scanning, production-like load test.
