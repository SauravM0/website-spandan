# Public payment and receipt access

Work Package 16 replaces enumerable payment transaction and receipt identifiers with random, expiring capabilities. PostgreSQL stores only SHA-256 token hashes. Status and receipt purposes are separate, so a status link cannot download or email a receipt; expired, malformed, missing, and wrong-purpose links all receive the same not-found response.

Public payment JSON is built from exact allowlists. It excludes payment, order, appointment, receipt, provider, idempotency, and provider-payload identifiers. Receipt email accepts no destination input and uses only the email stored with the appointment or package order. Public reads and email requests are rate limited and record privacy-safe success or denial audit events.

The public contracts are:

- `GET /api/public/payments/status/:capability`
- `GET /api/public/receipts/:capability`
- `POST /api/public/receipts/:capability/email`

Authenticated admin receipt access remains separate at `GET /api/admin/operations/payments/:id/receipt` and requires payment-read permission. Run `npm run public-payments:check` for the structural security gate.
