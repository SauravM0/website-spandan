# Spandan Release Runbook

This runbook is the production gate for clinic, payment, and admin releases. A green build is required, but it is not sufficient by itself.

## Automated Gate

Run before every release candidate:

```bash
npm run release:check
```

Run the full gate when registry access is available:

```bash
npm run release:check:full
```

The automated gate covers migration validation, backend typecheck/tests/build, and frontend build. The full gate also runs dependency audits.

Track audit findings before release:

```bash
npm run audit:findings
```

Any open P0 requires release-owner approval, rollback/repair notes, and a named owner before production deployment.

## Manual Test Matrix

- Booking: doctor -> slot -> hold -> appointment -> payment -> confirmation.
- Packages: package detail -> multi-patient order -> quote -> payment recovery.
- Enquiry: public enquiry -> admin lead list filter/search -> detail status/note history.
- Admin: login, session expiry, dashboard, calendar closure, appointment status, package edit, payments search/export/recheck, notifications retry/manual follow-up.
- Responsive: 320, 390, 768, 1024, 1280, and 1440 px for public pages, checkout, admin dashboard, calendar, table/card modes, empty states, and error states.
- Language and zoom: Marathi/Hindi layout, 200% zoom, keyboard-only flows, reduced motion.

## Accessibility Gate

- Keyboard access works for booking, payment, admin dialogs, drawers, filters, status updates, and retry actions.
- Focus is visible and does not get trapped outside active modals/drawers.
- Status changes are conveyed by text, not color alone.
- Manual screen-reader smoke test covers booking, payment confirmation, admin calendar, payments, notifications, and leads.

## Observability Gate

Confirm these are available in the deployed environment:

- Frontend release version, route, safe error code/request ID, and Web Vitals.
- No analytics payload includes names, phones, medical content, identifiers, or payment query values.
- Backend latency/errors, DB query time, pool pressure, hold conflicts, booking conversion, pending/failed payments, webhook failures, receipt failures, notification backlog, and admin list duration.
- Alerts for sustained 5xx, DB pool pressure, webhook or receipt failure, notification backlog, and calendar/public slot mismatch.

## Deployment Order

1. Apply additive database migrations.
2. Deploy backward-compatible backend.
3. Deploy frontend that reads new fields with fallback.
4. Observe logs, metrics, payments, webhooks, and notification backlog.
5. Schedule cleanup migrations only after old-client compatibility is no longer needed.

## Rollback Rules

- Record previous backend and frontend image/build identifiers before release.
- Do not roll back a write migration if it would discard accepted production data.
- Keep payment and webhook compatibility during rollback.
- If a data repair is needed, create a reviewed repair script and record owner, timestamp, input set, and expected output.
- Confirm feature flags or fallback paths before frontend rollback.

## Production Sign-off

- Clinic content verified.
- Legal/privacy approval complete.
- Media consent verified.
- Admin roles and capabilities reviewed.
- Backups verified and restore procedure known.
- Secrets present only in deployment secret storage.
- Payment/webhook test completed.
- Accessibility and responsive matrix completed.
- Monitoring and support runbook owner assigned.
- Release owner and rollback owner named.
- Audit register reviewed and all P0 findings are mitigated or explicitly approved for staged rollout.
