-- Additive, approval-gated glucose device ingestion. Raw payloads and canonical
-- observations are retained separately so every transformation is reproducible.
CREATE TABLE IF NOT EXISTS device_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  connector VARCHAR(60) NOT NULL DEFAULT 'generic_csv',
  original_filename VARCHAR(255) NOT NULL,
  media_type VARCHAR(100) NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('quarantined','previewed','processing','completed','completed_with_errors','failed','dead_letter')),
  timezone VARCHAR(60) NOT NULL CHECK (timezone = 'Asia/Kolkata'),
  default_unit VARCHAR(20) NOT NULL CHECK (default_unit IN ('mg/dL','mmol/L')),
  transformation_version INTEGER NOT NULL DEFAULT 1 CHECK (transformation_version > 0),
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  accepted_rows INTEGER NOT NULL DEFAULT 0 CHECK (accepted_rows >= 0),
  rejected_rows INTEGER NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
  duplicate_rows INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  error_summary JSONB NOT NULL DEFAULT '[]'::JSONB,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, connector, checksum_sha256)
);

CREATE TABLE IF NOT EXISTS device_raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES device_imports(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  source_id VARCHAR(255),
  raw_payload JSONB NOT NULL,
  raw_checksum_sha256 CHAR(64) NOT NULL,
  parsed_value NUMERIC,
  parsed_unit VARCHAR(20),
  parsed_effective_at TIMESTAMPTZ,
  source_timezone VARCHAR(60),
  context VARCHAR(40),
  quality_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  validation_status VARCHAR(30) NOT NULL CHECK (validation_status IN ('accepted','rejected','duplicate')),
  validation_errors JSONB NOT NULL DEFAULT '[]'::JSONB,
  transformation_version INTEGER NOT NULL CHECK (transformation_version > 0),
  observation_id UUID REFERENCES observation_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(import_id,row_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_event_source_identity ON device_raw_events(patient_id,source_id) WHERE source_id IS NOT NULL AND validation_status='accepted';
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_event_composite_identity ON device_raw_events(patient_id,raw_checksum_sha256) WHERE source_id IS NULL AND validation_status='accepted';
CREATE INDEX IF NOT EXISTS idx_device_import_patient_created ON device_imports(patient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_raw_import_status ON device_raw_events(import_id,validation_status,row_number);

CREATE OR REPLACE FUNCTION prevent_device_raw_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Device raw events are immutable; reprocess into a new import' USING ERRCODE='55000'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS device_raw_immutable ON device_raw_events;
CREATE TRIGGER device_raw_immutable BEFORE UPDATE OR DELETE ON device_raw_events FOR EACH ROW EXECUTE FUNCTION prevent_device_raw_mutation();

CREATE TABLE IF NOT EXISTS device_connector_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  connector VARCHAR(60) NOT NULL, purpose VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK(status IN ('active','revoked','expired')),
  granted_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  policy_version VARCHAR(60) NOT NULL, recorded_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK(status <> 'revoked' OR revoked_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_device_consent_lookup ON device_connector_consents(patient_id,connector,purpose,status,created_at DESC);

