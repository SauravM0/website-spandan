# Facilities Page Plan

**Route:** `/facilities`  
**Current files:** `frontend/src/app/facilities/page.tsx`  
**Complexity:** M  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Show verified clinic environment and diagnostic facilities with real approved media, precise purpose, preparation, and visit expectations.

## Current findings

- Seven static icon cards do not prove actual equipment/facility availability.
- Environment and diagnostic devices are mixed.
- No preparation, appointment requirement, accessibility, parking, or visit information.
- No media governance.

## Target page structure

Environment gallery; diagnostic facilities grouped by category; each item’s purpose/process/preparation/booking requirement; accessibility/parking/location; booking CTA.

## Component/refactor plan

Keep route. Replace static array with typed facility/media records. Reuse one `FacilityFeature` and gallery on home preview. Avoid separate mobile/desktop arrays.

## Data/API/backend plan

Facility record: category, name, public description, preparation, booking requirement, approved media IDs/alt, active/published, order, verified date. Return only verified published records.


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

Responsive media, dimensions, lazy below fold, no autoplay, mostly server content.

## Accessibility, privacy, and trust

Keyboard gallery if interactive; useful alt text; explain clinician referral/limitations; no patient images/reports.

## SEO and analytics

Descriptive local service headings, ImageObject where appropriate, centralized clinic schema.

## Implementation sequence

Verify inventory; approved photography; media metadata; grouped content; preparation/visit guidance; relevant links; test performance.

## Acceptance criteria

Every item verified; no patient data in images; slow-network fallback; accurate versioned preparation; no CLS.

## Required tests

Publish state, alt/size audit, gallery visual/keyboard, link integrity, manual image privacy review.

## Dependencies/risks

Depends on platform architecture, verified content, typed contracts, and responsive primitives.
