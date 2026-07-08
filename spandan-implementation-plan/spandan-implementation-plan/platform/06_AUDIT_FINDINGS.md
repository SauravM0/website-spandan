# Audit Findings

## P0

- Static export conflicts with mutable dynamic routes.
- Root public shell is not structurally isolated from admin.
- Admin trusts fake localStorage token while backend uses cookie.
- UTC date helpers can shift clinic dates.
- Frontend appointment fee is hard-coded separately from backend.
- ABHA/Aadhaar are collected and placed in free-text notes.
- Privacy text does not match actual collection and includes unverified claims/contact.
- Payment confirmation lacks robust pending/retry/recovery.
- Clinic facts are duplicated/inconsistent.
- `/admin/operations` duplicates other admin routes.

## P1 performance/maintainability

- Dashboard downloads broad lists to calculate counts.
- Admin collections lack consistent pagination.
- Leads pagination metadata is discarded by frontend wrapper.
- Calendar is ~1,100 lines and batch updates can issue many requests.
- Appointment checkout is 500+ lines; package checkout ~300.
- Admin package list has N+1 test queries.
- Searches often cover only downloaded rows.
- Homepage doctor cards depend on client fetch.
- Extensive `any` weakens contracts.

## P1 responsive/UX

- Public navigation hides Home/About/Tools under “Clinic.”
- Mobile menu is not a full accessible drawer.
- Four-action sticky CTA is crowded.
- Admin uses a horizontally scrolling header.
- Tables rely on horizontal scroll.
- Calendar lacks mobile agenda/tablet week modes.
- Public pages overuse identical white cards.
- Inspected public assets lack real doctor/facility media.
- Package price/profile trust hierarchy is weak.

## P2 content/legal/SEO

- `body_md` renders as pre-wrapped text, not safe Markdown.
- Articles lack reviewer/review-date governance.
- Footer policy anchors do not match Terms sections.
- Structured data hard-codes clinic facts.
- Cookie banner may be unnecessary or incomplete.
- Service doctor links use wrong hard-coded slugs.
- Claims/testimonials need verification and consent.
- YouTube needs cached fallback/privacy-aware embedding.
- Enquiry response SLA is hard-coded.
- Dynamic not-found pages may return content instead of true 404.
