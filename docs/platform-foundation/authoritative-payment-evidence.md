# Authoritative payment evidence

Work Package 17 prevents production payment success without PhonePe evidence. Mock success remains available only when `PAYMENT_MOCK_ENABLED=true` in an explicit development or test environment; hosted staging and production reject it, and production also rejects PhonePe sandbox configuration.

The canonical PhonePe callback is `POST /api/webhooks/phonepe`. Callback authorization follows PhonePe's documented SHA-256 username/password validation. An allowlisted callback is only a wake-up signal: the API immediately requests the current order with PhonePe's authenticated order-status endpoint and applies that response. Callback data cannot directly mark a payment successful.

Success additionally requires an exact paisa amount and matching provider order. The transaction stores a hash, source, and observation time for the successful evidence; database triggers require evidence for every new success transition and prevent later replacement. Repeated callback bodies use a canonical database-backed event hash, return an idempotent acknowledgement, and do not repeat receipts, notifications, or booking changes. If a callback supplies an event timestamp, events outside fifteen minutes are rejected; PhonePe's callback contract does not guarantee such a timestamp, so durable replay hashing remains the universal replay control.

Provider timeouts leave the payment pending or `verification_required`. The worker continues polling PhonePe and records actionable provider-unavailable or mismatch exceptions. When PhonePe is disabled, payment creation returns `PAYMENT_PROVIDER_DISABLED` without creating success.

Run `npm run authoritative-payments:check` for the structural gate. PhonePe must remain disabled until the separate provider and finance pilot has completed.
