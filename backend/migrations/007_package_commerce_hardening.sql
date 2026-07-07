-- Package commerce hardening: richer package metadata, safe snapshots, audit support

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS test_category TEXT,
  ADD COLUMN IF NOT EXISTS consultation_included BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fasting_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fasting_duration TEXT,
  ADD COLUMN IF NOT EXISTS age_sex_applicability TEXT,
  ADD COLUMN IF NOT EXISTS exclusions TEXT,
  ADD COLUMN IF NOT EXISTS report_turnaround TEXT,
  ADD COLUMN IF NOT EXISTS medical_disclaimer TEXT,
  ADD COLUMN IF NOT EXISTS discount_label TEXT,
  ADD COLUMN IF NOT EXISTS tax_name TEXT,
  ADD COLUMN IF NOT EXISTS gateway_fee_policy TEXT NOT NULL DEFAULT 'customer_pays',
  ADD COLUMN IF NOT EXISTS purchase_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS effective_start DATE,
  ADD COLUMN IF NOT EXISTS effective_end DATE,
  ADD COLUMN IF NOT EXISTS no_refund_text TEXT,
  ADD COLUMN IF NOT EXISTS preferred_date_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blackout_dates DATE[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_bookings_per_day INTEGER,
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE package_tests
  ADD COLUMN IF NOT EXISTS test_category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE package_order_items
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS package_short_description TEXT,
  ADD COLUMN IF NOT EXISTS package_description TEXT,
  ADD COLUMN IF NOT EXISTS prep_instructions TEXT,
  ADD COLUMN IF NOT EXISTS terms_text TEXT,
  ADD COLUMN IF NOT EXISTS no_refund_text TEXT,
  ADD COLUMN IF NOT EXISTS base_price_snapshot NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discounted_price_snapshot NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tax_applicable_snapshot BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_date DATE;

UPDATE package_order_items
SET
  base_price_snapshot = COALESCE(base_price_snapshot, unit_price),
  discounted_price_snapshot = COALESCE(discounted_price_snapshot, unit_price),
  line_total = CASE WHEN line_total = 0 THEN unit_price ELSE line_total END;

ALTER TABLE packages
  DROP CONSTRAINT IF EXISTS packages_discount_lte_base,
  ADD CONSTRAINT packages_discount_lte_base
    CHECK (discounted_price IS NULL OR discounted_price <= base_price),
  DROP CONSTRAINT IF EXISTS packages_tax_rate_valid,
  ADD CONSTRAINT packages_tax_rate_valid
    CHECK (tax_rate >= 0 AND tax_rate <= 100),
  DROP CONSTRAINT IF EXISTS packages_effective_dates_valid,
  ADD CONSTRAINT packages_effective_dates_valid
    CHECK (effective_end IS NULL OR effective_start IS NULL OR effective_end >= effective_start),
  DROP CONSTRAINT IF EXISTS packages_max_bookings_valid,
  ADD CONSTRAINT packages_max_bookings_valid
    CHECK (max_bookings_per_day IS NULL OR max_bookings_per_day > 0);

CREATE INDEX IF NOT EXISTS idx_packages_purchase_catalog
ON packages(is_active, purchase_enabled, purchase_status, publication_status, display_order);

CREATE INDEX IF NOT EXISTS idx_package_order_items_order
ON package_order_items(order_id, created_at);
