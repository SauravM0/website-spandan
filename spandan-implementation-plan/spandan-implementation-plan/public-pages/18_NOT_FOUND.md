# Not-Found and Route Recovery Plan

**Route:** `global not-found`  
**Current files:** `frontend/src/app/not-found.tsx`  
**Complexity:** S  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Return a true 404 and guide users to valid booking, doctor, package, or contact tasks without exposing internal errors.

## Current findings

- Dynamic pages currently can render a “not found” section instead of framework 404.
- Generic Home-only recovery is insufficient.
- Payment recovery must not fall into generic 404.
- Broken path monitoring is needed.

## Target page structure

Clear missing/unavailable message; Book, Doctors, Packages, Contact; safe context suggestions; call/WhatsApp; no stack details.

## Component/refactor plan

Keep one global page. Dynamic pages call `notFound()`. Payment uses its own status/recovery UI.

## Data/API/backend plan

No blocking API. Optional popular links from safe settings only.


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

Tiny server-rendered page.

## Accessibility, privacy, and trust

H1 focus after navigation where appropriate; clear links; no jargon.

## SEO and analytics

True HTTP 404/noindex; log route category without query secrets.

## Implementation sequence

Replace 200 missing states with `notFound()`; improve recovery; monitor paths; fix internal links.

## Acceptance criteria

Missing slug is HTTP 404; valid task one click away; no payment/identity query logged.

## Required tests

HTTP status, dynamic missing slug, keyboard, broken-link crawl, 320 px visual.

## Dependencies/risks

Depends on platform architecture, verified content, typed contracts, and responsive primitives.
