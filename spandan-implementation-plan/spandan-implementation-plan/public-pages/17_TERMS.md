# Terms, Payment, Cancellation, and Refund Plan

**Route:** `/terms`  
**Current files:** `frontend/src/app/terms/page.tsx`  
**Complexity:** L  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Publish operationally accurate appointment/package/payment/cancellation/refund/no-show/rescheduling/receipt terms that match backend capability.

## Current findings

- Footer links reference payment/refund anchors not clearly present.
- Terms are not versioned.
- Published actions may not match admin/provider capability.
- Clinic policy needs operational and legal approval.

## Target page structure

Scope/definitions; holds/appointments; fees/payment; reschedule/cancel/no-show; package preparation; refund eligibility/process/timeline; payment failure/duplicate debit; receipts; medical/emergency disclaimer; content use; approved limitations; contact/dispute; version/effective date. Stable IDs: payments, cancellations, refunds, packages, contact.

## Component/refactor plan

Keep route; legal TOC; exact policy-version acknowledgement in checkouts. Do not add refund UI until complete backend/provider/RBAC workflow.

## Data/API/backend plan

Store policy version with bookings/orders where required. Backend errors/status copy must align with hold expiry, pending, duplicate, cutoff, refund. If refunds are manual, state that.


## Responsive contract

- **320–479 px:** one column, 16 px gutters, 44 px controls, no horizontal overflow, fixed actions above safe area.
- **480–767 px:** wider single column; pair fields only when labels and errors remain readable.
- **768–1023 px:** two columns where task flow benefits; filters/actions may wrap.
- **1024–1279 px:** full desktop composition with constrained reading width.
- **1280 px+:** use whitespace rather than stretching paragraphs/cards.
- Test Marathi/Hindi expansion, 200% zoom, landscape phone, keyboard-open forms, slow network, and image failure.


## State handling

- Server-render or show layout-stable skeleton; never a blank content area.
- Distinguish no data, unpublished/unavailable data, filter-empty, network failure, and validation failure.
- Keep safe existing data visible during retry when appropriate.
- Prices, availability, payment state, clinic policy, and credentials must never use stale fallback as authority.
- Every API error should map a stable error code and request/support reference.

## Performance

Static server content; stable anchors; minimal/no JS.

## Accessibility, privacy, and trust

Plain-language summary; material financial terms visible; keyboard anchors; no unlawful/conflicting clauses.

## SEO and analytics

Canonical/effective date; all footer/checkout links resolve.

## Implementation sequence

Confirm operations/provider; legal review; version/anchors; update links; persist acknowledgement; workflow-copy tests.

## Acceptance criteria

All links land correctly; policy matches capability; version visible; records retain required version.

## Required tests

Anchor/link, policy version, content snapshot, checkout acknowledgement, reading order.

## Dependencies/risks

Requires operational and legal approval.
