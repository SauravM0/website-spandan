# About Page Plan

**Route:** `/about`  
**Current files:** `frontend/src/app/about/page.tsx`  
**Complexity:** M  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Explain clinic identity, specialist-led care model, counselling approach, and patient journey using verifiable facts rather than decorative counters.

## Current findings

- Current counters (areas/languages/packages/days) are weak trust evidence.
- Fully hard-coded content has no review governance.
- No structured explanation of cardiology/endocrinology collaboration.
- No approved media or source/review date for credentials.

## Target page structure

Clinic story; purpose and care principles; cardiology/endocrinology collaboration; patient journey; verified credentials/registrations; counselling/education approach; languages/accessibility; facility preview; booking/contact CTA.

## Component/refactor plan

Keep route/metadata. Extract only reusable `VerifiedFact`, `CareProcess`, and media blocks. Reuse doctor/facility/media DTOs instead of copying arrays.

## Data/API/backend plan

Server-load public settings, approved doctor summaries, and versioned reviewed About content. Store internal verification source/date but return only publishable fields. Unverified fields must fail publication rather than be hidden by UI markers.


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

Mostly static server HTML, minimal JS, lazy below-fold media, long cache with explicit invalidation.

## Accessibility, privacy, and trust

Semantic lists/headings; useful without icons; no guaranteed-outcome language; professional data only after approval.

## SEO and analytics

AboutPage/MedicalClinic data from verified settings; visible last-reviewed date; CTA analytics only.

## Implementation sequence

1. Verify facts.
2. Replace counters with care process/facts.
3. Connect settings/media.
4. Add doctor/facility links.
5. Add metadata.
6. remove old arrays.
7. test translation expansion.

## Acceptance criteria

All facts have internal owner/review date; no unsupported superlative; page works without client JS; CTAs correct; readable at 320 px/200% zoom.

## Required tests

Content snapshot, structured data, translation visual, keyboard/link order, image fallback, no-JS render.

## Dependencies/risks

Requires signed-off professional/clinic content.
