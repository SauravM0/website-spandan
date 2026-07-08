# Health Tools Page Plan

**Route:** `/tools`  
**Current files:** `frontend/src/app/tools/page.tsx` and large `MedicalCalculators.tsx`  
**Complexity:** M  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Offer reviewed educational calculators with correct units, transparent limits, no diagnosis, and no persistence/transmission of inputs.

## Current findings

- Multiple calculators couple formula, thresholds, validation, copy, and UI in one component.
- Result wording can be mistaken for diagnosis.
- Formula/threshold provenance and review date need governance.
- No explicit no-storage/no-analytics guarantee for values.

## Target page structure

Tool index; one active calculator; labelled inputs/units; result with calculation explanation/source/version; non-diagnostic disclaimer; relevant resource/consultation.

## Component/refactor plan

Keep `/tools`. Split internally into pure functions, calculator modules, registry, shared form/result shell. Separate thresholds/content from UI. Do not create separate routes unless later SEO/product evidence justifies.

## Data/API/backend plan

Normally no API. Maintain formula/source/units/range/categories/review date per tool. Never send values/results to server or analytics by default.


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

Lazy-load inactive calculators only if bundle measurement justifies; avoid chart library for simple ranges.

## Accessibility, privacy, and trust

Labels/units/range errors/result announcement; keyboard/numeric inputs; no colour-only result; no diagnosis/guarantee; no local storage.

## SEO and analytics

Index educational page; values/results not in query; analytics only tool opened/completed, never values/result category.

## Implementation sequence

Extract/test functions; clinical review; registry/shell; validation/accessibility; no-value analytics/storage; measure bundle split.

## Acceptance criteria

Boundary outputs correct; invalid values blocked; no values in URL/storage/log/network/analytics; educational wording; 320 px/keyboard.

## Required tests

Formula boundaries, conversion, invalid input, no-storage/network, live announcement, phone visual.

## Dependencies/risks

Clinical formula/threshold/source review is required.
