-- PhonePe Standard Checkout hardening: idempotent receipts, raw webhook audit, receipt sequence.

CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS amount_paisa INTEGER,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS object_storage_key TEXT,
  ADD COLUMN IF NOT EXISTS checksum TEXT,
  ADD COLUMN IF NOT EXISTS receipt_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_payment_unique ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_transaction_id ON payments(merchant_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON payments(provider_order_id);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'phonepe',
  event_name TEXT NOT NULL,
  merchant_order_id TEXT,
  provider_order_id TEXT,
  provider_transaction_id TEXT,
  status TEXT NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_payment ON payment_webhook_events(payment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_order ON payment_webhook_events(merchant_order_id, created_at DESC);
