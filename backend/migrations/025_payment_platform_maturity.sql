-- Additive payment lifecycle hardening. No monetary or clinical records are rewritten.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS status_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS quote_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ;

ALTER TABLE payment_webhook_events
  ADD COLUMN IF NOT EXISTS event_hash TEXT,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE payment_attempts
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS provider_request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency
  ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_order_unique
  ON payments(provider, provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_live_order
  ON payments(order_id)
  WHERE order_id IS NOT NULL AND status IN ('created','pending','success','verification_required','refund_pending');
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_event_hash
  ON payment_webhook_events(provider, event_hash) WHERE event_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_pending_reconciliation
  ON payments(updated_at, id) WHERE status IN ('created','pending','verification_required','refund_pending');

CREATE TABLE IF NOT EXISTS payment_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  status TEXT NOT NULL DEFAULT 'open',
  expected_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('open','investigating','resolved')),
  CHECK (severity IN ('warning','critical'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_exception_open_unique
  ON payment_exceptions(payment_id, exception_type) WHERE status <> 'resolved';
CREATE INDEX IF NOT EXISTS idx_payment_exceptions_queue
  ON payment_exceptions(status, severity, created_at, id);

CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  idempotency_key TEXT NOT NULL UNIQUE,
  requested_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  approved_by_staff_id UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
  provider_reference TEXT,
  provider_evidence_hash TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount > 0),
  CHECK (currency = 'INR'),
  CHECK (status IN ('requested','approved','processing','completed','failed','cancelled')),
  CHECK (approved_by_staff_id IS NULL OR approved_by_staff_id <> requested_by_staff_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_refund_provider_reference
  ON payment_refunds(provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON payment_refunds(payment_id, requested_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_currency_valid') THEN
    ALTER TABLE payments ADD CONSTRAINT payments_currency_valid CHECK (currency = 'INR') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_valid') THEN
    ALTER TABLE payments ADD CONSTRAINT payments_amount_valid CHECK (amount > 0 AND amount_paisa = ROUND(amount * 100)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_one_target') THEN
    ALTER TABLE payments ADD CONSTRAINT payments_one_target CHECK (num_nonnulls(order_id, appointment_id) = 1) NOT VALID;
  END IF;
END $$;
