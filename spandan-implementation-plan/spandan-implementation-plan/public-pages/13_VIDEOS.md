# Videos Page Plan

**Route:** `/videos`  
**Current files:** `frontend/src/app/videos/page.tsx`, `VideoCard`, backend YouTube service  
**Complexity:** M  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Provide a fast, privacy-conscious educational video library that survives YouTube API quota/network failure.

## Current findings

- Feed freshness tied to current build/cache behavior.
- No topic/language/duration filters or transcript metadata.
- Third-party thumbnails/embeds add tracking/latency.
- Empty/upstream failure state is generic.

## Target page structure

Disclaimer; featured/latest reviewed video; populated topic/language filters; cards with duration/language/date/review status; pagination; channel link; related articles/tools.

## Component/refactor plan

Keep/refactor `VideoCard`. Render lightweight thumbnail cards; privacy-enhanced embed only after interaction in accessible dialog/page. Reuse resource filter pattern; no static duplicate arrays.

## Data/API/backend plan

Backend caches normalized approved-channel feed, serves stale cache on upstream failure, returns last sync and editorial category/language. Do not call YouTube per frontend render.


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

No iframe in initial grid; lazy thumbnails; pagination; stale fallback; avoid autoplay.

## Accessibility, privacy, and trust

Descriptive card links, duration text, dialog focus restore, caption/transcript status only when known.

## SEO and analytics

VideoObject only with valid metadata; canonical/pagination; do not claim review without record.

## Implementation sequence

Normalize/cache service; editorial metadata; privacy playback; filters/pagination; stale/empty states; keyboard/no-iframe tests.

## Acceptance criteria

Cached content during outage; no initial iframe; shareable filters; no fabricated captions/review; no CLS.

## Required tests

Upstream failure/stale cache, filter/page, embed keyboard/consent, image fallback, structured data, no autoplay/initial iframe.

## Dependencies/risks

Depends on platform architecture, verified content, typed contracts, and responsive primitives.
