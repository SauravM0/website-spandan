-- migration-phase: expand
-- Human-reviewed patient identity linking; source records and evidence remain immutable.

ALTER TABLE patient_match_reviews
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS canonical_patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS confirmed_factors TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='patient_match_review_status_valid') THEN
    ALTER TABLE patient_match_reviews ADD CONSTRAINT patient_match_review_status_valid CHECK (
      status IN ('pending','same_person','different_person','insufficient_evidence')
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='patient_match_review_resolution_consistent') THEN
    ALTER TABLE patient_match_reviews ADD CONSTRAINT patient_match_review_resolution_consistent CHECK (
      (status='pending' AND reviewed_at IS NULL)
      OR (status<>'pending' AND reviewed_at IS NOT NULL AND resolution=status)
    ) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS patient_identity_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES patient_match_reviews(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('same_person','different_person','insufficient_evidence')),
  canonical_patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
  confirmed_factors TEXT[] NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL,
  version_before INTEGER NOT NULL,
  version_after INTEGER NOT NULL CHECK (version_after=version_before+1),
  actor_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  response_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(review_id,idempotency_key),
  CHECK ((outcome='same_person')=(canonical_patient_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS patient_identity_review_queue
  ON patient_match_reviews(status,created_at,id);
CREATE INDEX IF NOT EXISTS patient_identity_review_timeline
  ON patient_identity_review_events(review_id,created_at,id);
CREATE INDEX IF NOT EXISTS patient_redirects_active_target
  ON patient_redirects(target_patient_id,source_patient_id) WHERE reversed_at IS NULL;

CREATE OR REPLACE FUNCTION prevent_patient_identity_evidence_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Patient identity review evidence is immutable' USING ERRCODE='55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patient_identity_review_event_immutable ON patient_identity_review_events;
CREATE TRIGGER patient_identity_review_event_immutable
BEFORE UPDATE OR DELETE ON patient_identity_review_events
FOR EACH ROW EXECUTE FUNCTION prevent_patient_identity_evidence_mutation();

CREATE OR REPLACE FUNCTION protect_patient_source_records() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Patient source records cannot be deleted; archive or reverse an identity link instead'
    USING ERRCODE='55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patient_source_record_delete_blocked ON patients;
CREATE TRIGGER patient_source_record_delete_blocked
BEFORE DELETE ON patients FOR EACH ROW EXECUTE FUNCTION protect_patient_source_records();

CREATE OR REPLACE FUNCTION protect_patient_redirect_evidence() RETURNS trigger AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Patient identity link evidence cannot be deleted or rewritten' USING ERRCODE='55000';
  END IF;
  IF NEW.source_patient_id<>OLD.source_patient_id
     OR NEW.target_patient_id<>OLD.target_patient_id OR NEW.reason<>OLD.reason
     OR NEW.merged_by_staff_id<>OLD.merged_by_staff_id OR NEW.merged_at<>OLD.merged_at THEN
    RAISE EXCEPTION 'Patient identity link evidence cannot be deleted or rewritten' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patient_redirect_evidence_protected ON patient_redirects;
CREATE TRIGGER patient_redirect_evidence_protected
BEFORE UPDATE OR DELETE ON patient_redirects
FOR EACH ROW EXECUTE FUNCTION protect_patient_redirect_evidence();

INSERT INTO patient_match_reviews(candidate_patient_id,possible_patient_id,reason_codes)
SELECT newer.id,older.id,ARRAY_REMOVE(ARRAY[
  CASE WHEN LOWER(BTRIM(newer.full_name))=LOWER(BTRIM(older.full_name)) THEN 'name' END,
  CASE WHEN newer.date_of_birth IS NOT NULL AND newer.date_of_birth=older.date_of_birth THEN 'date_of_birth' END,
  CASE WHEN LENGTH(regexp_replace(newer.phone,'\D','','g'))>=10 AND RIGHT(regexp_replace(newer.phone,'\D','','g'),10)=RIGHT(regexp_replace(older.phone,'\D','','g'),10) THEN 'phone' END,
  CASE WHEN EXISTS(
    SELECT 1 FROM patient_identifiers left_id JOIN patient_identifiers right_id
      ON right_id.system=left_id.system AND right_id.value_normalized=left_id.value_normalized
     AND right_id.status='active'
    WHERE left_id.patient_id=newer.id AND right_id.patient_id=older.id AND left_id.status='active'
  ) THEN 'authorized_identifier' END
],NULL)
FROM patients newer JOIN patients older ON newer.id>older.id
WHERE newer.archived_at IS NULL AND older.archived_at IS NULL
  AND (
    (LENGTH(regexp_replace(newer.phone,'\D','','g'))>=10 AND RIGHT(regexp_replace(newer.phone,'\D','','g'),10)=RIGHT(regexp_replace(older.phone,'\D','','g'),10))
    OR (LOWER(BTRIM(newer.full_name))=LOWER(BTRIM(older.full_name)) AND newer.date_of_birth IS NOT NULL AND newer.date_of_birth=older.date_of_birth)
    OR EXISTS(
      SELECT 1 FROM patient_identifiers left_id JOIN patient_identifiers right_id
        ON right_id.system=left_id.system AND right_id.value_normalized=left_id.value_normalized
       AND right_id.status='active'
      WHERE left_id.patient_id=newer.id AND right_id.patient_id=older.id AND left_id.status='active'
    )
  )
  AND NOT EXISTS(
    SELECT 1 FROM patient_match_reviews review
    WHERE (review.candidate_patient_id=newer.id AND review.possible_patient_id=older.id)
       OR (review.candidate_patient_id=older.id AND review.possible_patient_id=newer.id)
  );
