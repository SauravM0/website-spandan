-- Versioned, admin-managed pricing with immutable booking snapshots.

CREATE TABLE IF NOT EXISTS billable_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  doctor_id UUID REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_type TEXT,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  version INTEGER NOT NULL DEFAULT 1,
  change_reason TEXT NOT NULL DEFAULT 'Initial price',
  created_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  updated_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (code ~ '^[a-z0-9_]+$'),
  CHECK (category IN ('consultation','counselling','diagnostic','other')),
  CHECK (appointment_type IS NULL OR appointment_type IN ('new','follow_up')),
  CHECK (price >= 0),
  CHECK (currency = 'INR')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billable_services_scope
  ON billable_services(code, COALESCE(doctor_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(appointment_type, ''));
CREATE INDEX IF NOT EXISTS idx_billable_services_resolution
  ON billable_services(code, is_active, effective_from, doctor_id, appointment_type);

CREATE TABLE IF NOT EXISTS billable_service_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES billable_services(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  effective_from DATE NOT NULL,
  change_reason TEXT NOT NULL,
  changed_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id, version),
  CHECK (price >= 0),
  CHECK (currency = 'INR')
);

INSERT INTO billable_services
  (code, name, description, category, price, change_reason)
SELECT 'consultation', 'Consultation', 'Standard doctor consultation', 'consultation', 700.00,
       'Migrated from the previous default consultation fee'
WHERE NOT EXISTS (
  SELECT 1 FROM billable_services
  WHERE code = 'consultation' AND doctor_id IS NULL AND appointment_type IS NULL
);

INSERT INTO billable_service_price_history
  (service_id, version, price, currency, effective_from, change_reason, changed_by_staff_id)
SELECT id, version, price, currency, effective_from, change_reason, created_by_staff_id
FROM billable_services s
WHERE NOT EXISTS (
  SELECT 1 FROM billable_service_price_history h
  WHERE h.service_id = s.id AND h.version = s.version
);

ALTER TABLE appointment_holds
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES billable_services(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS service_code TEXT,
  ADD COLUMN IF NOT EXISTS service_name TEXT,
  ADD COLUMN IF NOT EXISTS service_price_version INTEGER;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES billable_services(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS service_code TEXT,
  ADD COLUMN IF NOT EXISTS service_name TEXT,
  ADD COLUMN IF NOT EXISTS service_price_version INTEGER;

