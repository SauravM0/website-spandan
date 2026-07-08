# Appointment Booking Plan

**Route:** `/book-appointment`  
**Current files:** `frontend/src/app/book-appointment/page.tsx` (500+ lines)  
**Complexity:** L  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Deliver a low-friction, concurrency-safe, timezone-correct, recoverable appointment and payment workflow.

## Current findings

- One component mixes UI, validation, date logic, API orchestration, hold, booking, and payment.
- UTC date helpers can shift India calendar date.
- Frontend fee is hard-coded independently.
- ABHA/Aadhaar and other fields are appended to notes.
- Some submitted fields are not clearly persisted by backend schema.
- Consent version/timestamp is unclear.
- Payment-create failure can strand awaiting-payment appointment.
- No explicit state machine or privacy-safe recovery.

## Target page structure

1. Choose appointment type/doctor/date/server slot.
2. Patient/contact: minimum necessary fields and guardian conditionally.
3. Brief visit information and explicit policy/consent version.
4. Server quote + active hold countdown + edit links.
5. Idempotent payment and confirmation/recovery.
Remove address/PIN/ABHA/Aadhaar unless a separately approved purpose/security design exists.

## Component/refactor plan

Decompose inside the route into step components, `bookingReducer`, validation, `HoldTimer`, and `BookingSummary`. States: selecting, validating, holding, hold_active, creating_appointment, creating_payment, redirecting, recoverable_error. Use shared clinic date utilities. Do not store sensitive draft data in browser persistence.

## Data/API/backend plan

Public config/quote returns clinic time/timezone, horizon, notice, hold duration, fee, policy/consent version. Hold is transactional, normalized-phone limited, expiring, idempotent. Appointment requires valid hold and explicitly persists appointment type/consent version. Payment uses server amount and idempotency. Provide safe recovery reference. Stable errors: slot unavailable, hold expired, payment exists, booking window changed.


## Responsive contract

- **Phone:** one task group at a time; compact current-step indicator; full-width doctor/slot controls; 1–2 slot columns only if 44 px targets fit; sticky Continue/Pay above safe area; stacked review.
- **Tablet:** calendar/slots may split; compact sticky selection summary.
- **Desktop:** form left and authoritative summary right.
- Test midnight IST, expired hold, refresh, back navigation, slow payment, keyboard-open fields, 320/390/768/1280 px.


## State handling

- Server-render or show layout-stable skeleton; never a blank content area.
- Distinguish no data, unpublished/unavailable data, filter-empty, network failure, and validation failure.
- Keep safe existing data visible during retry when appropriate.
- Prices, availability, payment state, clinic policy, and credentials must never use stale fallback as authority.
- Every API error should map a stable error code and request/support reference.

## Performance

Load doctors/config first; fetch availability by selected doctor/range; cancel stale requests; cache safe doctor/config data; no full-page spinner; prefetch payment route only after valid review.

## Accessibility, privacy, and trust

Field-linked errors + summary; keyboard date/slots; consent never prechecked; emergency disclaimer; normalized phone; no identity numbers or medical content in analytics/storage.

## SEO and analytics

Usually noindex checkout; no patient data in URL; anonymous funnel stages only.

## Implementation sequence

Baseline tests; add config/quote and explicit fields; remove hard-coded fee/UTC helpers/sensitive fields; build reducer/steps; idempotency/recovery; coordinate confirmation; delete old handlers; concurrency/responsive E2E.

## Acceptance criteria

No double booking; India date stable end to end; displayed fee equals payment; expired hold recovers; refresh during payment recovers; double-click creates no duplicate; no identity numbers in notes/storage; keyboard/320 px completion.

## Required tests

Timezone boundaries, concurrent hold, expiry, idempotency, fee mismatch, schema rejection, minor/guardian, payment failure/retry, back/edit, responsive E2E, analytics payload privacy.

## Dependencies/risks

Requires backend quote/idempotency/recovery and verified booking policy; release with payment confirmation changes.
