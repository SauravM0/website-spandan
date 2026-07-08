# Doctors List Page Plan

**Route:** `/doctors`  
**Current files:** `frontend/src/app/doctors/page.tsx`  
**Complexity:** M  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Let patients compare the currently published specialists and move directly to a verified profile or doctor-preselected booking.

## Current findings

- Initials are primary visual; approved portraits absent.
- Untyped data and static-export freshness risk.
- No clear published/bookable distinction.
- Generic cards do not communicate patient-intent expertise.

## Target page structure

Page guidance; one editorial card per doctor with portrait, exact name, qualifications, speciality, expertise, languages, availability summary, View Profile and Book; “not sure” contact block. Do not add search for only two doctors.

## Component/refactor plan

Refactor one shared `DoctorCard` with home/list variants. Server-load summaries. Use backend slug only; never synthesize/hard-code alternatives. Photo fallback is secondary.

## Data/API/backend plan

Public summary DTO: id, slug, display name, speciality, qualifications, portrait, expertise, languages, published, booking enabled, optional next-available summary, reviewed date. Return only published doctors.


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

Server render; tagged cache; list payload excludes full biography; right-sized images.

## Accessibility, privacy, and trust

Exact accessible button labels (“Book with …”); credentials remain text; no invented expertise/registration.

## SEO and analytics

ItemList + valid Physician references; canonical; crawlable detail URLs.

## Implementation sequence

Define DTO; remove static-export dependency; refactor card; add media; add publish/booking flags; optional lightweight availability; test preselection.

## Acceptance criteria

All links use backend slugs; unpublished doctors absent; booking preselects correct doctor; no loading flash or image CLS.

## Required tests

Publish filter, slug integrity, preselection E2E, image fallback, long names/credentials visual, structured data.

## Dependencies/risks

Depends on platform architecture, verified content, typed contracts, and responsive primitives.
