# Delivery Roadmap

## Phase 0 — Baseline and verification

Clean branch, secret review, reproducible staging, screenshots/Lighthouse/API baseline, verify clinic/doctor/package/contact/policy facts, inventory approved media/testimonials, define admin roles/status transitions.

## Phase 1 — Architecture/security

Normal Next server deployment, public/admin shells, layout-level admin guard, cookie-only session, typed API errors, timezone utilities, settings source, privacy-safe logging, pagination contract, transition validation, CSRF/origin controls.

## Phase 2 — Responsive system

Tokens, typography, public header/drawer/footer/actions, admin sidebar/drawer/data primitives, skeleton/error states, media pipeline, visual regression.

## Phase 3 — Operational/revenue workflows

Appointment booking → payment confirmation → admin calendar → appointments → package booking → orders → payments/notifications. These carry scheduling/money risk and precede visual marketing work.

## Phase 4 — Public trust pages

Home, doctors, packages, facilities, about, contact, resources/videos/tools. Verified content only.

## Phase 5 — Admin CRM/content

Dashboard aggregation, leads, package editor, audit/RBAC, remove `/admin/operations`.

## Phase 6 — Legal/accessibility/hardening

Privacy/terms, retention/deletion, manual accessibility audit, load/concurrency tests, backup restore, monitoring/runbook, staged rollout.

## Complexity convention

- S: focused refactor, often 1–3 engineering days after dependencies.
- M: multi-component/API work, often 3–7 days.
- L: end-to-end workflow, often 1–3 weeks.

These are planning ranges, not promises; real effort depends on production data, hosting, payment-provider behavior, and validated requirements.
