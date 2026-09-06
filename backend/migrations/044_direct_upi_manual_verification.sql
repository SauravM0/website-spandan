-- migration-phase: expand
-- Versioned Direct UPI configuration, evidence, and manual verification support.

CREATE TABLE IF NOT EXISTS payment_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_version BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  payment_mode TEXT NOT NULL DEFAULT 'disabled'
    CHECK (payment_mode IN ('disabled','direct_upi','phonepe')),
  direct_upi_enabled BOOLEAN NOT NULL DEFAULT false,
  gateway_enabled BOOLEAN NOT NULL DEFAULT false,
  active_provider TEXT NOT NULL DEFAULT 'disabled'
    CHECK (active_provider IN ('disabled','direct_upi','phonepe')),
  merchant_upi_vpa TEXT,
  merchant_display_name TEXT,
  merchant_payment_contact TEXT,
  merchant_category TEXT,
  upi_transaction_note_template TEXT,
  payment_order_expiry_minutes INTEGER NOT NULL DEFAULT 20
    CHECK (payment_order_expiry_minutes BETWEEN 5 AND 1440),
  verification_reservation_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (verification_reservation_minutes BETWEEN 5 AND 1440),
  utr_required BOOLEAN NOT NULL DEFAULT true,
  screenshot_enabled BOOLEAN NOT NULL DEFAULT false,
  screenshot_required BOOLEAN NOT NULL DEFAULT false,
  pay_at_clinic_enabled BOOLEAN NOT NULL DEFAULT false,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_staff_id UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  change_reason TEXT NOT NULL,
  CHECK (merchant_category IS NULL OR merchant_category ~ '^[0-9]{4}$'),
  CHECK (NOT screenshot_required OR screenshot_enabled),
  CHECK (
    NOT (is_active AND active_provider = 'direct_upi' AND direct_upi_enabled)
    OR (
      merchant_upi_vpa IS NOT NULL
      AND merchant_upi_vpa ~* '^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$'
      AND merchant_display_name IS NOT NULL
      AND length(btrim(merchant_display_name)) BETWEEN 2 AND 80
      AND upi_transaction_note_template IS NOT NULL
      AND length(upi_transaction_note_template) BETWEEN 3 AND 80
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_configurations_one_active
  ON payment_configurations ((true)) WHERE is_active;
CREATE INDEX IF NOT EXISTS payment_configurations_effective
  ON payment_configurations (effective_from DESC, configuration_version DESC);

INSERT INTO payment_configurations (
  payment_mode,direct_upi_enabled,gateway_enabled,active_provider,
  payment_order_expiry_minutes,verification_reservation_minutes,
  utr_required,screenshot_enabled,screenshot_required,pay_at_clinic_enabled,
  change_reason,is_active
)
SELECT 'disabled',false,false,'disabled',20,30,true,false,false,false,
       'Safe disabled bootstrap configuration',true
WHERE NOT EXISTS (SELECT 1 FROM payment_configurations);

CREATE OR REPLACE FUNCTION protect_payment_configuration_history() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Payment configuration history cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.configuration_version IS DISTINCT FROM OLD.configuration_version
     OR NEW.payment_mode IS DISTINCT FROM OLD.payment_mode
     OR NEW.direct_upi_enabled IS DISTINCT FROM OLD.direct_upi_enabled
     OR NEW.gateway_enabled IS DISTINCT FROM OLD.gateway_enabled
     OR NEW.active_provider IS DISTINCT FROM OLD.active_provider
     OR NEW.merchant_upi_vpa IS DISTINCT FROM OLD.merchant_upi_vpa
     OR NEW.merchant_display_name IS DISTINCT FROM OLD.merchant_display_name
     OR NEW.merchant_payment_contact IS DISTINCT FROM OLD.merchant_payment_contact
     OR NEW.merchant_category IS DISTINCT FROM OLD.merchant_category
     OR NEW.upi_transaction_note_template IS DISTINCT FROM OLD.upi_transaction_note_template
     OR NEW.payment_order_expiry_minutes IS DISTINCT FROM OLD.payment_order_expiry_minutes
     OR NEW.verification_reservation_minutes IS DISTINCT FROM OLD.verification_reservation_minutes
     OR NEW.utr_required IS DISTINCT FROM OLD.utr_required
     OR NEW.screenshot_enabled IS DISTINCT FROM OLD.screenshot_enabled
     OR NEW.screenshot_required IS DISTINCT FROM OLD.screenshot_required
     OR NEW.pay_at_clinic_enabled IS DISTINCT FROM OLD.pay_at_clinic_enabled
     OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
     OR NEW.updated_by_staff_id IS DISTINCT FROM OLD.updated_by_staff_id
     OR NEW.updated_at IS DISTINCT FROM OLD.updated_at
     OR NEW.change_reason IS DISTINCT FROM OLD.change_reason
     OR OLD.is_active = false
     OR NEW.is_active = true THEN
    RAISE EXCEPTION 'Payment configuration versions are immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_configuration_history_immutable ON payment_configurations;
CREATE TRIGGER payment_configuration_history_immutable
BEFORE UPDATE OR DELETE ON payment_configurations
FOR EACH ROW EXECUTE FUNCTION protect_payment_configuration_history();

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_creation_token_hash CHAR(64);
ALTER TABLE package_orders
  ADD COLUMN IF NOT EXISTS payment_creation_token_hash CHAR(64);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS public_order_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_configuration_id UUID REFERENCES payment_configurations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS payment_configuration_version BIGINT,
  ADD COLUMN IF NOT EXISTS payment_configuration_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS merchant_upi_vpa_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS merchant_display_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS upi_transaction_note_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS patient_returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS utr_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS utr_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS utr_fingerprint CHAR(64),
  ADD COLUMN IF NOT EXISTS verified_by_staff_id UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS verification_note TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS amount_mismatch_reason TEXT,
  ADD COLUMN IF NOT EXISTS observed_amount_paisa INTEGER CHECK (observed_amount_paisa IS NULL OR observed_amount_paisa >= 0),
  ADD COLUMN IF NOT EXISTS duplicate_of_payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS clarification_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reserved_until TIMESTAMPTZ,
  ADD CONSTRAINT payments_duplicate_not_self CHECK (duplicate_of_payment_id IS NULL OR duplicate_of_payment_id <> id) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS payments_public_order_reference_unique
  ON payments(public_order_reference) WHERE public_order_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_utr_fingerprint_unique
  ON payments(utr_fingerprint) WHERE utr_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_direct_upi_verification_queue
  ON payments(status,utr_submitted_at,id)
  WHERE provider='direct_upi' AND status IN ('verification_pending','clarification_requested','amount_mismatch');
CREATE INDEX IF NOT EXISTS payments_direct_upi_expiry
  ON payments(expires_at,id)
  WHERE provider='direct_upi' AND status IN ('created','payment_initiated');

CREATE OR REPLACE FUNCTION protect_direct_upi_payment_snapshot() RETURNS trigger AS $$
BEGIN
  IF OLD.provider='direct_upi' AND (
    NEW.provider IS DISTINCT FROM OLD.provider
    OR NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.appointment_id IS DISTINCT FROM OLD.appointment_id
    OR NEW.public_order_reference IS DISTINCT FROM OLD.public_order_reference
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.amount_paisa IS DISTINCT FROM OLD.amount_paisa
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.payment_configuration_id IS DISTINCT FROM OLD.payment_configuration_id
    OR NEW.payment_configuration_version IS DISTINCT FROM OLD.payment_configuration_version
    OR NEW.payment_configuration_snapshot IS DISTINCT FROM OLD.payment_configuration_snapshot
    OR NEW.merchant_upi_vpa_snapshot IS DISTINCT FROM OLD.merchant_upi_vpa_snapshot
    OR NEW.merchant_display_name_snapshot IS DISTINCT FROM OLD.merchant_display_name_snapshot
    OR NEW.upi_transaction_note_snapshot IS DISTINCT FROM OLD.upi_transaction_note_snapshot
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
  ) THEN
    RAISE EXCEPTION 'Direct UPI payment configuration and amount snapshots are immutable'
      USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS direct_upi_payment_snapshot_immutable ON payments;
CREATE TRIGGER direct_upi_payment_snapshot_immutable
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION protect_direct_upi_payment_snapshot();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='direct_upi_payment_fields_consistent') THEN
    ALTER TABLE payments ADD CONSTRAINT direct_upi_payment_fields_consistent CHECK (
      provider <> 'direct_upi'
      OR (
        public_order_reference IS NOT NULL
        AND amount_paisa IS NOT NULL AND amount_paisa > 0
        AND currency='INR'
        AND payment_configuration_id IS NOT NULL
        AND payment_configuration_version IS NOT NULL
        AND merchant_upi_vpa_snapshot IS NOT NULL
        AND merchant_display_name_snapshot IS NOT NULL
        AND upi_transaction_note_snapshot IS NOT NULL
        AND expires_at IS NOT NULL
      )
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='direct_upi_paid_requires_verifier') THEN
    ALTER TABLE payments ADD CONSTRAINT direct_upi_paid_requires_verifier CHECK (
      provider <> 'direct_upi' OR status <> 'success'
      OR (verified_by_staff_id IS NOT NULL AND verified_at IS NOT NULL AND utr_fingerprint IS NOT NULL)
    ) NOT VALID;
  END IF;
END $$;

ALTER TABLE public_payment_capabilities
  DROP CONSTRAINT IF EXISTS public_payment_capabilities_purpose_check;
ALTER TABLE public_payment_capabilities
  ADD CONSTRAINT public_payment_capabilities_purpose_check
  CHECK (purpose IN ('status','receipt','manage'));

CREATE TABLE IF NOT EXISTS payment_verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('patient','staff','system','provider')),
  actor_staff_id UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  version_before INTEGER NOT NULL,
  version_after INTEGER NOT NULL CHECK (version_after >= version_before),
  reason_category TEXT NOT NULL,
  metadata_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id,idempotency_key),
  CHECK ((actor_type='staff')=(actor_staff_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS payment_verification_events_timeline
  ON payment_verification_events(payment_id,created_at,id);

CREATE OR REPLACE FUNCTION prevent_payment_verification_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Payment verification events are immutable' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS payment_verification_events_immutable ON payment_verification_events;
CREATE TRIGGER payment_verification_events_immutable
BEFORE UPDATE OR DELETE ON payment_verification_events
FOR EACH ROW EXECUTE FUNCTION prevent_payment_verification_event_mutation();

CREATE TABLE IF NOT EXISTS payment_evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  request_hash CHAR(64) NOT NULL,
  storage_key UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  original_filename TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image/jpeg','image/png')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  checksum_sha256 CHAR(64) NOT NULL,
  status TEXT NOT NULL DEFAULT 'quarantined'
    CHECK (status IN ('quarantined','clean','rejected','deleted')),
  scanner_result TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_expires_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  UNIQUE(payment_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS payment_evidence_files_payment
  ON payment_evidence_files(payment_id,uploaded_at DESC);

DROP TRIGGER IF EXISTS payment_provider_evidence_immutable ON payments;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payment_provider_evidence_consistent;
ALTER TABLE payments ADD CONSTRAINT payment_provider_evidence_consistent CHECK (
  (provider_evidence_hash IS NULL AND provider_evidence_source IS NULL AND provider_observed_at IS NULL)
  OR (
    provider_evidence_hash IS NOT NULL
    AND provider_evidence_source IN ('phonepe.webhook','phonepe.status_api','phonepe.reconciliation','test.mock','staff.manual_upi')
    AND provider_observed_at IS NOT NULL
  )
) NOT VALID;
CREATE TRIGGER payment_provider_evidence_immutable
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION protect_payment_provider_evidence();

INSERT INTO worker_jobs(name,interval_seconds,next_run_at,max_attempts)
VALUES('direct-upi-expiry',60,NOW(),5)
ON CONFLICT(name) DO UPDATE SET interval_seconds=EXCLUDED.interval_seconds;
