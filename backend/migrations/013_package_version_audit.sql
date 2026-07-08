-- Add optimistic concurrency version column to packages
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Index for concurrency checks and filtered admin queries
CREATE INDEX IF NOT EXISTS idx_packages_version
  ON packages(id, version);

CREATE INDEX IF NOT EXISTS idx_packages_category
  ON packages(category);

CREATE INDEX IF NOT EXISTS idx_packages_purchase_status
  ON packages(purchase_status);
