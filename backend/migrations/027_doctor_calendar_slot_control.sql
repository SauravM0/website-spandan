-- Per-date slot control for the simplified doctor calendar.

ALTER TABLE calendar_exceptions
  ADD COLUMN IF NOT EXISTS slot_minutes INTEGER;

ALTER TABLE calendar_exceptions
  DROP CONSTRAINT IF EXISTS calendar_exceptions_slot_minutes_check;
ALTER TABLE calendar_exceptions
  ADD CONSTRAINT calendar_exceptions_slot_minutes_check
  CHECK (slot_minutes IS NULL OR slot_minutes BETWEEN 5 AND 240);
