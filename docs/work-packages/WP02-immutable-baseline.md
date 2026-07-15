# WP02 — Immutable application baseline

## Outcome

The reviewed application shape is recorded in `docs/production-baseline.json` and enforced by `npm run baseline:check`. This baseline describes current contracts; it does not claim that every current contract is production-safe. Later work packages may intentionally replace a contract only by updating tests, migration/compatibility notes, and this manifest in the same reviewed change.

## Recorded boundaries

- Modular monolith: Next.js frontend, Express API, PostgreSQL source of truth.
- Public booking, package order, payment, admin session, and admin operations route groups.
- Booking and payment state vocabularies.
- Migration head and count.
- Production-required environment variables currently enforced by the backend.
- PhonePe and all clinical/document/device write capabilities disabled by default.

## Characterization coverage

- Public appointment creation remains validated and server-authoritative.
- Package orders continue to quote and snapshot server-side prices.
- Payment success follows the payment lifecycle policy.
- Admin login creates a revocable database session and secure HTTP-only cookie.
- Admin appointment status writes remain authenticated, permission-scoped, and transition-guarded.
- Disabled clinical and provider capabilities remain fail-closed defaults.

## Change policy

1. Never edit the baseline to make an unexplained failing check green.
2. Route/state changes require compatibility notes and characterization updates.
3. Migration additions update the count/head; historical files remain immutable after WP08 introduces checksums.
4. Feature-gate defaults may change only in their dedicated approved work package.

## Verification

- `npm run baseline:check`
- `npm run release:check`
- Clean production frontend and backend builds
- Backend characterization tests

## Rollback

Revert the Work Package 2 commit and retain the `production-baseline-2026-07-15` tag. Do not rewrite or move the tag after it is created.
