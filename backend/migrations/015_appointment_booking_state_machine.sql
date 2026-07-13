-- Server-owned appointment booking state, immutable commercial/consent snapshots,
-- idempotent commands, and safe identity candidate review.

ALTER TABLE appointment_holds
  ADD COLUMN IF NOT EXISTS public_reference UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS booking_state TEXT NOT NULL DEFAULT 'slot_held',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fee_currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS policy_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_language TEXT,
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS booking_state TEXT NOT NULL DEFAULT 'payment_required',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fee_currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS policy_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_language TEXT,
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

UPDATE appointments
SET booking_state = CASE status
  WHEN 'confirmed' THEN 'confirmed'
  WHEN 'payment_pending' THEN 'payment_pending'
  WHEN 'payment_failed' THEN 'payment_failed'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE 'payment_required'
END;

CREATE TABLE IF NOT EXISTS booking_command_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  actor_source TEXT NOT NULL,
  correlation_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  response_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (command_type, idempotency_key)
);

CREATE TABLE IF NOT EXISTS patient_match_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  possible_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  reason_codes TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (candidate_patient_id <> possible_patient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_holds_public_reference ON appointment_holds(public_reference);
CREATE UNIQUE INDEX IF NOT EXISTS idx_holds_idempotency ON appointment_holds(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_holds_one_active_slot
  ON appointment_holds(doctor_id, appointment_date, start_time)
  WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_hold_once ON appointments(hold_id) WHERE hold_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_idempotency ON appointments(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_live_appointment
  ON payments(appointment_id)
  WHERE appointment_id IS NOT NULL AND status IN ('created', 'pending', 'success', 'verification_required');
CREATE INDEX IF NOT EXISTS idx_booking_commands_correlation ON booking_command_results(correlation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_patient_match_reviews_pending ON patient_match_reviews(status, created_at) WHERE status = 'pending';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointment_holds_booking_state_valid') THEN
    ALTER TABLE appointment_holds ADD CONSTRAINT appointment_holds_booking_state_valid CHECK
      (booking_state IN ('draft','slot_held','payment_required','payment_pending','confirmed','hold_expired','payment_failed','cancelled','refund_pending','refunded')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_booking_state_valid') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_booking_state_valid CHECK
      (booking_state IN ('draft','slot_held','payment_required','payment_pending','confirmed','hold_expired','payment_failed','cancelled','refund_pending','refunded')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_fee_snapshot_valid') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_fee_snapshot_valid CHECK
      (fee_amount IS NULL OR (fee_amount >= 0 AND fee_currency = 'INR')) NOT VALID;
  END IF;
END $$;
