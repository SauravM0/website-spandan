# Payment Confirmation and Recovery Plan

**Route:** `/payment/confirmation`  
**Current files:** `frontend/src/app/payment/confirmation/page.tsx`  
**Complexity:** L  
**Rule:** Refactor this route in place. Do not create an alternate page.

## Objective

Show a trustworthy payment outcome and recover correctly from delayed provider confirmation, refresh, failed/cancelled payment, receipt delay, and duplicate callback.

## Current findings

- One status request is insufficient for asynchronous pending payment.
- No explicit successful/pending/failed/cancelled/expired/unknown state model.
- No retry payment or entity-specific next action.
- Mock display can be influenced by URL parameter.
- Clinic instructions are hard-coded.
- Email receipt needs stronger validation/cooldown feedback.

## Target page structure

Verifying state; success with appointment/order summary and receipt; pending with bounded backoff polling/manual refresh; failed/cancelled with safe retry; expired with underlying booking/order guidance; unknown/error with support reference. Next actions differ for appointment versus package order.

## Component/refactor plan

Keep route; add `paymentStatusReducer`, `PaymentStatusPanel`, `ReceiptActions`, `NextSteps`. Reuse central asset URL and settings. Mock indicator only from non-production build/server response—not arbitrary query.

## Data/API/backend plan

Public payment DTO: masked transaction reference, status/reason, amount/currency, entity type, safe confirmation summary, receipt/notification state, can_retry/retry_until, support reference, recommended polling. Webhook/provider is authority. Poll exponentially and stop. Retry is idempotent and cannot duplicate successful charge.


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

One immediate status call; bounded polling with visibility pause/backoff; stop on terminal state; no full booking/order payload; receipt lazy after success.

## Accessibility, privacy, and trust

Status in `aria-live`; minimal personal data; labelled/validated receipt email; masked destination; no transaction query in analytics/logs.

## SEO and analytics

Noindex; redact query values/referrer where practical; record anonymous status category only.

## Implementation sequence

Define enums/DTO; state reducer; bounded polling; retry action; entity-specific next steps; central settings; restrict mock; webhook-delay/refresh tests.

## Acceptance criteria

Return URL alone never marks success; pending resolves automatically; polling bounded; refresh recovers; retry cannot double-charge; receipt authorized; unknown state gives support reference.

## Required tests

Reducer states, pending→success/failure, webhook replay, retry idempotency, refresh/deep link, receipt email rate limit, noindex/redaction, live-region.

## Dependencies/risks

Must ship with booking/order idempotency and provider verification.
