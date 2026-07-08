# Doctor Detail Page Plan

**Route:** `/doctors/[slug]`  
**Current files:** `frontend/src/app/doctors/[slug]/page.tsx`  
**Complexity:** L  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Publish a trustworthy structured professional profile and move suitable patients to doctor-preselected booking.

## Current findings

- Biography is one string parsed by label regexes.
- `[NEEDS CONFIRMATION]` markers are hidden at render time rather than blocked at publication.
- Static params can become stale.
- Primary consult action scrolls to enquiry instead of confirmed appointment.
- Metadata may duplicate “Dr.” depending on stored name.

## Target page structure

Profile hero; verified registration/education/role/languages; conditions commonly evaluated; care approach; availability and Book CTA; related diagnostics/packages/resources; secondary enquiry; reviewed date.

## Component/refactor plan

Replace biography parsing with structured fields. Keep route/metadata. Primary link `/book-appointment?doctor=<id>`. Reuse enquiry secondarily. Add profile JSON-LD builder.

## Data/API/backend plan

Structured detail DTO with display name, qualifications array, registration, education, role, expertise, biography sections, languages, portrait, booking flag, related content, reviewed date. Internal confirmation notes never enter public DTO. Unpublished slug returns true 404.


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

Server render/tag cache; availability loads non-blockingly or on interaction; client JS limited to booking/enquiry islands.

## Accessibility, privacy, and trust

Definition lists for credentials; text not image; no colour-only schedule; no hidden marker logic; careful non-guarantee medical wording.

## SEO and analytics

Physician JSON-LD, breadcrumb, canonical, approved OG image, clean title without duplicate honorific.

## Implementation sequence

Migrate structured fields; publication validation; profile refactor; media/credentials; booking preselection; related content; delete regex marker parsing; test missing/unpublished.

## Acceptance criteria

No confirmation marker in API/HTML; booking preserves doctor; unpublished returns 404; credentials approved; clean metadata; 320 px layout works.

## Required tests

DTO validation, 404, metadata, preselection E2E, screen-reader definitions, portrait fallback, JSON-LD.

## Dependencies/risks

Requires doctor data migration and verification workflow.
