-- migration-phase: expand
-- Successful payments must retain immutable evidence from PhonePe or an explicit test provider.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider_evidence_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS provider_evidence_source TEXT,
  ADD COLUMN IF NOT EXISTS provider_observed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_provider_evidence_consistent') THEN
    ALTER TABLE payments ADD CONSTRAINT payment_provider_evidence_consistent CHECK (
      (provider_evidence_hash IS NULL AND provider_evidence_source IS NULL AND provider_observed_at IS NULL)
      OR (
        provider_evidence_hash IS NOT NULL
        AND provider_evidence_source IN ('phonepe.webhook','phonepe.status_api','phonepe.reconciliation','test.mock')
        AND provider_observed_at IS NOT NULL
      )
    ) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION protect_payment_provider_evidence() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'success'
     AND (NEW.provider_evidence_hash IS NULL OR NEW.provider_evidence_source IS NULL OR NEW.provider_observed_at IS NULL) THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'New successful payments require authoritative provider evidence'
        USING ERRCODE = '23514';
    ELSIF OLD.status IS DISTINCT FROM 'success' THEN
      RAISE EXCEPTION 'New successful payments require authoritative provider evidence'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.provider_evidence_hash IS NOT NULL AND (
      NEW.provider_evidence_hash IS DISTINCT FROM OLD.provider_evidence_hash
      OR NEW.provider_evidence_source IS DISTINCT FROM OLD.provider_evidence_source
      OR NEW.provider_observed_at IS DISTINCT FROM OLD.provider_observed_at
    ) THEN
      RAISE EXCEPTION 'Successful payment provider evidence is immutable'
        USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_provider_evidence_immutable ON payments;
CREATE TRIGGER payment_provider_evidence_immutable
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION protect_payment_provider_evidence();
