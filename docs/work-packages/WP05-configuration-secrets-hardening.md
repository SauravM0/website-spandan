# WP05 — Configuration and secrets hardening

## Outcome

Hosted startup now fails before listening when required configuration is missing, weak, shared, malformed, or inconsistent with an enabled provider. Disabled payments cannot become successful mock payments. The single-admin maintenance scripts contain no default credentials or secondary staff account.

## Render secret contract

Store values only in the matching Render environment's secret manager. Never use `NEXT_PUBLIC_*`, build arguments, image layers, repository variables, screenshots, tickets, or logs for secrets. Staging and production must have different values.

Required hosted application keys:

- `JWT_SECRET` and `JWT_SECRET_VERSION=v1`
- `INTAKE_ENCRYPTION_KEY` and `INTAKE_ENCRYPTION_KEY_VERSION=v1`
- `DOCUMENT_ENCRYPTION_KEY` and its version only when document handling is approved and enabled

Each key must be independently generated with a cryptographically secure generator and contain at least 32 random bytes. Provider credentials are required only when their explicit feature flag is `true`. `PAYMENT_MOCK_ENABLED` is accepted only in development/test.

## Rotation procedure

1. Open an incident/change record naming the key, current version, owner, affected data, rollout window, and rollback decision.
2. Revoke exposed provider credentials at the provider first, store the replacement in the correct Render environment, and restart only that environment.
3. JWT rotation increments `JWT_SECRET_VERSION`, changes the secret, deploys, and revokes all existing staff sessions. The sole administrator must log in again.
4. Intake-key rotation requires a maintenance window: stop intake writes, back up, decrypt and re-encrypt every protected intake value with the new key, verify counts and sampled decryptions, then increment the version and deploy.
5. Document-key rotation remains prohibited while documents are disabled. Before future enablement, implement and rehearse a version-aware object re-encryption job using `document_references.encryption_key_version`.
6. Retain an old application key only for the shortest approved rollback window in the secret manager; remove it after reconciliation. Never record key values in the change record.

## Known credential response

Legacy scripts contained predictable admin/staff development passwords. They have been removed and were not copied by the runtime Dockerfile, but they must be treated as compromised if ever used. Before staging or production approval, reset the sole administrator password to a unique value and revoke existing sessions. No production credential can be rotated from repository access alone.

## Verification and rollback

Run `npm run secrets:check`, backend configuration tests, and the full release gate. Rollback may restore the previous application image only if no key value/version changed. After an actual rotation, roll forward or use the documented short-lived prior-key procedure; never blindly roll back encrypted data.
