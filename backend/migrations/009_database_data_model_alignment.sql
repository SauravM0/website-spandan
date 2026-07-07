-- Database/data-model alignment: patient demographics, immutable payment events,
-- receipt metadata, notification outbox, media assets, and audit events.

CREATE SEQUENCE IF NOT EXISTS appointment_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS internal_payment_number_seq START 1;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS exact_dob_known BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_months INTEGER,
  ADD COLUMN IF NOT EXISTS age_days INTEGER,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS abha_number TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_last4 TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE patients
SET exact_dob_known = true
WHERE date_of_birth IS NOT NULL;

ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_age_or_dob;

CREATE TABLE IF NOT EXISTS patient_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'guardian',
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO patient_guardians (patient_id, name, relation, phone, is_primary, created_at)
SELECT g.patient_id, g.full_name, g.relationship, g.phone, true, g.created_at
FROM guardians g
WHERE NOT EXISTS (
  SELECT 1 FROM patient_guardians pg
  WHERE pg.patient_id = g.patient_id
    AND pg.name = g.full_name
    AND COALESCE(pg.phone, '') = COALESCE(g.phone, '')
);

ALTER TABLE doctor_availability_rules
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS doctor_availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  public_note TEXT,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO doctor_availability_overrides (
  id, doctor_id, date, type, start_time, end_time, public_note, internal_note, created_at, updated_at
)
SELECT
  ce.id,
  ce.doctor_id,
  ce.exception_date,
  ce.override_type,
  ce.start_time,
  ce.end_time,
  ce.public_note,
  ce.internal_note,
  ce.created_at,
  ce.updated_at
FROM calendar_exceptions ce
ON CONFLICT (id) DO NOTHING;

ALTER TABLE appointment_holds
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_reference TEXT;

UPDATE appointment_holds
SET
  starts_at = COALESCE(starts_at, (appointment_date + start_time) AT TIME ZONE 'Asia/Kolkata'),
  ends_at = COALESCE(ends_at, (appointment_date + end_time) AT TIME ZONE 'Asia/Kolkata')
WHERE appointment_date IS NOT NULL
  AND start_time IS NOT NULL
  AND end_time IS NOT NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_number TEXT,
  ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'consultation',
  ADD COLUMN IF NOT EXISTS consultation_mode TEXT NOT NULL DEFAULT 'in_clinic',
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amount_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'not_required';

UPDATE appointments
SET
  starts_at = COALESCE(starts_at, (appointment_date + start_time) AT TIME ZONE 'Asia/Kolkata'),
  ends_at = COALESCE(ends_at, (appointment_date + end_time) AT TIME ZONE 'Asia/Kolkata')
WHERE appointment_date IS NOT NULL
  AND start_time IS NOT NULL
  AND end_time IS NOT NULL;

UPDATE appointments
SET appointment_number = 'SPA-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(nextval('appointment_number_seq')::TEXT, 6, '0')
WHERE appointment_number IS NULL;

ALTER TABLE package_orders
  ADD COLUMN IF NOT EXISTS contact_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS discount_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gateway_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC(10,2) NOT NULL DEFAULT 0;

UPDATE package_orders
SET
  contact_name = COALESCE(contact_name, purchaser_name),
  preferred_language = COALESCE(NULLIF(preferred_language, ''), source_language, 'en'),
  tax_total = CASE WHEN tax_total = 0 THEN tax_amount ELSE tax_total END,
  gateway_fee = CASE WHEN gateway_fee = 0 THEN fee_amount ELSE gateway_fee END,
  grand_total = CASE WHEN grand_total = 0 THEN total_amount ELSE grand_total END;

ALTER TABLE package_order_items
  ADD COLUMN IF NOT EXISTS package_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS preparation_snapshot TEXT;

UPDATE package_order_items
SET
  package_name_snapshot = COALESCE(package_name_snapshot, package_name),
  preparation_snapshot = COALESCE(preparation_snapshot, prep_instructions);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS internal_payment_number TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS gateway_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merchant_order_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_state TEXT,
  ADD COLUMN IF NOT EXISTS failure_code TEXT,
  ADD COLUMN IF NOT EXISTS failure_message TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

UPDATE payments
SET
  internal_payment_number = COALESCE(
    internal_payment_number,
    'SPPAY-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(nextval('internal_payment_number_seq')::TEXT, 6, '0')
  ),
  merchant_order_id = COALESCE(merchant_order_id, merchant_transaction_id),
  provider_transaction_id = COALESCE(provider_transaction_id, provider_reference),
  mode = COALESCE(mode, payment_method),
  paid_at = CASE WHEN status = 'success' THEN COALESCE(paid_at, verified_at, updated_at) ELSE paid_at END;

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  payload_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error TEXT
);

