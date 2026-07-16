-- migration-phase: expand
-- Transactional appointment rescheduling with immutable old/new slot evidence.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0 CHECK (reschedule_count >= 0),
  ADD COLUMN IF NOT EXISTS last_rescheduled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS appointment_reschedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('rescheduled','cancelled_no_slot')),
  old_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  old_appointment_date DATE NOT NULL,
  old_start_time TIME NOT NULL,
  old_end_time TIME NOT NULL,
  requested_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  requested_appointment_date DATE NOT NULL,
  requested_start_time TIME NOT NULL,
  resulting_end_time TIME,
  version_before INTEGER NOT NULL,
  version_after INTEGER NOT NULL CHECK (version_after = version_before + 1),
  reason TEXT NOT NULL,
  actor_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  before_snapshot JSONB NOT NULL,
  after_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, idempotency_key),
  CHECK (outcome <> 'rescheduled' OR resulting_end_time IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS appointment_reschedule_timeline
  ON appointment_reschedule_events(appointment_id, created_at, id);
CREATE INDEX IF NOT EXISTS appointment_reschedule_requested_slot
  ON appointment_reschedule_events(requested_doctor_id, requested_appointment_date, requested_start_time);

CREATE OR REPLACE FUNCTION prevent_appointment_reschedule_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Appointment reschedule events are immutable'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointment_reschedule_event_immutable ON appointment_reschedule_events;
CREATE TRIGGER appointment_reschedule_event_immutable
BEFORE UPDATE OR DELETE ON appointment_reschedule_events
FOR EACH ROW EXECUTE FUNCTION prevent_appointment_reschedule_event_mutation();
