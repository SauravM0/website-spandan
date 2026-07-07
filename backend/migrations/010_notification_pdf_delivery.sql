-- Notification/PDF delivery hardening for launch scope.

ALTER TABLE notification_outbox
  ALTER COLUMN status SET DEFAULT 'queued';

ALTER TABLE notification_outbox
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notification_outbox_payment_created
ON notification_outbox(payment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipts_issued_at
ON receipts(issued_at DESC);
