-- Medication statements are patient/guardian reports or clinician-reconciled history.
-- They are never prescriptions or medication orders.
CREATE TABLE IF NOT EXISTS medication_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  encounter_id UUID REFERENCES encounters(id) ON DELETE RESTRICT,
  lineage_id UUID NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  supersedes_id UUID REFERENCES medication_statements(id) ON DELETE RESTRICT,
  display TEXT NOT NULL CHECK (char_length(trim(display)) BETWEEN 1 AND 500),
  original_text TEXT NOT NULL CHECK (char_length(trim(original_text)) BETWEEN 1 AND 4000),
  code_system VARCHAR(120), code VARCHAR(120),
  strength_value NUMERIC, strength_unit VARCHAR(40), form VARCHAR(80),
  dose_value NUMERIC, dose_unit VARCHAR(40), route VARCHAR(80), frequency_text VARCHAR(255),
  indication TEXT, start_date DATE, end_date DATE,
  status VARCHAR(30) NOT NULL CHECK (status IN ('active','stopped','unknown','entered_in_error')),
  verification_status VARCHAR(30) NOT NULL CHECK (verification_status IN ('unverified','verified','unable_to_verify')),
  source VARCHAR(30) NOT NULL CHECK (source IN ('patient','guardian','clinician','document','import')),
  patient_reported BOOLEAN NOT NULL,
  prescriber_text VARCHAR(255), adherence_note TEXT,
  ambiguity_notes TEXT,
  reconciliation_action VARCHAR(30) CHECK (reconciliation_action IN ('confirm','correct','duplicate','stopped','unable_to_verify')),
  change_reason TEXT,
  authored_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  authored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((strength_value IS NULL) = (strength_unit IS NULL)),
  CHECK ((dose_value IS NULL) = (dose_unit IS NULL)),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CHECK (verification_status <> 'verified' OR encounter_id IS NOT NULL),
  CHECK (NOT patient_reported OR source IN ('patient','guardian')),
  CHECK (version = 1 OR supersedes_id IS NOT NULL),
  UNIQUE(lineage_id, version)
);
CREATE INDEX IF NOT EXISTS idx_medication_patient_current
  ON medication_statements(patient_id, lineage_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_medication_reconciliation_queue
  ON medication_statements(patient_id, verification_status, authored_at DESC);

CREATE OR REPLACE FUNCTION prevent_medication_statement_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Medication history is immutable; append a reconciled version' USING ERRCODE='55000';
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS medication_statement_immutable ON medication_statements;
CREATE TRIGGER medication_statement_immutable BEFORE UPDATE OR DELETE ON medication_statements
FOR EACH ROW EXECUTE FUNCTION prevent_medication_statement_mutation();
