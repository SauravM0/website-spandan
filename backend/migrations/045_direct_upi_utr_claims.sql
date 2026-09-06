-- migration-phase: expand
-- Preserve reviewable duplicate UTR submissions while enforcing one authoritative claimant.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS duplicate_candidate_of_payment_id UUID
    REFERENCES payments(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS direct_upi_utr_claims (
  utr_fingerprint CHAR(64) PRIMARY KEY,
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO direct_upi_utr_claims(utr_fingerprint,payment_id,claimed_at)
SELECT DISTINCT ON (utr_fingerprint) utr_fingerprint,id,COALESCE(utr_submitted_at,created_at)
FROM payments
WHERE provider='direct_upi' AND utr_fingerprint IS NOT NULL
ORDER BY utr_fingerprint,COALESCE(utr_submitted_at,created_at),id
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS payments_utr_fingerprint_unique;
CREATE INDEX IF NOT EXISTS payments_utr_fingerprint_lookup
  ON payments(utr_fingerprint) WHERE utr_fingerprint IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_direct_upi_utr_claim_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Direct UPI UTR claims are immutable' USING ERRCODE='55000';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS direct_upi_utr_claims_immutable ON direct_upi_utr_claims;
CREATE TRIGGER direct_upi_utr_claims_immutable
BEFORE UPDATE OR DELETE ON direct_upi_utr_claims
FOR EACH ROW EXECUTE FUNCTION prevent_direct_upi_utr_claim_mutation();

