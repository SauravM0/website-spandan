-- Appointment calendar hardening: dynamic availability, structured overrides, settings, holds

ALTER TABLE doctor_availability_rules
  ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_until DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE calendar_exceptions
  ADD COLUMN IF NOT EXISTS override_type TEXT,
  ADD COLUMN IF NOT EXISTS public_note TEXT,
  ADD COLUMN IF NOT EXISTS internal_note TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE calendar_exceptions
SET override_type = CASE
  WHEN is_available = true THEN 'add_extra_hours'
  WHEN start_time IS NULL AND end_time IS NULL THEN 'unavailable_whole_day'
  ELSE 'block_time_range'
END
WHERE override_type IS NULL;

ALTER TABLE calendar_exceptions
  ALTER COLUMN override_type SET DEFAULT 'block_time_range',
  ALTER COLUMN override_type SET NOT NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS slot_minutes INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;

ALTER TABLE appointment_holds
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

DROP INDEX IF EXISTS idx_holds_one_active_phone;
CREATE UNIQUE INDEX IF NOT EXISTS idx_holds_one_active_phone
ON appointment_holds(patient_phone)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_availability_effective
ON doctor_availability_rules(doctor_id, weekday, effective_from, effective_until)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_exceptions_type_date
ON calendar_exceptions(doctor_id, exception_date, override_type);

INSERT INTO admin_settings (key, value)
VALUES (
  'appointment_config',
  '{
    "default_slot_minutes": 30,
    "minimum_booking_notice_minutes": 60,
    "maximum_booking_horizon_days": 30,
    "hold_duration_minutes": 15,
    "same_day_booking_allowed": true,
    "cancellation_cutoff_hours": 24,
    "arrival_buffer_instructions": "Please arrive 10 minutes before your appointment."
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
