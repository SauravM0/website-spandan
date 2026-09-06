-- migration-phase: expand
-- Keep every UTR claim immutable while allowing a rejected or clarified payment
-- to submit a different UTR for a new verification attempt.

ALTER TABLE direct_upi_utr_claims
  DROP CONSTRAINT IF EXISTS direct_upi_utr_claims_payment_id_key;

CREATE INDEX IF NOT EXISTS direct_upi_utr_claims_payment
  ON direct_upi_utr_claims(payment_id,claimed_at DESC);
