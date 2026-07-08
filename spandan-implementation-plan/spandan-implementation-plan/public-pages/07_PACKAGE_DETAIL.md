# Package Detail Page Plan

**Route:** `/packages/[slug]`  
**Current files:** `frontend/src/app/packages/[slug]/page.tsx` plus existing package components  
**Complexity:** L  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Accurately explain one package and enable a price-consistent booking without applying generic preparation rules incorrectly.

## Current findings

- Category inferred from slug/name.
- Generic 8–10 hour fasting text may not apply to all packages.
- Test list lacks meaningful grouping.
- Static slug freshness risk.
- Local fixed mobile CTA can conflict with global sticky CTA.
- Booking/enquiry actions compete.

## Target page structure

Breadcrumb/category; title/current price/Book; suitability and exclusions; grouped services/tests; package-specific preparation; visit duration/process; report/follow-up expectations if verified; policy summary; related doctor/resource; secondary enquiry.

## Component/refactor plan

Keep `TestListCard`, `PrepInstructions`, `SpecialityBadge` after typed refactor. Remove text inference. Add desktop sticky purchase summary and one coordinated mobile action. Checkout always refetches current package.

## Data/API/backend plan

Explicit category, suitability/exclusions, grouped tests, package-specific prep, duration/process, report/follow-up, current price/offer validity, bookable reason, policy version, related content, reviewed date.


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

Server render/tag invalidation; CSS sticky rather than scroll listener; load only relevant decorative code; no full catalog fetch.

## Accessibility, privacy, and trust

Semantic grouped lists; safe-area action; no guaranteed diagnosis/outcome; reviewed preparation.

## SEO and analytics

Breadcrumb/canonical; Product/Offer only when current; visible FAQ only; anonymous CTA tracking.

## Implementation sequence

Add fields/migrate; remove inference; refactor header/summary; group tests; replace generic prep; coordinate mobile CTA; connect policies; test price/bookability.

## Acceptance criteria

Detail/checkout price consistent after refetch; non-bookable disabled with reason; prep is package-specific; no double sticky bar; missing/unpublished true 404.

## Required tests

Price/bookability, prep snapshot, preselection, 404, sticky collision, heading/list accessibility.

## Dependencies/risks

Depends on platform architecture, verified content, typed contracts, and responsive primitives.
