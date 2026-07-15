# WP07 — Pull-request CI pipeline

## Outcome

Every pull request is evaluated by independent quality, unit/contract, PostgreSQL integration, security, dependency-review, CodeQL, browser E2E, deliberate rejection, and container-artifact checks. CI uses only a disposable PostgreSQL service, synthetic test identities, and disabled external providers.

The application still has one real staff user: the administrator. The CI administrator is synthetic and exists only inside the disposable CI database.

## Required branch protection

Configure the `main` branch in GitHub to require a pull request, dismiss stale approvals, require the branch to be up to date, disallow bypass (including administrators), and require every check listed in `infrastructure/ci-policy.json`.

Branch protection is a repository-host setting and cannot be proven from a checkout. The local policy checker prevents the required-check contract from being silently weakened; a repository owner must apply and verify the matching GitHub setting before WP07 is accepted for production.

## Deliberate rejection evidence

The `Deliberate gate rejection tests` job creates disposable broken type, migration, token, RBAC, and Playwright fixtures. The job succeeds only when the corresponding production gate rejects each fixture. No fixture is committed or uploaded.

## Local verification

Run:

```text
npm run ci:check
npm run lint
npm run backend:typecheck
npm run frontend:typecheck
npm run backend:test
npm run frontend:test
npm run migrations:validate
npm --prefix frontend run test:e2e -- --list
```

The PostgreSQL integration and browser flows require the disposable CI database. Their authoritative evidence is the protected pull-request workflow. Container evidence remains in the separately required `Container artifacts` workflow.

## Rollback

Revert the WP07 commit to restore the prior workflow. This package changes no production schema or runtime behavior. Never disable branch protection as a rollback mechanism; update its required-check names only after the rollback workflow is present on the default branch.
