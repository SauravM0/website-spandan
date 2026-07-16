-- migration-phase: expand
-- Versioned package-order workflow, ownership, pricing evidence, and immutable timeline.

ALTER TABLE package_orders
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS owner_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_confirmed_by UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preparation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfilment_notes TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

UPDATE package_orders SET status = CASE
  WHEN status = 'draft' THEN 'submitted'
  WHEN status = 'amount_pending' THEN 'price_review'
  WHEN status = 'payment_failed' THEN 'awaiting_payment'
  ELSE status
END;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_order_lifecycle_status_valid') THEN
    ALTER TABLE package_orders ADD CONSTRAINT package_order_lifecycle_status_valid CHECK (
      status IN ('submitted','price_review','awaiting_payment','paid','scheduled',
                 'collection_pending','processing','ready','fulfilled','cancelled',
                 'refund_pending','refunded')
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'package_order_preparation_status_valid') THEN
    ALTER TABLE package_orders ADD CONSTRAINT package_order_preparation_status_valid CHECK (
      preparation_status IN ('pending','sent','acknowledged','not_required')
    ) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS package_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES package_orders(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  version_before INTEGER NOT NULL,
  version_after INTEGER NOT NULL CHECK (version_after = version_before + 1),
  reason TEXT NOT NULL,
  actor_staff_id UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id,idempotency_key)
);

CREATE TABLE IF NOT EXISTS package_order_price_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES package_orders(id) ON DELETE RESTRICT,
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal > 0),
  tax_total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  fee_total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fee_total >= 0),
  total NUMERIC(10,2) NOT NULL CHECK (total = subtotal + tax_total + fee_total),
  item_prices JSONB NOT NULL,
  reason TEXT NOT NULL,
  confirmed_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS package_order_action_queue
  ON package_orders(status, due_at NULLS FIRST, updated_at, id)
  WHERE status NOT IN ('fulfilled','cancelled','refunded');
CREATE INDEX IF NOT EXISTS package_order_owner_queue
  ON package_orders(owner_staff_id, status, due_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS package_order_timeline
  ON package_order_events(order_id, created_at, id);

CREATE OR REPLACE FUNCTION prevent_package_order_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Package order events and price confirmations are immutable'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS package_order_events_immutable ON package_order_events;
CREATE TRIGGER package_order_events_immutable
BEFORE UPDATE OR DELETE ON package_order_events
FOR EACH ROW EXECUTE FUNCTION prevent_package_order_history_mutation();

DROP TRIGGER IF EXISTS package_order_price_confirmation_immutable ON package_order_price_confirmations;
CREATE TRIGGER package_order_price_confirmation_immutable
BEFORE UPDATE OR DELETE ON package_order_price_confirmations
FOR EACH ROW EXECUTE FUNCTION prevent_package_order_history_mutation();
