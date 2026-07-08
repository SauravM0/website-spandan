-- Add optimistic concurrency version column to appointment_requests
ALTER TABLE appointment_requests
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Index for concurrency checks
CREATE INDEX IF NOT EXISTS idx_appointment_requests_version
  ON appointment_requests(id, version);