INSERT INTO payment_events (
  payment_id, event_type, provider_event_id, payload_redacted, payload_hash, received_at, processed_at, processing_status
)
SELECT
  source.payment_id,
  source.event_name,
  source.provider_event_id,
  source.raw_payload,
  source.payload_hash,
  source.created_at,
  source.created_at,
  'processed'
FROM (
  SELECT DISTINCT ON (encode(digest(pwe.raw_payload::TEXT, 'sha256'), 'hex'))
    pwe.payment_id,
    pwe.event_name,
    pwe.id::TEXT AS provider_event_id,
    pwe.raw_payload,
    encode(digest(pwe.raw_payload::TEXT, 'sha256'), 'hex') AS payload_hash,
    pwe.created_at
  FROM payment_webhook_events pwe
  WHERE pwe.payment_id IS NOT NULL
  ORDER BY encode(digest(pwe.raw_payload::TEXT, 'sha256'), 'hex'), pwe.created_at ASC
) source
ON CONFLICT DO NOTHING;

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS pdf_storage_key TEXT,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

UPDATE receipts
SET
  pdf_storage_key = COALESCE(pdf_storage_key, object_storage_key),
  issued_at = COALESCE(issued_at, generated_at);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  order_id UUID REFERENCES package_orders(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  template TEXT NOT NULL,
  destination TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  alt_text TEXT,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_redacted JSONB,
  after_redacted JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT
);

INSERT INTO audit_events (actor_staff_id, action, entity_type, entity_id, after_redacted, created_at)
SELECT actor_staff_id, action, entity_type, entity_id, metadata, created_at
FROM audit_log
ON CONFLICT DO NOTHING;

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS tax_label TEXT,
  ADD COLUMN IF NOT EXISTS fasting_hours INTEGER,
  ADD COLUMN IF NOT EXISTS date_optional BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS publish_status TEXT,
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_until DATE;

UPDATE packages
SET
  tax_label = COALESCE(tax_label, tax_name),
  publish_status = COALESCE(publish_status, publication_status),
  effective_from = COALESCE(effective_from, effective_start),
  effective_until = COALESCE(effective_until, effective_end),
  date_optional = NOT preferred_date_required;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_age_values_valid') THEN
    ALTER TABLE patients
      ADD CONSTRAINT patients_age_values_valid
      CHECK (
        (age_years IS NULL OR age_years BETWEEN 0 AND 130)
        AND (age_months IS NULL OR age_months BETWEEN 0 AND 11)
        AND (age_days IS NULL OR age_days BETWEEN 0 AND 30)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_pincode_format') THEN
    ALTER TABLE patients
      ADD CONSTRAINT patients_pincode_format
      CHECK (pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$') NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_aadhaar_last4_format') THEN
    ALTER TABLE patients
      ADD CONSTRAINT patients_aadhaar_last4_format
      CHECK (aadhaar_last4 IS NULL OR aadhaar_last4 ~ '^[0-9]{4}$') NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doctor_availability_rules_time_valid') THEN
    ALTER TABLE doctor_availability_rules
      ADD CONSTRAINT doctor_availability_rules_time_valid
      CHECK (end_time > start_time);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doctor_availability_overrides_time_valid') THEN
    ALTER TABLE doctor_availability_overrides
      ADD CONSTRAINT doctor_availability_overrides_time_valid
      CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointment_holds_time_valid') THEN
    ALTER TABLE appointment_holds
      ADD CONSTRAINT appointment_holds_time_valid
      CHECK (
        (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
        AND end_time > start_time
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_time_valid') THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_time_valid
      CHECK (
        (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
        AND end_time > start_time
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_one_target') THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_one_target
      CHECK ((order_id IS NOT NULL)::INTEGER + (appointment_id IS NOT NULL)::INTEGER = 1) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_non_negative') THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_amount_non_negative
      CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packages_fasting_hours_valid') THEN
    ALTER TABLE packages
      ADD CONSTRAINT packages_fasting_hours_valid
      CHECK (fasting_hours IS NULL OR fasting_hours BETWEEN 0 AND 24);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_number_unique ON appointments(appointment_number);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_starts_at ON appointments(doctor_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status_starts_at ON appointments(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_holds_doctor_starts_expiry ON appointment_holds(doctor_id, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_package_orders_status_created_at ON package_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_package_orders_contact_patient ON package_orders(contact_patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_internal_number_unique ON payments(internal_payment_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_merchant_order_id_unique ON payments(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction_id ON payments(provider_transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_provider_event
ON payment_events(provider_event_id)
WHERE provider_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_payload_hash ON payment_events(payload_hash);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_patient_guardians_patient ON patient_guardians(patient_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id, created_at DESC);
