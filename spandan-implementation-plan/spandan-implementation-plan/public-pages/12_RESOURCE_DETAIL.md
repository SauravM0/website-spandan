# Health Resource Detail Plan

**Route:** `/health-resources/[slug]`  
**Current files:** `frontend/src/app/health-resources/[slug]/page.tsx`  
**Complexity:** L  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Render medically reviewed educational content safely, readably, transparently, and with relevant consultation routes.

## Current findings

- `body_md` is displayed as plain pre-wrapped text.
- A naive future Markdown renderer could create XSS.
- No author/reviewer/review-date block, TOC, references, or related content.
- Date locale is not explicit.
- Static slug generation can become stale.

## Target page structure

Breadcrumb; title/category/language/author/reviewer/review date/read time; concise disclaimer; approved media/video; safe article + TOC; references; urgent-care content only if reviewed; related resource/specialist; booking/contact; version date.

## Component/refactor plan

Keep route. Add server-side allow-listed/sanitized Markdown pipeline, heading IDs, safe links, responsive tables, `ArticleMeta`, TOC, RelatedResources. Refactor existing disclaimer/embed.

## Data/API/backend plan

Detail DTO adds review/version/reference/language/related/publish fields. Only approved version public; internal revision history retained. Missing/withdrawn uses true 404.


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

Server-render sanitized HTML; no client Markdown parser; lazy/consent third-party video; 55–75 character reading width.

## Accessibility, privacy, and trust

Correct heading hierarchy; labelled table overflow; safe external-link behavior; video title/transcript; no personalized medical advice.

## SEO and analytics

MedicalWebPage/Article with author/reviewer/dateModified, breadcrumb/canonical/OG, visible references.

## Implementation sequence

Select renderer/sanitizer; add review/version fields; migrate content; metadata/TOC/references; privacy video; remove pre-wrap; XSS tests.

## Acceptance criteria

Markdown works; scripts/events removed; reviewer/date visible; withdrawn 404; readable at 320/200% zoom.

## Required tests

XSS fixtures, Markdown snapshots, TOC anchors, JSON-LD, withdrawn article, video consent, mobile table.

## Dependencies/risks

Requires medical review workflow and deliberate sanitization library selection.
