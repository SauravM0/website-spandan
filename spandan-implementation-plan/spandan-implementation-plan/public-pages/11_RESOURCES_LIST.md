# Health Resources List Plan

**Route:** `/health-resources`  
**Current files:** `frontend/src/app/health-resources/page.tsx` and `ResourceHub`  
**Complexity:** M  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Help patients discover reviewed education by topic/language/format while distinguishing education from personal advice.

## Current findings

- Summary contract lacks reviewer/review date/read time/language governance.
- Mutable content freshness depends on static export.
- Search/filter URL and accessibility behavior need definition.
- No visible outdated/withdrawn content process.

## Target page structure

Education disclaimer; featured reviewed resource; populated topic filters; server search when catalog grows; cards with author/reviewer/review date/format/language/read time; links to videos/tools; contact/booking for personal advice.

## Component/refactor plan

Keep/refactor `ResourceHub` with typed server input and URL state. One shared `ResourceCard`; no duplicated gallery/list arrays. Initial result server-rendered; small client filter island.

## Data/API/backend plan

Article summary: slug/title/excerpt/category/language/author/reviewer/review/publish/update dates/read time/image/published/related doctor. Paginate/search server-side when needed; article tag invalidation; withdrawn/unpublished excluded.


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

Server-render initial list; no bodies; responsive images; debounced cancellable search; minimal filtering JS.

## Accessibility, privacy, and trust

Filter state text and keyboard behavior; distinguish reviewed versus published date; do not send health search terms to third-party analytics.

## SEO and analytics

CollectionPage/ItemList; canonical filters; crawlable links; no thin empty-filter indexing.

## Implementation sequence

Add review metadata/governance; type ResourceHub; URL filters/search; language/format; invalidation; empty/stale tests.

## Acceptance criteria

Unpublished/withdrawn absent; review metadata visible; filters shareable/keyboard; no search-term analytics; useful without hydration.

## Required tests

Publish/filter, URL state, no-JS, search cancellation, controls accessibility, withdrawn content.

## Dependencies/risks

Depends on platform architecture, verified content, typed contracts, and responsive primitives.
