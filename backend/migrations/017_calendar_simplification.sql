-- Safe doctor-specific schedule commands, optimistic concurrency, and conflict resolution.

CREATE TABLE IF NOT EXISTS doctor_schedule_versions (
  doctor_id UUID PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO doctor_schedule_versions (doctor_id)
SELECT id FROM doctors
ON CONFLICT (doctor_id) DO NOTHING;

ALTER TABLE calendar_exceptions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS correlation_id UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE calendar_exceptions
  DROP CONSTRAINT IF EXISTS calendar_exceptions_status_check;
ALTER TABLE calendar_exceptions
  ADD CONSTRAINT calendar_exceptions_status_check
  CHECK (status IN ('active', 'superseded'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_exception_no_duplicate
ON calendar_exceptions (
  doctor_id,
  exception_date,
  override_type,
  COALESCE(start_time, '00:00'::time),
  COALESCE(end_time, '00:00'::time)
)
WHERE status = 'active';

CREATE TABLE IF NOT EXISTS schedule_conflict_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  requested_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  requested_version INTEGER NOT NULL,
  requested_change JSONB NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ready', 'applied', 'cancelled')),
  due_at TIMESTAMPTZ,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedule_conflict_appointments (
  case_id UUID NOT NULL REFERENCES schedule_conflict_cases(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  resolution TEXT CHECK (resolution IN ('keep', 'reschedule', 'approved_transfer', 'cancel_contact')),
  notes TEXT,
  resolved_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  PRIMARY KEY (case_id, appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_open
ON schedule_conflict_cases (doctor_id, status, created_at)
WHERE status IN ('open', 'ready');

CREATE TABLE IF NOT EXISTS schedule_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  actor_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT NOT NULL,
  affected_dates DATE[] NOT NULL DEFAULT '{}',
  correlation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_audit_doctor_created
ON schedule_audit_events (doctor_id, created_at DESC);
