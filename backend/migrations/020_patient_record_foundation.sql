-- Longitudinal patient record foundation. Additive only: legacy clinical_notes
-- remains governance-blocked and is not used by the new versioned model.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  ADD COLUMN IF NOT EXISTS confidentiality VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (confidentiality IN ('normal','restricted'));

CREATE TABLE IF NOT EXISTS patient_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  system VARCHAR(80) NOT NULL,
  value_normalized VARCHAR(255) NOT NULL,
  display_masked VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','entered_in_error')),
  source VARCHAR(40) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_identifier_active_unique
  ON patient_identifiers(system, value_normalized) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_patient_identifier_patient ON patient_identifiers(patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('phone','email','address')),
  value TEXT NOT NULL, use VARCHAR(20) NOT NULL DEFAULT 'home', is_primary BOOLEAN NOT NULL DEFAULT false,
  source VARCHAR(40) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_contact_one_primary ON patient_contacts(patient_id, type) WHERE is_primary;

CREATE TABLE IF NOT EXISTS patient_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  related_patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT, full_name TEXT NOT NULL,
  relationship VARCHAR(40) NOT NULL, phone TEXT, access_status VARCHAR(20) NOT NULL DEFAULT 'none'
    CHECK (access_status IN ('none','requested','verified','revoked')),
  created_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (related_patient_id IS NULL OR related_patient_id <> patient_id)
);

CREATE TABLE IF NOT EXISTS patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  purpose VARCHAR(80) NOT NULL, status VARCHAR(20) NOT NULL CHECK (status IN ('proposed','active','rejected','withdrawn','expired')),
  policy_version VARCHAR(40) NOT NULL, communication_channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  recorded_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL, effective_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (expires_at IS NULL OR expires_at > effective_at)
);

CREATE TABLE IF NOT EXISTS patient_redirects (
  source_patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE RESTRICT,
  target_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL, merged_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reversed_at TIMESTAMPTZ,
  reversed_by_staff_id UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
  CHECK (source_patient_id <> target_patient_id)
);

CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE SET NULL, doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('planned','in_progress','finished','cancelled','entered_in_error')),
  type VARCHAR(40) NOT NULL DEFAULT 'consultation', started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ,
  opened_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  closed_by_staff_id UUID REFERENCES staff_users(id) ON DELETE RESTRICT, version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ended_at IS NULL OR (started_at IS NOT NULL AND ended_at >= started_at))
);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_time ON encounters(patient_id, COALESCE(started_at, created_at) DESC);

CREATE TABLE IF NOT EXISTS clinical_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  resource_type VARCHAR(30) NOT NULL CHECK (resource_type IN ('condition','allergy','medication','observation','diagnostic_report','document','prescription','procedure','care_plan')),
  status VARCHAR(30) NOT NULL, verification_status VARCHAR(30) NOT NULL,
  code_system VARCHAR(120), code VARCHAR(120), display TEXT NOT NULL, value JSONB NOT NULL DEFAULT '{}'::JSONB,
  original_text TEXT, source VARCHAR(30) NOT NULL CHECK (source IN ('patient','guardian','clinician','device','import')),
  confidentiality VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (confidentiality IN ('normal','restricted')),
  version INTEGER NOT NULL DEFAULT 1, supersedes_id UUID REFERENCES clinical_resources(id) ON DELETE RESTRICT,
  authored_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL, authored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  corrected_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, version)
);
CREATE INDEX IF NOT EXISTS idx_clinical_resources_patient_timeline ON clinical_resources(patient_id, authored_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_resources_patient_type ON clinical_resources(patient_id, resource_type, status);

CREATE TABLE IF NOT EXISTS clinical_note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), note_id UUID NOT NULL, patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0), state VARCHAR(20) NOT NULL CHECK (state IN ('draft','signed','amended','entered_in_error')),
  confidentiality VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (confidentiality IN ('normal','restricted')),
  body TEXT NOT NULL, author_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  amendment_reason TEXT, signed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(note_id, version), CHECK (state = 'draft' OR signed_at IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinical_note_one_draft ON clinical_note_versions(note_id) WHERE state = 'draft';
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_time ON clinical_note_versions(patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_record_idempotency (
  actor_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE, key VARCHAR(100) NOT NULL,
  operation VARCHAR(80) NOT NULL, response JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(actor_staff_id, key)
);

CREATE OR REPLACE FUNCTION prevent_signed_note_mutation() RETURNS trigger AS $$
BEGIN
  IF OLD.state <> 'draft' THEN RAISE EXCEPTION 'Signed clinical notes are immutable; create an amendment' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS signed_note_immutable ON clinical_note_versions;
CREATE TRIGGER signed_note_immutable BEFORE UPDATE OR DELETE ON clinical_note_versions
FOR EACH ROW EXECUTE FUNCTION prevent_signed_note_mutation();
