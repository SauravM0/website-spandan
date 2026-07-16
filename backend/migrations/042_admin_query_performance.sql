-- migration-phase: expand
-- Query-plan-backed indexes and asynchronous bounded exports for admin operations.

CREATE INDEX IF NOT EXISTS appointments_date_start_id
  ON appointments(appointment_date DESC,start_time DESC,id DESC);
CREATE INDEX IF NOT EXISTS appointments_doctor_date_start_id
  ON appointments(doctor_id,appointment_date DESC,start_time DESC,id DESC);
CREATE INDEX IF NOT EXISTS appointments_created_id
  ON appointments(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS appointments_updated_id
  ON appointments(updated_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS payments_created_id
  ON payments(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS payments_updated_id
  ON payments(updated_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS payments_amount_created_id
  ON payments(amount DESC,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS payments_amount_asc_created_id
  ON payments(amount ASC,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS payments_status_created_id
  ON payments(status,created_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS patients_updated_id
  ON patients(updated_at DESC,id DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS package_order_items_order_created
  ON package_order_items(order_id,created_at,id);
CREATE INDEX IF NOT EXISTS custom_test_order_items_order_sort
  ON custom_test_order_items(order_id,sort_order,id);
CREATE INDEX IF NOT EXISTS notification_outbox_order_created
  ON notification_outbox(order_id,created_at DESC,id DESC) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notification_outbox_appointment_created
  ON notification_outbox(appointment_id,created_at DESC,id DESC) WHERE appointment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type TEXT NOT NULL CHECK(export_type IN ('appointments','payments')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','ready','failed','expired')),
  requested_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  row_count INTEGER CHECK(row_count IS NULL OR row_count>=0),
  result_csv TEXT,
  error_code TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '24 hours',
  CHECK((status='ready')=(result_csv IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS admin_export_jobs_claim
  ON admin_export_jobs(status,available_at,created_at)
  WHERE status IN ('queued','processing');
CREATE INDEX IF NOT EXISTS admin_export_jobs_owner
  ON admin_export_jobs(requested_by_staff_id,created_at DESC,id DESC);

INSERT INTO worker_jobs(name,interval_seconds,next_run_at,max_attempts)
VALUES('admin-export',5,NOW(),5)
ON CONFLICT(name) DO UPDATE SET interval_seconds=EXCLUDED.interval_seconds;
