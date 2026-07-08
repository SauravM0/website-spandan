# Route and Component Refactor Map

## Public shell

| Existing | Action |
|---|---|
| `src/app/layout.tsx` | Keep HTML/body/providers only; move public chrome to `(public)/layout.tsx`. |
| `components/layout/Navbar.tsx` | Refactor in place into utility bar, desktop nav, accessible mobile drawer. |
| `components/layout/Footer.tsx` | Consume verified clinic settings. |
| `components/layout/ConsentBanner.tsx` | Remove if only necessary storage exists, or implement real consent categories. |
| `components/home/StickyCTA.tsx` | Three safe-area-aware actions; hide on checkout/payment/admin routes. |

## Public page route map

| Route | Existing file | Main action |
|---|---|---|
| `/` | `src/app/page.tsx` | Server-orchestrated home; refactor existing home components. |
| `/about` | `src/app/about/page.tsx` | Replace weak counters with verified care story/process. |
| `/doctors` | `src/app/doctors/page.tsx` | Server-render editorial doctor cards. |
| `/doctors/[slug]` | `src/app/doctors/[slug]/page.tsx` | Structured profile; remove biography-marker parsing. |
| `/facilities` | `src/app/facilities/page.tsx` | Approved media and precise facility information. |
| `/packages` | `src/app/packages/page.tsx` | Authoritative price, suitability, category, bookability. |
| `/packages/[slug]` | `src/app/packages/[slug]/page.tsx` | Explicit category/preparation; coordinated purchase summary. |
| `/book-appointment` | 500+ line current page | Decompose into page-local steps and reducer/state machine. |
| `/book-package` | ~300 line current page | Decompose buyer/items/quote/payment. |
| `/payment/confirmation` | current confirmation page | Payment-state machine and recovery. |
| resources/videos/tools/contact/legal | current routes | Refactor in place; no alternate routes. |

## Admin shell

| Existing | Action |
|---|---|
| `src/app/admin/layout.tsx` | Protected shell boundary with auth/login separation. |
| `components/layout/AdminLayout.tsx` | Responsive sidebar/drawer shell. |
| page-level `AdminLayout` imports | Remove. |
| localStorage token/user | Remove. Use `/auth/me` and HttpOnly cookie. |
| `src/lib/api.ts` | Keep one client; add typing, pagination, abort, normalized errors, 401 handling. |

## Admin route map

| Route | Action |
|---|---|
| `/admin` | One aggregate dashboard request. |
| `/admin/calendar` | Decompose 1,100-line page; aggregate reads and batch writes. |
| `/admin/appointments` | Server search/filter/sort/pagination; table/card modes. |
| `/admin/package-orders` | List/detail/lifecycle/payment context. |
| `/admin/payments` | Pagination, event timeline, reconciliation. |
| `/admin/notifications` | Pagination, masking, retry/dead-letter policy. |
| `/admin/leads` | Preserve backend pagination; remove duplicate inline detail. |
| `/admin/leads/[id]` | Canonical lead detail/history. |
| `/admin/packages` | Integrate existing editor; fix N+1. |
| `/admin/operations` | Migrate unique functions, redirect, delete. |

## Standard admin list response

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 0,
    "totalPages": 0
  },
  "filters": {}
}
```

## Standard error response

```json
{
  "error": {
    "code": "SLOT_NO_LONGER_AVAILABLE",
    "message": "This slot is no longer available.",
    "fieldErrors": {},
    "requestId": "..."
  }
}
```

## Removal checklist after cutover

- page-level admin shell wrappers;
- fake localStorage auth;
- invalid hard-coded doctor slugs;
- duplicate clinic facts;
- client-only homepage doctor fetch if replaced by server data;
- `/admin/operations` page;
- obsolete generated/static-export assumptions;
- any old component no longer imported.
