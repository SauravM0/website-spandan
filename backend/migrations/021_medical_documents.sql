-- Secure medical document metadata and immutable provenance. Object bytes live in
-- private encrypted storage; no object path is exposed to clients.
CREATE TABLE IF NOT EXISTS document_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  category VARCHAR(40) NOT NULL CHECK (category IN ('lab_report','imaging','prescription','discharge_summary','referral','insurance','other')),
  original_filename TEXT NOT NULL,
  media_type VARCHAR(100) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  checksum_sha256 CHAR(64) NOT NULL,
  storage_key UUID NOT NULL UNIQUE,
  encryption_key_version SMALLINT NOT NULL DEFAULT 1 CHECK (encryption_key_version > 0),
  source VARCHAR(20) NOT NULL CHECK (source IN ('patient','guardian','staff','import')),
  uploader_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  authored_on DATE,
  facility TEXT,
  confidentiality VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (confidentiality IN ('normal','restricted')),
  status VARCHAR(30) NOT NULL DEFAULT 'scanning' CHECK (status IN ('scanning','rejected','awaiting_review','reviewed','verified','superseded','deleted')),
  rejection_code VARCHAR(50), review_notes TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  supersedes_id UUID REFERENCES document_references(id) ON DELETE RESTRICT,
  reviewed_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ, retention_state VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (retention_state IN ('active','legal_hold','eligible','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status IN ('reviewed','verified')) = (reviewed_at IS NOT NULL)),
  CHECK (status <> 'rejected' OR rejection_code IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_documents_patient_created ON document_references(patient_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_documents_review_queue ON document_references(status, created_at) WHERE status IN ('scanning','awaiting_review');
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON document_references(checksum_sha256);

CREATE TABLE IF NOT EXISTS document_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), document_id UUID NOT NULL REFERENCES document_references(id) ON DELETE RESTRICT,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('scan','extract')), status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','dead_letter')),
  attempts SMALLINT NOT NULL DEFAULT 0, available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), locked_at TIMESTAMPTZ,
  last_error_code VARCHAR(50), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_document_jobs_claim ON document_processing_jobs(status, available_at) WHERE status IN ('pending','failed');

CREATE TABLE IF NOT EXISTS document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), document_id UUID NOT NULL REFERENCES document_references(id) ON DELETE RESTRICT,
  raw_text TEXT NOT NULL, structured_values JSONB NOT NULL DEFAULT '[]'::JSONB,
  engine VARCHAR(80) NOT NULL, engine_version VARCHAR(40), status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified','verified','rejected')),
  verified_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL, verified_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'verified') = (verified_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_document_extractions_document ON document_extractions(document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS document_idempotency (
  actor_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE, key VARCHAR(100) NOT NULL,
  request_hash CHAR(64) NOT NULL, document_id UUID NOT NULL REFERENCES document_references(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(actor_staff_id,key)
);

CREATE OR REPLACE FUNCTION prevent_document_evidence_mutation() RETURNS trigger AS $$
BEGIN
  IF NEW.patient_id <> OLD.patient_id OR NEW.storage_key <> OLD.storage_key OR NEW.checksum_sha256 <> OLD.checksum_sha256
     OR NEW.byte_size <> OLD.byte_size OR NEW.media_type <> OLD.media_type THEN
    RAISE EXCEPTION 'Document evidence is immutable; create a superseding version' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS document_evidence_immutable ON document_references;
CREATE TRIGGER document_evidence_immutable BEFORE UPDATE ON document_references FOR EACH ROW EXECUTE FUNCTION prevent_document_evidence_mutation();
