# WP13 — Production observability

Status: implemented and locally verified. Monitoring-provider dashboard creation and alert delivery tests remain staging operations because provider credentials are not stored in the repository.

## Signals

The API records bounded per-replica HTTP p50/p95/p99, status classes, 401/403/429 counts, memory, event-loop lag, database acquisition/query timing, and pool state. The scrape snapshot adds worker heartbeat/queue state, pending payment age, notification backlog/dead letters, and 24-hour booking conversion/open conflicts. Every response carries the request ID and immutable application version; completed admin, slow, and failed requests emit structured logs using route templates rather than URLs or identifiers.

The frontend reports CLS, FCP, INP, LCP, and TTFB with only an allowlisted route group, metric name, numeric value, and rating. It omits cookies and sends no URL, user/session identifier, patient data, payment reference, free text, or provider payload.

## Scraping and dashboards

Configure the monitoring provider to scrape `GET /api/internal/metrics` on every API replica every 30 seconds with `Authorization: Bearer <METRICS_BEARER_TOKEN>`. The token is a unique 32+ character Render secret and hosted startup fails if it is absent, weak, or reused. Aggregate replicas in the provider; do not add patient identifiers or raw request paths as labels.

Create the seven dashboard groups declared in `infrastructure/observability-policy.json`: API/auth, database, workers, payments/notifications, bookings, Web Vitals, and process/deployment version.

The sole administrator can also inspect the same privacy-safe snapshot at `GET /api/admin/operations/observability`; ordinary dashboard authentication and request correlation apply.

## Alerts and response

The alert policy contains eight owned conditions for sustained 5xx, database pressure, worker failure, payment drift, notification backlog, authentication/rate-limit anomalies, Web Vitals regression, and event-loop stalls. Alert payloads contain the alert ID, service, version, aggregate value, threshold, and time window only. The sole clinic administrator owns initial response and escalation until additional production roles are explicitly introduced.

For a critical alert, stop progressive rollout, correlate safe logs with request ID and version, check database/worker/payment gauges, and restore the previous image when the regression aligns with deployment. Never reverse the expanded database schema or delete accepted writes. Provider dashboard screenshots, fired/resolved alert evidence, and delivery timing belong in the staging release evidence rather than source control.

## Acceptance

Local gates verify bounded metrics, route-template cardinality, Web Vitals allowlists, sensitive-field exclusion, protected scraping, configuration validation, builds, and existing behavior. Staging must prove that synthetic sustained 5xx, worker shutdown, database pressure, and delayed-payment fixtures fire the correct alert and resolve after recovery, while a telemetry review confirms that no names, contact details, identifiers, clinical text, document references, provider payloads, or free text were emitted.
