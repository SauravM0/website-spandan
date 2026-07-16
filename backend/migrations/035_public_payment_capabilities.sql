-- migration-phase: expand
-- Opaque, purpose-bound public capabilities replace payment and receipt identifiers.

CREATE TABLE IF NOT EXISTS public_payment_capabilities (
  token_hash CHAR(64) PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('status','receipt')),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_public_payment_capabilities_lookup
  ON public_payment_capabilities(payment_id, purpose, expires_at);

CREATE OR REPLACE FUNCTION prevent_public_capability_rebinding() RETURNS trigger AS $$
BEGIN
  IF NEW.token_hash IS DISTINCT FROM OLD.token_hash
     OR NEW.payment_id IS DISTINCT FROM OLD.payment_id
     OR NEW.purpose IS DISTINCT FROM OLD.purpose
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Public payment capabilities cannot be rebound or extended'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS public_payment_capability_immutable ON public_payment_capabilities;
CREATE TRIGGER public_payment_capability_immutable
BEFORE UPDATE ON public_payment_capabilities
FOR EACH ROW EXECUTE FUNCTION prevent_public_capability_rebinding();
