-- migration-phase: expand
-- Dedicated worker coordination, recoverable leases, and privacy-safe health state.

CREATE TABLE IF NOT EXISTS worker_instances (
  id UUID PRIMARY KEY,
  service_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'active', 'draining', 'stopped')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), stopped_at TIMESTAMPTZ,
  CHECK ((status = 'stopped') = (stopped_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_worker_instances_heartbeat ON worker_instances(status, heartbeat_at DESC);

CREATE TABLE IF NOT EXISTS worker_jobs (
  name TEXT PRIMARY KEY,
  interval_seconds INTEGER NOT NULL CHECK (interval_seconds BETWEEN 1 AND 86400),
  status TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled', 'dead_letter')),
  next_run_at TIMESTAMPTZ NOT NULL,
  lease_owner UUID REFERENCES worker_instances(id) ON DELETE RESTRICT, lease_token UUID, lease_expires_at TIMESTAMPTZ,
  total_attempts BIGINT NOT NULL DEFAULT 0 CHECK (total_attempts >= 0), total_failures BIGINT NOT NULL DEFAULT 0 CHECK (total_failures >= 0),
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0), max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  last_started_at TIMESTAMPTZ, last_succeeded_at TIMESTAMPTZ, last_failed_at TIMESTAMPTZ,
  last_error_code TEXT, dead_lettered_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (num_nonnulls(lease_owner, lease_token, lease_expires_at) IN (0, 3)),
  CHECK ((status = 'dead_letter') = (dead_lettered_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_worker_jobs_due ON worker_jobs(next_run_at, name) WHERE status = 'enabled';
CREATE INDEX IF NOT EXISTS idx_worker_jobs_lease_expiry ON worker_jobs(lease_expires_at) WHERE lease_expires_at IS NOT NULL;

INSERT INTO worker_jobs (name, interval_seconds, next_run_at, max_attempts) VALUES
  ('notification-outbox', 5, NOW(), 5), ('document-processing', 5, NOW(), 5),
  ('payment-reconciliation', 300, NOW(), 5), ('appointment-hold-cleanup', 60, NOW(), 5),
  ('remote-intake-cleanup', 900, NOW(), 5), ('whatsapp-notification', 60, NOW(), 5),
  ('lead-archive', 86400, CASE WHEN date_trunc('day', NOW()) + INTERVAL '3 hours' > NOW()
    THEN date_trunc('day', NOW()) + INTERVAL '3 hours'
    ELSE date_trunc('day', NOW()) + INTERVAL '1 day 3 hours' END, 5)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE notification_outbox
  ADD COLUMN IF NOT EXISTS lease_owner UUID REFERENCES worker_instances(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS lease_token UUID, ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_code TEXT;
CREATE INDEX IF NOT EXISTS idx_notification_outbox_expired_lease ON notification_outbox(lease_expires_at) WHERE status = 'sending';

ALTER TABLE document_processing_jobs
  ADD COLUMN IF NOT EXISTS lease_owner UUID REFERENCES worker_instances(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS lease_token UUID, ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_document_jobs_expired_lease ON document_processing_jobs(lease_expires_at) WHERE status = 'running';
