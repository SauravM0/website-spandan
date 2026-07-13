-- Bounded admin operational reads and deterministic keyset paging.
CREATE INDEX IF NOT EXISTS idx_package_orders_created_id
  ON package_orders(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_package_orders_status_created_id
  ON package_orders(status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_package_orders_order_number_prefix
  ON package_orders(order_number text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_package_orders_phone_prefix
  ON package_orders(phone text_pattern_ops);
