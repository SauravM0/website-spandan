-- migration-phase: contract
-- compatibility-approved: WP14
-- allow-destructive-migration
-- Remove the retired second-factor schema from databases that ran earlier migrations.

DROP TABLE IF EXISTS staff_mfa_recovery_codes;
DROP TABLE IF EXISTS staff_auth_challenges;

ALTER TABLE staff_users
  DROP COLUMN IF EXISTS mfa_secret_encrypted,
  DROP COLUMN IF EXISTS mfa_enabled_at,
  DROP COLUMN IF EXISTS last_mfa_counter;

ALTER TABLE staff_sessions
  DROP COLUMN IF EXISTS mfa_verified_at,
  DROP COLUMN IF EXISTS step_up_verified_at;
