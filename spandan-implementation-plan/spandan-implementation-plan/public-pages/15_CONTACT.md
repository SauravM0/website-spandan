# Contact Page Plan

**Route:** `/contact`  
**Current files:** `frontend/src/app/contact/page.tsx` and `EnquiryForm`  
**Complexity:** M  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Give the fastest correct route to call, WhatsApp, directions, appointment, package, or general enquiry with clear emergency/SLA expectations.

## Current findings

- Contact facts and timings are duplicated.
- Enquiry and confirmed booking can be confused.
- Map can add third-party privacy/performance cost.
- Response SLA and privacy of free-text message require alignment.
- No clear emergency guidance.

## Target page structure

Direct actions; verified address/hours; choice guidance; minimal enquiry form; lazy map; parking/accessibility; emergency note; verified response-hours statement.

## Component/refactor plan

Keep route and refactor `EnquiryForm` with typed page config. Use shared contact actions and public settings. One map/address source.

## Data/API/backend plan

Enquiry normalizes phone, persists type/source/language/consent version, limits sensitive free text, suppresses duplicates, returns safe reference, applies rate/origin/CSRF. SLA only from verified config.


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

Server contact facts; lazy map; minimal form JS; no default chat SDK.

## Accessibility, privacy, and trust

Descriptive direct links; error summary; emergency visible; normalized WhatsApp; warn not to send emergencies/sensitive reports.

## SEO and analytics

Clinic data from settings; canonical; no form-content analytics.

## Implementation sequence

Verify settings; refactor actions/form; emergency/response copy; lazy map; duplicate/rate control; privacy alignment; link tests.

## Acceptance criteria

Contact facts match footer/schema/receipt; safe enquiry reference; no false SLA; map failure leaves directions; 320 px keyboard.

## Required tests

Settings consistency, call/WhatsApp, duplicate/rate, form accessibility, map failure, analytics privacy.

## Dependencies/risks

Depends on platform architecture, verified content, typed contracts, and responsive primitives.
