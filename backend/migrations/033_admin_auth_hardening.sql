-- migration-phase: expand
-- Single-administrator MFA, shared throttling, bounded sessions, and step-up state.

ALTER TABLE staff_sessions
  ADD COLUMN IF NOT EXISTS idle_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS absolute_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS step_up_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

UPDATE staff_sessions
SET idle_expires_at = LEAST(expires_at, last_seen_at + INTERVAL '30 minutes'),
    absolute_expires_at = expires_at
WHERE idle_expires_at IS NULL OR absolute_expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_sessions_runtime_active
  ON staff_sessions(id, staff_user_id, idle_expires_at, absolute_expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS staff_auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('login','enrollment')),
  pending_secret_encrypted TEXT,
  attempt_count SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  ip_hash TEXT NOT NULL,
  user_agent_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((purpose = 'enrollment') = (pending_secret_encrypted IS NOT NULL)),
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_staff_auth_challenges_active
  ON staff_auth_challenges(staff_user_id, expires_at) WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS staff_login_throttles (
  throttle_key CHAR(64) PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('account','ip')),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_login_throttles_blocked
  ON staff_login_throttles(blocked_until) WHERE blocked_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS staff_mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  code_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  UNIQUE(staff_user_id, code_hash)
);
CREATE INDEX IF NOT EXISTS idx_staff_mfa_recovery_unused
  ON staff_mfa_recovery_codes(staff_user_id) WHERE used_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_single_active_administrator
  ON staff_users ((1)) WHERE role IN ('admin','system_admin') AND is_active = TRUE;
