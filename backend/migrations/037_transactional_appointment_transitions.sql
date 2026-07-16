-- migration-phase: expand
-- Versioned appointment commands and immutable payment/waiver evidence.

CREATE TABLE IF NOT EXISTS appointment_payment_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('online','cash','waiver')),
  payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  reference TEXT,
  reason TEXT NOT NULL,
  recorded_by_staff_id UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (kind = 'online' AND payment_id IS NOT NULL AND amount > 0)
    OR (kind = 'cash' AND payment_id IS NULL AND amount > 0 AND reference IS NOT NULL)
    OR (kind = 'waiver' AND payment_id IS NULL AND amount IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_online_payment_evidence_unique
  ON appointment_payment_evidence(payment_id) WHERE payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS appointment_transition_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('confirm','check_in','complete','cancel','mark_no_show','mark_payment_failed')),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  from_booking_state TEXT NOT NULL,
  to_booking_state TEXT NOT NULL,
  version_before INTEGER NOT NULL,
  version_after INTEGER NOT NULL CHECK (version_after = version_before + 1),
  reason TEXT NOT NULL,
  evidence_id UUID REFERENCES appointment_payment_evidence(id) ON DELETE RESTRICT,
  actor_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  before_snapshot JSONB NOT NULL,
  after_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS appointment_transition_timeline
  ON appointment_transition_events(appointment_id, created_at, id);

CREATE OR REPLACE FUNCTION prevent_appointment_evidence_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Appointment payment and waiver evidence is immutable'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointment_payment_evidence_immutable ON appointment_payment_evidence;
CREATE TRIGGER appointment_payment_evidence_immutable
BEFORE UPDATE OR DELETE ON appointment_payment_evidence
FOR EACH ROW EXECUTE FUNCTION prevent_appointment_evidence_mutation();

DROP TRIGGER IF EXISTS appointment_transition_event_immutable ON appointment_transition_events;
CREATE TRIGGER appointment_transition_event_immutable
BEFORE UPDATE OR DELETE ON appointment_transition_events
FOR EACH ROW EXECUTE FUNCTION prevent_appointment_evidence_mutation();

CREATE OR REPLACE FUNCTION require_appointment_financial_evidence() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('confirmed','checked_in','completed')
     AND NOT EXISTS (
       SELECT 1 FROM appointment_payment_evidence evidence
       WHERE evidence.appointment_id = NEW.id
     ) THEN
    INSERT INTO appointment_payment_evidence
      (appointment_id,kind,payment_id,amount,currency,reference,reason)
    SELECT NEW.id,'online',payment.id,payment.amount,payment.currency,
           COALESCE(payment.provider_reference,payment.provider_order_id,payment.merchant_transaction_id),
           'Authoritative provider payment verified before appointment transition'
    FROM payments payment
    WHERE payment.appointment_id = NEW.id
      AND payment.status = 'success'
      AND payment.provider_evidence_hash IS NOT NULL
    ORDER BY payment.verified_at DESC NULLS LAST, payment.created_at DESC
    LIMIT 1
    ON CONFLICT (appointment_id) DO NOTHING;
  END IF;
  IF NEW.status IN ('confirmed','checked_in','completed')
     AND NOT EXISTS (
       SELECT 1 FROM appointment_payment_evidence evidence
       WHERE evidence.appointment_id = NEW.id
     ) THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Confirmed, checked-in, and completed appointments require payment or waiver evidence'
        USING ERRCODE = '23514';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      RAISE EXCEPTION 'Confirmed, checked-in, and completed appointments require payment or waiver evidence'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointment_financial_evidence_required ON appointments;
CREATE CONSTRAINT TRIGGER appointment_financial_evidence_required
AFTER INSERT OR UPDATE ON appointments
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION require_appointment_financial_evidence();
