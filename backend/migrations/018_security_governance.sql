-- Security/governance release gate. Existing legacy values remain readable for
-- authorized remediation, while new collection is frozen pending documented
-- purpose, privacy review, retention policy, and key-management approval.
ALTER TABLE patients
  ADD CONSTRAINT patients_abha_collection_frozen CHECK (abha_number IS NULL) NOT VALID,
  ADD CONSTRAINT patients_aadhaar_collection_frozen CHECK (aadhaar_last4 IS NULL) NOT VALID;

CREATE OR REPLACE FUNCTION block_ungoverned_clinical_notes()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Clinical note collection is disabled pending governance approval'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clinical_notes_governance_gate ON clinical_notes;
CREATE TRIGGER clinical_notes_governance_gate
BEFORE INSERT OR UPDATE ON clinical_notes
FOR EACH ROW EXECUTE FUNCTION block_ungoverned_clinical_notes();

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created
  ON audit_log(actor_staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_created
  ON audit_log(entity_type, entity_id, created_at DESC);
