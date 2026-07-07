-- Audit cleanup: package editor parity, safe lead archiving, notes, outbox, refunds/settings

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_applicable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS convenience_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_status TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS badge_text TEXT,
  ADD COLUMN IF NOT EXISTS available_days TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS terms_text TEXT;

ALTER TABLE appointment_requests
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_request_id UUID NOT NULL REFERENCES appointment_requests(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outbox_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  reason TEXT,
  provider_reference TEXT,
  raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_active
ON payments(order_id)
WHERE order_id IS NOT NULL AND status IN ('created', 'pending', 'success');

CREATE INDEX IF NOT EXISTS idx_packages_featured ON packages(is_featured, display_order);
CREATE INDEX IF NOT EXISTS idx_leads_archived ON appointment_requests(is_archived, archived_at);
CREATE INDEX IF NOT EXISTS idx_lead_notes_request ON lead_notes(appointment_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_jobs(status, run_after);
