CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE staff_users
  ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_mfa_counter BIGINT,
  ADD COLUMN IF NOT EXISTS access_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_reviewed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS staff_sessions (
  id UUID PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  CONSTRAINT staff_sessions_expiry CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_active
  ON staff_sessions(staff_user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS privacy_rights_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT UNIQUE NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('access','correction','consent_withdrawal','export','deletion','restriction','complaint')),
  requester_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  relationship TEXT NOT NULL CHECK (relationship IN ('self','parent_guardian','authorised_proxy','other')),
  request_details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_identity_verification' CHECK (status IN ('pending_identity_verification','identity_verified','in_review','restricted','completed','rejected','cancelled')),
  identity_verified_at TIMESTAMPTZ,
  identity_verified_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  decision_notes TEXT,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (contact_email IS NOT NULL OR contact_phone IS NOT NULL),
  CHECK (status = 'pending_identity_verification' OR identity_verified_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_privacy_rights_queue ON privacy_rights_requests(status, created_at);

CREATE TABLE IF NOT EXISTS vendor_security_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  production_data_categories TEXT[] NOT NULL DEFAULT '{}',
  residency TEXT,
  contract_reference TEXT,
  subprocessors_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  exit_deletion_evidence_required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'blocked' CHECK (status IN ('blocked','in_review','approved','expired','terminated')),
  approved_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND contract_reference IS NOT NULL))
);

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS integrity_hash TEXT;

CREATE OR REPLACE FUNCTION protect_audit_log() RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'audit_log is append-only' USING ERRCODE = '42501';
  END IF;
  NEW.integrity_hash := encode(digest(
    NEW.id::text || '|' || COALESCE(NEW.actor_staff_id::text,'system') || '|' ||
    NEW.action || '|' || NEW.entity_type || '|' || COALESCE(NEW.entity_id::text,'') || '|' ||
    NEW.metadata::text || '|' || NEW.created_at::text, 'sha256'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_log_integrity ON audit_log;
CREATE TRIGGER audit_log_integrity BEFORE INSERT OR UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION protect_audit_log();
