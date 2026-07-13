-- Governed, append-only clinical observations. No thresholds or alerts are seeded:
-- those require named clinical owners and an approved escalation policy.
CREATE TABLE IF NOT EXISTS observation_catalog (
  code VARCHAR(60) NOT NULL,
  catalog_version INTEGER NOT NULL CHECK (catalog_version > 0),
  display VARCHAR(120) NOT NULL,
  value_kind VARCHAR(30) NOT NULL CHECK (value_kind IN ('quantity','blood_pressure','document_reference','summary')),
  allowed_units TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  allowed_contexts TEXT[] NOT NULL DEFAULT ARRAY['not_applicable']::TEXT[],
  plausible_min NUMERIC, plausible_max NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY(code,catalog_version),
  CHECK (plausible_min IS NULL OR plausible_max IS NULL OR plausible_max > plausible_min)
);

INSERT INTO observation_catalog(code,catalog_version,display,value_kind,allowed_units,allowed_contexts,plausible_min,plausible_max) VALUES
 ('blood_pressure',1,'Blood pressure','blood_pressure',ARRAY['mm[Hg]'],ARRAY['resting','standing','lying','other'],NULL,NULL),
 ('pulse',1,'Pulse','quantity',ARRAY['/min'],ARRAY['resting','after_activity','other'],NULL,NULL),
 ('body_weight',1,'Weight','quantity',ARRAY['kg'],ARRAY['not_applicable'],NULL,NULL),
 ('blood_glucose',1,'Blood glucose','quantity',ARRAY['mg/dL','mmol/L'],ARRAY['fasting','post_meal','random','other'],NULL,NULL),
 ('hba1c',1,'HbA1c','quantity',ARRAY['%','mmol/mol'],ARRAY['not_applicable'],NULL,NULL),
 ('tsh',1,'Thyroid stimulating hormone','quantity',ARRAY['m[IU]/L'],ARRAY['not_applicable'],NULL,NULL),
 ('total_cholesterol',1,'Total cholesterol','quantity',ARRAY['mg/dL','mmol/L'],ARRAY['fasting','non_fasting','unknown'],NULL,NULL),
 ('ldl_cholesterol',1,'LDL cholesterol','quantity',ARRAY['mg/dL','mmol/L'],ARRAY['fasting','non_fasting','unknown'],NULL,NULL),
 ('hdl_cholesterol',1,'HDL cholesterol','quantity',ARRAY['mg/dL','mmol/L'],ARRAY['fasting','non_fasting','unknown'],NULL,NULL),
 ('triglycerides',1,'Triglycerides','quantity',ARRAY['mg/dL','mmol/L'],ARRAY['fasting','non_fasting','unknown'],NULL,NULL),
 ('ecg_reference',1,'ECG report','document_reference',ARRAY[]::TEXT[],ARRAY['not_applicable'],NULL,NULL),
 ('echo_reference',1,'Echocardiogram report','document_reference',ARRAY[]::TEXT[],ARRAY['not_applicable'],NULL,NULL),
 ('cgm_summary',1,'CGM summary','summary',ARRAY[]::TEXT[],ARRAY['date_range'],NULL,NULL)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS observation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lineage_id UUID NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  supersedes_id UUID REFERENCES observation_versions(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  encounter_id UUID REFERENCES encounters(id) ON DELETE RESTRICT,
  catalog_code VARCHAR(60) NOT NULL,
  catalog_version INTEGER NOT NULL,
  value_kind VARCHAR(30) NOT NULL CHECK (value_kind IN ('quantity','blood_pressure','document_reference','summary')),
  numeric_value NUMERIC, systolic_value NUMERIC, diastolic_value NUMERIC,
  unit VARCHAR(30), text_summary TEXT,
  document_id UUID REFERENCES document_references(id) ON DELETE RESTRICT,
  context VARCHAR(40) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  effective_timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Kolkata',
  issued_at TIMESTAMPTZ,
  source VARCHAR(30) NOT NULL CHECK (source IN ('patient','guardian','clinician','lab','device','document','import')),
  performer TEXT, method TEXT, specimen TEXT, device TEXT,
  reference_range_text TEXT, interpretation_text TEXT, interpretation_source TEXT,
  status VARCHAR(30) NOT NULL CHECK (status IN ('preliminary','final','amended','entered_in_error')),
  verification_status VARCHAR(30) NOT NULL CHECK (verification_status IN ('unverified','verified','unable_to_verify')),
  quality_status VARCHAR(30) NOT NULL CHECK (quality_status IN ('accepted','needs_review')),
  raw_source TEXT NOT NULL,
  provenance JSONB NOT NULL DEFAULT '{}'::JSONB,
  correction_reason TEXT,
  authored_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  authored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(catalog_code,catalog_version) REFERENCES observation_catalog(code,catalog_version),
  UNIQUE(lineage_id,version),
  CHECK (version = 1 OR supersedes_id IS NOT NULL),
  CHECK (effective_timezone = 'Asia/Kolkata'),
  CHECK (
    (value_kind='quantity' AND numeric_value IS NOT NULL AND unit IS NOT NULL AND systolic_value IS NULL AND diastolic_value IS NULL AND document_id IS NULL AND text_summary IS NULL) OR
    (value_kind='blood_pressure' AND systolic_value IS NOT NULL AND diastolic_value IS NOT NULL AND unit IS NOT NULL AND numeric_value IS NULL AND document_id IS NULL AND text_summary IS NULL) OR
    (value_kind='document_reference' AND document_id IS NOT NULL AND numeric_value IS NULL AND unit IS NULL AND systolic_value IS NULL AND diastolic_value IS NULL AND text_summary IS NULL) OR
    (value_kind='summary' AND text_summary IS NOT NULL AND numeric_value IS NULL AND unit IS NULL AND systolic_value IS NULL AND diastolic_value IS NULL AND document_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_observation_patient_series ON observation_versions(patient_id,catalog_code,unit,context,effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_observation_review_queue ON observation_versions(quality_status,verification_status,effective_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_observation_one_successor ON observation_versions(supersedes_id) WHERE supersedes_id IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_observation_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Clinical observations are immutable; append a superseding version' USING ERRCODE='55000'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS observation_immutable ON observation_versions;
CREATE TRIGGER observation_immutable BEFORE UPDATE OR DELETE ON observation_versions FOR EACH ROW EXECUTE FUNCTION prevent_observation_mutation();
