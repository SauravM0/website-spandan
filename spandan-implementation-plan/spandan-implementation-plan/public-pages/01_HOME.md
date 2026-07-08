# Home Page Plan

**Route:** `/`  
**Current files:** `frontend/src/app/page.tsx` and existing home components  
**Complexity:** L  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Route patients quickly to the correct specialist, service, package, education, booking, and location path while establishing verifiable trust.

## Current findings

- Repetitive icon/card grids flatten hierarchy.
- Hero uses logo/information presentation instead of approved human/clinic media.
- Homepage doctor section can depend on a client request.
- Service cards contain hard-coded doctor slugs that do not match current seeded routes.
- Trust claims/contact facts are not governed from one source.
- Decorative motion can compete with primary actions.

## Target page structure

1. Hero: one value proposition, approved doctor/clinic image, Book/View Doctors/Call actions.
2. Patient-intent bento grid: Diabetes, Thyroid, Heart, Child Growth/Puberty, Weight, PCOS, Bone, Diagnostics.
3. Two editorial specialist cards with verified facts and booking.
4. Three-step booking explanation.
5. Maximum three featured packages with authoritative price.
6. Facility photo mosaic.
7. Verified reasons to choose the clinic.
8. One article, one video, one tool.
9. Verified reviews only after consent/source workflow.
10. Location and final CTA.

## Component/refactor plan

- Keep `page.tsx` as server orchestrator.
- Refactor `HeroSection`, `ServiceCards`, `DoctorCards`, `FeaturedPackages`, `EquipmentShowcase`, and `TeamCards` in place.
- Pass server-loaded typed data into sections.
- Replace hard-coded doctor destinations with backend IDs/slugs.
- Remove unused decorative components after cutover; no `HomeV2`.

## Data/API/backend plan

Load published doctor summaries, featured package summaries, featured resources, public settings, and approved media through server components with tag revalidation. Do not fetch full biographies/tests. Optional next-available data must be non-blocking and short-timeout. Admin publish/update invalidates only relevant tags.


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

Server-render primary text/cards; preload only the real LCP image; responsive AVIF/WebP; lazy gallery/video; avoid client-fetch waterfalls; keep animation libraries out of initial path where possible.

## Accessibility, privacy, and trust

One H1; cards are real descriptive links; approved image alt text; trust metrics have labels; no patient data in reviews; no unverified statistics/outcome claims.

## SEO and analytics

MedicalClinic JSON-LD from settings, Physician references, crawlable internal links, correct canonical. Analytics records anonymous CTA category only—never condition, identity, or form content.

## Implementation sequence

1. Move route into public group.
2. Define typed home payload.
3. Refactor hero/navigation destinations.
4. Server-render doctors/packages/resources.
5. Add approved media pipeline.
6. Implement section order and mobile actions.
7. Generate structured data from settings.
8. Delete obsolete imports/components.
9. Run visual/accessibility/performance tests.

## Acceptance criteria

- Primary booking action visible at 320/390/768/1280.
- Doctor/package/contact/booking reachable in one action.
- No invalid slug or client-only blank section.
- No unverified trust claim.
- No horizontal overflow/CTA collision.
- Core Web Vitals targets pass in production-like staging.

## Required tests

Server fallback, link integrity, visual matrix, keyboard landmarks, image failure, structured-data validation, analytics privacy, Lighthouse CI.

## Dependencies/risks

Verified clinic facts and approved doctor/facility media are mandatory. Testimonials remain excluded until consent/source governance exists.
