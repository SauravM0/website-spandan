# Architecture Decisions

## A. Preserve the current application; restructure it

The existing application already contains doctors, packages, appointment availability, holds, appointments, orders, payments, receipts, notifications, leads, audit data, admin authentication, and multilingual UI. Rewriting it would increase risk. Changes should be incremental and tested against existing behavior.

## B. Replace static export with a normal Next.js deployment

Current `frontend/next.config.js` uses `output: 'export'`, while doctors, packages, articles, videos, and dynamic slugs depend on mutable backend data. `generateStaticParams()` and `revalidate` do not provide normal ISR behavior in a pure static export. New slugs can require a rebuild and build-time API failure can produce incomplete pages.

Recommended decision:

- remove `output: 'export'`;
- deploy Next.js in server mode;
- server-render public content pages;
- use revalidation/tag invalidation for doctors, packages, articles, videos, media, and clinic settings;
- keep booking, payment, and admin routes dynamic;
- retain Express/PostgreSQL as operational authority.

If static hosting is mandatory, document that constraint explicitly and accept runtime client fetching and weaker dynamic SEO as a fallback.

## C. Separate public and admin shells without changing URLs

Current root layout renders public navbar, footer, consent banner, and sticky CTA. The admin nested layout does not structurally remove these.

Target:

```text
src/app/
  layout.tsx                    # html/body/providers only
  (public)/
    layout.tsx                  # public navbar/footer/consent/actions
    page.tsx
    about/page.tsx
    ...
  admin/
    (auth)/login/page.tsx
    (protected)/layout.tsx      # session guard + AdminLayout
    (protected)/page.tsx
    ...
```

Route groups do not change URLs. Move files; do not copy them.

## D. Render each shell once

Most admin pages currently import `<AdminLayout>`. Put it once in the protected admin layout and remove page wrappers. Login must have a separate auth layout.

## E. Backend authority

The browser may present a preview but cannot be authoritative for consultation fee, package totals, discounts, availability, hold expiry, appointment/order/payment status, receipt identity, or allowed status transitions.

## F. One verified clinic-settings source

Create or extend one typed settings source for clinic name, address, landmark, phone, WhatsApp, email, timings, holidays, arrival instructions, map coordinates, fee, cancellation/refund links, emergency note, languages, and social links. Environment variables remain for secrets/deployment—not editable public content.

## G. Shared types instead of `any`

Define DTOs for doctors, packages, slots, holds, appointments, package quotes/orders, payments, receipts, dashboard, paginated admin lists, leads, notifications, and settings. Backend Zod schemas remain validation authority; frontend validation improves UX but does not replace server validation.

## H. Clinic timezone

Clinic business time is `Asia/Kolkata`. Do not derive clinic dates with `new Date().toISOString().slice(0,10)`. Centralize date-only parsing/formatting and use explicit India day boundaries in SQL. Add tests around midnight IST.

## I. Component rules

Create components only to remove repetition or isolate state. Good: responsive data view, status badge, filter bar, booking step, calendar day inspector. Bad: `HomeV2`, copied mobile pages, duplicate API clients, or separate business logic per breakpoint.

## J. Migration method

1. Baseline current behavior with tests/screenshots.
2. Add backend-compatible fields/endpoints.
3. Refactor existing route in place.
4. Use a short-lived feature flag only for risky cutovers.
5. Remove old component/route immediately after stable cutover.
6. Clean unused API helpers and styles after reference scan.

## K. Repository and secret hygiene

- Ensure `.env*` is ignored except examples.
- Rotate any real credential included in a shared archive.
- Remove generated `out`/build artifacts from source control if tracked.
- Add CI secret/dependency scanning.
- Create a clean baseline branch.
- Commit schema migrations separately from UI changes.
