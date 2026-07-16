-- migration-phase: expand
-- Payload-free, transactionally recorded invalidations for the admin event stream.

CREATE TABLE IF NOT EXISTS admin_domain_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'appointment.changed',
      'package_order.changed',
      'payment.changed',
      'notification.changed',
      'patient_review.changed'
    )
  ),
  entity_id UUID NOT NULL,
  entity_version INTEGER NOT NULL CHECK (entity_version > 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_type, entity_id, entity_version)
);

CREATE INDEX IF NOT EXISTS admin_domain_events_resume
  ON admin_domain_events(id, event_type, entity_id);
CREATE INDEX IF NOT EXISTS admin_domain_events_retention
  ON admin_domain_events(occurred_at, id);

CREATE OR REPLACE FUNCTION record_admin_domain_event() RETURNS trigger AS $$
DECLARE
  mapped_type TEXT;
  next_version INTEGER;
BEGIN
  mapped_type := CASE TG_TABLE_NAME
    WHEN 'appointments' THEN 'appointment.changed'
    WHEN 'package_orders' THEN 'package_order.changed'
    WHEN 'payments' THEN 'payment.changed'
    WHEN 'notification_outbox' THEN 'notification.changed'
    WHEN 'patient_match_reviews' THEN 'patient_review.changed'
  END;

  IF mapped_type IS NULL THEN
    RAISE EXCEPTION 'Unsupported admin domain event table: %', TG_TABLE_NAME;
  END IF;

  SELECT COALESCE(MAX(entity_version), 0) + 1 INTO next_version
  FROM admin_domain_events
  WHERE event_type = mapped_type AND entity_id = NEW.id;

  INSERT INTO admin_domain_events(event_type, entity_id, entity_version)
  VALUES(mapped_type, NEW.id, next_version);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_admin_domain_event ON appointments;
CREATE TRIGGER appointments_admin_domain_event
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION record_admin_domain_event();

DROP TRIGGER IF EXISTS package_orders_admin_domain_event ON package_orders;
CREATE TRIGGER package_orders_admin_domain_event
AFTER INSERT OR UPDATE ON package_orders
FOR EACH ROW EXECUTE FUNCTION record_admin_domain_event();

DROP TRIGGER IF EXISTS payments_admin_domain_event ON payments;
CREATE TRIGGER payments_admin_domain_event
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION record_admin_domain_event();

DROP TRIGGER IF EXISTS notifications_admin_domain_event ON notification_outbox;
CREATE TRIGGER notifications_admin_domain_event
AFTER INSERT OR UPDATE ON notification_outbox
FOR EACH ROW EXECUTE FUNCTION record_admin_domain_event();

DROP TRIGGER IF EXISTS patient_reviews_admin_domain_event ON patient_match_reviews;
CREATE TRIGGER patient_reviews_admin_domain_event
AFTER INSERT OR UPDATE ON patient_match_reviews
FOR EACH ROW EXECUTE FUNCTION record_admin_domain_event();
