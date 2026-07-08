# Package Booking Plan

**Route:** `/book-package`  
**Current files:** `frontend/src/app/book-package/page.tsx` (~300 lines)  
**Complexity:** L  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Create a multi-patient package checkout with server-authoritative totals, correct age/date validation, and recoverable payment.

## Current findings

- Browser review can show stale totals although backend recalculates.
- Truthiness validation can reject age zero.
- Address/PIN required without demonstrated need.
- No explicit server quote or price-change acknowledgement.
- Item limit guidance appears late.
- Consent/policy version unclear.
- UTC date helper and no payment recovery.

## Target page structure

Package selection; buyer contact; numbered patient/package items; preferred date clearly marked request unless truly scheduled; server quote/review; preparation/policy acknowledgement; idempotent order/payment; recovery.

## Component/refactor plan

Decompose into BuyerContact, OrderItemsEditor, PatientPackageCard, OrderQuote, Review, reducer/schema, shared payment initiation. Keep one `/book-package` route and one money formatter.

## Data/API/backend plan

Catalog returns active/bookable current-price packages. Add quote operation. Server validates items/quantity/patient/date/package state; stores authoritative item snapshot and policy version; idempotent order/payment; safe recovery reference. Remove address unless legally/operationally required.


## Responsive contract

- **Phone:** buyer/contact then one numbered patient/package card at a time; full-width Add action; compact sticky total with expandable detail; stacked review.
- **Tablet:** two-column fields within each patient card; persistent summary after first viewport.
- **Desktop:** form left, authoritative order summary right; no spreadsheet-like touch-unfriendly grid.
- Test age 0, maximum items, removed package, price change, payment recovery, 320/390/768/1280 px.


## State handling

- Server-render or show layout-stable skeleton; never a blank content area.
- Distinguish no data, unpublished/unavailable data, filter-empty, network failure, and validation failure.
- Keep safe existing data visible during retry when appropriate.
- Prices, availability, payment state, clinic policy, and credentials must never use stale fallback as authority.
- Every API error should map a stable error code and request/support reference.

## Performance

Small catalog cache; quote only on review/change; cancel stale quote; detail/order history not loaded; no repeated full catalog requests.

## Accessibility, privacy, and trust

Explicit guardian rules; currency labels; no colour-only discount; no long-term browser storage; no health/identity analytics.

## SEO and analytics

Noindex checkout; only package ID in query; no patient data URL; anonymous stages.

## Implementation sequence

Quote/snapshot contract; age/date fixes; remove unjustified fields; decompose; price-change acknowledgement; policy version; idempotency/recovery; multi-patient E2E.

## Acceptance criteria

Age zero valid when allowed; displayed/stored/payment total match; price change forces review; limits shown; no duplicate order; pending order resumes; preferred date not falsely confirmed.

## Required tests

Age zero, max items/quantity, deactivation, price change, multi-patient, idempotency, payment recovery, phone add/edit/remove, form accessibility.

## Dependencies/risks

Requires server quote/idempotency and verified package scheduling/policy.
