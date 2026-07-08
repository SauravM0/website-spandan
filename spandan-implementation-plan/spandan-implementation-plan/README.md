# Spandan Website and Admin Portal — End-to-End Restructuring Plan

## Purpose

This is an implementation plan for restructuring the existing Next.js/Express/PostgreSQL application. It is not a proposal to build a second website. Every current public and admin route has a separate Markdown plan.

Each page plan defines the current files, defects, target information architecture, component boundaries, API/database changes, responsive behavior, failure states, performance work, security/privacy requirements, acceptance criteria, and tests.

## Audit basis and limits

The plan is based on static inspection of the uploaded source code and review of the supplied live reference website. Production logs, database query plans, real payment credentials, traffic analytics, usability sessions, and final-device Lighthouse results were not available. Therefore, latency and Core Web Vitals values in this package are release targets—not claims about current measured performance.

## Non-negotiable rules

1. Refactor current routes; do not create `/v2`, `new-*`, or parallel page trees.
2. Route groups may move files without changing URLs.
3. Backend remains authoritative for prices, slots, holds, totals, status transitions, payments, and receipts.
4. Clinic address, timings, phone, fees, policies, and structured data come from one verified settings source.
5. Admin authentication uses only the existing HttpOnly cookie session; remove fake localStorage token state.
6. Do not place ABHA, Aadhaar, medical details, tokens, or payment payloads in free-text notes, URLs, analytics, or browser persistence.
7. No unverified credentials, testimonials, patient counts, satisfaction percentages, or outcome claims.
8. Every public and admin page must deliberately support phone, tablet, laptop, and desktop.
9. Every data page must define loading, empty, error, retry, and stale-data behavior.
10. Remove obsolete code immediately after cutover; do not leave duplicate implementations indefinitely.

## Reading order

1. `platform/00_ARCHITECTURE_DECISIONS.md`
2. `platform/01_REFACTOR_MAP.md`
3. `platform/02_RESPONSIVE_SYSTEM.md`
4. `platform/03_API_SECURITY_PERFORMANCE.md`
5. `platform/04_TESTING_RELEASE.md`
6. `platform/05_DELIVERY_ROADMAP.md`
7. The page-specific plan.

## Public plans

| Route | File |
|---|---|
| `/` | `public-pages/01_HOME.md` |
| `/about` | `public-pages/02_ABOUT.md` |
| `/doctors` | `public-pages/03_DOCTORS_LIST.md` |
| `/doctors/[slug]` | `public-pages/04_DOCTOR_DETAIL.md` |
| `/facilities` | `public-pages/05_FACILITIES.md` |
| `/packages` | `public-pages/06_PACKAGES_LIST.md` |
| `/packages/[slug]` | `public-pages/07_PACKAGE_DETAIL.md` |
| `/book-appointment` | `public-pages/08_BOOK_APPOINTMENT.md` |
| `/book-package` | `public-pages/09_BOOK_PACKAGE.md` |
| `/payment/confirmation` | `public-pages/10_PAYMENT_CONFIRMATION.md` |
| `/health-resources` | `public-pages/11_RESOURCES_LIST.md` |
| `/health-resources/[slug]` | `public-pages/12_RESOURCE_DETAIL.md` |
| `/videos` | `public-pages/13_VIDEOS.md` |
| `/tools` | `public-pages/14_TOOLS.md` |
| `/contact` | `public-pages/15_CONTACT.md` |
| `/privacy` | `public-pages/16_PRIVACY.md` |
| `/terms` | `public-pages/17_TERMS.md` |
| global 404 | `public-pages/18_NOT_FOUND.md` |

## Admin plans

| Route | File |
|---|---|
| `/admin/login` | `admin-pages/01_LOGIN.md` |
| protected admin shell | `admin-pages/02_ADMIN_SHELL.md` |
| `/admin` | `admin-pages/03_DASHBOARD.md` |
| `/admin/calendar` | `admin-pages/04_CALENDAR.md` |
| `/admin/appointments` | `admin-pages/05_APPOINTMENTS.md` |
| `/admin/package-orders` | `admin-pages/06_PACKAGE_ORDERS.md` |
| `/admin/payments` | `admin-pages/07_PAYMENTS.md` |
| `/admin/notifications` | `admin-pages/08_NOTIFICATIONS.md` |
| `/admin/leads` | `admin-pages/09_LEADS_LIST.md` |
| `/admin/leads/[id]` | `admin-pages/10_LEAD_DETAIL.md` |
| `/admin/packages` | `admin-pages/11_PACKAGES.md` |
| `/admin/operations` | `admin-pages/12_OPERATIONS_DEPRECATION.md` |

## Definition of done

A page is done only when its end-to-end workflow, backend authority, responsive modes, keyboard/screen-reader path, error recovery, privacy controls, automated tests, monitoring, and removal of obsolete code are complete.
