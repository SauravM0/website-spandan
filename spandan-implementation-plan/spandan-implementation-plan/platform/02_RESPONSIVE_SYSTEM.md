# Responsive Design System

## Required viewport modes

| Mode | Width |
|---|---:|
| compact phone | 320–479 px |
| large phone | 480–767 px |
| tablet | 768–1023 px |
| laptop | 1024–1279 px |
| desktop | 1280–1535 px |
| wide desktop | 1536 px+ |

Automated visual checks must include at least 320, 390, 768, 1024, 1280, and 1440 px, plus landscape phone and 200% zoom.

## Shared primitives

- `PageContainer`, `Section`, `PageHeader`, `SplitLayout`, `AutoGrid`;
- `ResponsiveDataView` (desktop table, compact cards);
- `FilterBar` (inline desktop, sheet/drawer phone);
- `StickyActionBar` with safe-area padding;
- `Skeleton`, `EmptyState`, `ErrorState`;
- `Pagination`, `StatusBadge`, `DetailDrawer`.

## Public navigation

Desktop: optional utility bar, 68–76 px main header, clear top-level routes, one primary Book button. Phone: full-height focus-trapped drawer, body scroll lock, accordion groups, language selector, route-close behavior, and Book/Call/WhatsApp bottom actions.

## Admin shell

Desktop: 240–272 px collapsible sidebar and sticky top bar. Tablet: icon rail/drawer and reduced columns. Phone: drawer navigation, page title/primary action, card-based data views, filter sheet, and agenda/day calendar. Avoid horizontal navigation strips and hover-only actions.

## Typography and spacing

Use `next/font`. Body 16–18 px public and 14–16 px admin. Keep article line length 55–75 characters. Minimum touch target 44×44 px. Use consistent 16/24/32/48/64/96 px rhythm rather than arbitrary margins.

## Colour

Use navy for authority/navigation, teal for endocrine/general care, blue for diagnostics/information, coral for cardiology/emphasis, amber warning, red destructive/error, green verified/success, and neutral surfaces. Do not make every card a different colour.

## Images

Use approved doctor/facility media with alt text, dimensions, crop/focal data, publish state, AVIF/WebP variants, responsive `sizes`, reserved aspect ratio, and lazy loading below fold. Never publish patient photos/reports without documented consent.

## Motion

150–250 ms control transitions, reduced-motion support, no perpetual decorative animation behind forms/text, no scroll-jacking.

## Accessibility release gates

WCAG 2.2 AA target; skip links; visible focus; semantic headings; field-linked errors and summaries; live regions for asynchronous states; no colour-only status; keyboard dialogs/drawers; semantic table headers/captions; correct language handling.

## Responsive QA checklist

- no horizontal overflow at 320 px;
- fixed bars do not cover content/actions;
- long Marathi/Hindi labels wrap;
- 200% zoom remains functional;
- iOS safe area/Android browser bar;
- keyboard-open form state;
- tablet portrait/landscape;
- no hover-only command;
- all critical actions remain reachable.
