-- migration-phase: expand
-- Explicit, expiring grants for restricted clinical and document-content access.

CREATE TABLE IF NOT EXISTS patient_confidentiality_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  access_level TEXT NOT NULL CHECK (access_level IN ('clinical','document_content')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 1000),
  approved_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_patient_confidentiality_grants_active
  ON patient_confidentiality_grants(patient_id, staff_user_id, access_level, expires_at)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION prevent_confidentiality_grant_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Confidentiality grants are audit evidence and cannot be deleted'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patient_confidentiality_grant_no_delete ON patient_confidentiality_grants;
CREATE TRIGGER patient_confidentiality_grant_no_delete
BEFORE DELETE ON patient_confidentiality_grants
FOR EACH ROW EXECUTE FUNCTION prevent_confidentiality_grant_delete();

CREATE OR REPLACE FUNCTION protect_confidentiality_grant_evidence() RETURNS trigger AS $$
BEGIN
  IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.staff_user_id IS DISTINCT FROM OLD.staff_user_id
     OR NEW.access_level IS DISTINCT FROM OLD.access_level
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.approved_by_staff_id IS DISTINCT FROM OLD.approved_by_staff_id
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN
    RAISE EXCEPTION 'Confidentiality grant evidence is immutable; only first revocation is allowed'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patient_confidentiality_grant_immutable ON patient_confidentiality_grants;
CREATE TRIGGER patient_confidentiality_grant_immutable
BEFORE UPDATE ON patient_confidentiality_grants
FOR EACH ROW EXECUTE FUNCTION protect_confidentiality_grant_evidence();
