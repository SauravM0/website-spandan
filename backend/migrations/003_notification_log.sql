-- Migration 003: Notification log table for tracking notification delivery

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_request_id UUID REFERENCES appointment_requests(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_request ON notification_log(appointment_request_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
