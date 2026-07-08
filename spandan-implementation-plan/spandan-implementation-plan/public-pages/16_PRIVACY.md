# Privacy Page Plan

**Route:** `/privacy`  
**Current files:** `frontend/src/app/privacy/page.tsx`  
**Complexity:** L  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Accurately describe actual data collection, purposes, recipients, retention, security, rights, and contact process.

## Current findings

- Current copy says sensitive data is not collected while booking collects visit reason/identifiers.
- Exact security/TLS claims may be unverifiable.
- Privacy contact appears to contain placeholder data.
- Retention, processors, payment/notification/logs/backups, children, and rights workflow are incomplete.
- Cookie statements must match implementation.

## Target page structure

Controller identity; data by workflow; purpose/basis; mandatory/optional; processors; retention; honest security; cookies/storage; rights/request method; children/guardian; cross-border if relevant; version/effective date; complaint/contact.

## Component/refactor plan

Keep route; version legal document; link form consent to exact version; TOC. Do not make unreviewed free-form admin editing.

## Data/API/backend plan

Complete internal data inventory first. Persist consent/policy version and rights/deletion audit. Processor register stays internal. Remove unnecessary fields before final legal copy.


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

Static server content; long cache; invalidate on publication.

## Accessibility, privacy, and trust

Plain-language summary + detail; usable contact; no compliance/security overstatement.

## SEO and analytics

Canonical; effective date visible; legal page can be indexed.

## Implementation sequence

Data-flow inventory; remove unnecessary fields; legal review; version policy/consent; replace copy/contact; align consent/analytics; release checklist.

## Acceptance criteria

Every field maps to purpose; processors covered; no unverifiable guarantee; real contact; consent references published version.

## Required tests

Anchors/links, version snapshot, consent integration, processor/cookie checklist, reading order.

## Dependencies/risks

Requires legal/privacy counsel and accurate production data-flow inventory.
