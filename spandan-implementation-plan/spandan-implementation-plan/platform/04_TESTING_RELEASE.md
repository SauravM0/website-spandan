# Testing, Observability, and Release

## Unit tests

Clinic date/time boundaries, booking reducer, hold timer, price mapping, status transitions, filters/query serialization, role capabilities, validation, package age zero, Markdown sanitization, calculators.

## Backend integration tests

Concurrent hold, expired hold, appointment after hold, idempotent booking/order/payment, server fee/total, unauthorized/forbidden actions, transition rules, calendar batch rollback, webhook replay, receipt generation, notification retry limits, pagination, India “today” boundaries.

## End-to-end tests

- doctor → slot → hold → appointment → payment → confirmation;
- package detail → multi-patient order → quote → payment;
- refresh and payment recovery;
- enquiry;
- admin login/session expiry;
- calendar closure removes public slot;
- appointment status;
- payment/notification search/export/retry;
- lead history/status;
- package edit invalidates public page;
- Marathi layout;
- 320/390 px completion.

## Accessibility

Automated axe plus keyboard and manual screen-reader tests for booking, payment, admin calendar, dialogs, and status updates. Test 200% zoom and reduced motion.

## Visual regression

390, 768, 1280, 1440 px for public shell, home, doctor/package detail, checkout steps, admin shell, dashboard, calendar views, table/card modes, empty/error states.

## Observability

Frontend: release version, route, safe error code/request ID, Web Vitals, anonymous funnel stage. Never send names, phone, medical content, identifiers, or payment query values.

Backend metrics: latency/errors/query time/pool pressure, hold conflicts, booking conversion, pending/failure payments, webhook failures, notification backlog, dashboard/list duration. Alert on sustained 5xx, DB pool pressure, webhook/receipt failure, backlog, and calendar/public mismatch.

## Deployment order

1. additive DB migration;
2. backward-compatible backend;
3. frontend reads new fields with fallback;
4. frontend cutover;
5. observe;
6. later cleanup migration/code deletion.

## Rollback

Record previous image, migration reversibility, feature flag, payment/webhook compatibility, old-client compatibility, and repair procedure. Do not roll back a write migration if it would discard accepted production data.

## Production gate

Verified clinic content, legal approval, media consent, roles, backups, secrets, payment/webhook test, responsive matrix, accessibility, performance/query plan, monitoring, support runbook, release/rollback owner.
