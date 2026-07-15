# WP04 — Frontend production runtime

## Outcome

The frontend runs as a supported Next.js Node server rather than an invalid static Nginx export. Browser API requests stay on the public origin under `/api`; only the Next.js server can see the private backend address.

## Runtime contract

- The container starts `.next/standalone/server.js` as a non-root user on port 3000.
- `INTERNAL_API_URL` is a server-only runtime variable ending in `/api` (for example, a Render private backend hostname).
- Production refuses to perform a server-side API request when `INTERNAL_API_URL` is absent.
- Browser code always calls `/api`; the catch-all route streams methods, bodies, cookies, and safe response headers to the backend.
- `/healthz` checks the Next.js process without depending on the database. Backend readiness remains separately monitored.
- Public/admin nested routes and redirects are handled by Next.js, so direct refreshes no longer depend on SPA fallback behavior.

## Render staging configuration

1. Build with `frontend/Dockerfile` and expose port 3000.
2. Set `INTERNAL_API_URL` to the environment's private Express address plus `/api`.
3. Set the health check path to `/healthz`.
4. Expose only the frontend publicly; keep the Express service address private to the environment.
5. Verify browser network requests target the frontend hostname under `/api` and never reveal the private address.
6. Smoke-test `/`, `/admin/login`, a protected admin route, and direct refresh of nested public/admin URLs.

## Verification and rollback

Run `npm run frontend-runtime:check`, frontend unit/build tests, and the full release gate. For rollback, restore the previous frontend image only; no schema or accepted patient/payment write is changed by this package.
