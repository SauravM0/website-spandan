# Packages List Page Plan

**Route:** `/packages`  
**Current files:** `frontend/src/app/packages/page.tsx`  
**Complexity:** M  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Help patients compare active packages by suitability, included value, preparation, and authoritative current price.

## Current findings

- Price is not prominent enough.
- No explicit category/suitability/bookable model.
- Static-export freshness risk.
- Descriptions can become inconsistent/long.
- Expired discounts and inactive packages need server rules.

## Target page structure

Responsible package explanation; category filters only if catalog warrants; cards with suitability, 3–5 key inclusions, current price, valid original price/discount, prep indicator, detail/book; help choosing; policy links.

## Component/refactor plan

Refactor shared `PackageCard` with home/list variants. One money formatter. Use URL filters only when needed. Preserve `/book-package?package=<id>`.

## Data/API/backend plan

Summary DTO: id, slug, name, category, suitability, key inclusions, base/current price, offer validity, preparation required, published/bookable, order, reviewed date. Server determines price and excludes inactive/unpublished.


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

Server render/tag cache; no full test list in card payload; minimal filter JS.

## Accessibility, privacy, and trust

Currency labels; discount not colour-only; no misleading urgency; explain clinical suitability limits.

## SEO and analytics

Canonical filtered URLs; Product/Offer only if accurate/appropriate; anonymous CTA analytics.

## Implementation sequence

Define DTO/flags; improve price/suitability; shared card; optional filters; policies; invalidation; inactive/expired tests.

## Acceptance criteria

Card and checkout price consistent; inactive cannot book; expired discount hidden; filters shareable if present; 320 px actions fit.

## Required tests

Price integration, active/published filter, expiry, preselection E2E, responsive card, structured data if used.

## Dependencies/risks

Depends on platform architecture, verified content, typed contracts, and responsive primitives.
