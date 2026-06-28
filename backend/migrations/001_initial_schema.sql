-- Spandan Clinic Database Schema
-- Migration 001: Initial Schema (Supabase-native design per Document 2)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DOCTORS (created first since staff_users references it)
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  speciality TEXT NOT NULL,
  qualifications TEXT NOT NULL DEFAULT '',
  bio TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STAFF USERS (for auth - works standalone or with Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PACKAGES (diagnostic / health checkup packages)
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  discounted_price NUMERIC(10,2),
  show_price_publicly BOOLEAN NOT NULL DEFAULT false,
  prep_instructions TEXT,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  primary_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PACKAGE_TESTS (individual tests within a package)
-- ============================================================
CREATE TABLE IF NOT EXISTS package_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENT REQUESTS (lead / enquiry submissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  referring_doctor_name TEXT,
  referring_doctor_phone TEXT,
  preferred_date DATE,
  preferred_time_window TEXT,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEAD STATUS HISTORY (audit trail for appointment requests)
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_request_id UUID NOT NULL REFERENCES appointment_requests(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ARTICLES (educational / blog content)
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en',
  translation_group_id UUID,
  cover_image_url TEXT,
  youtube_video_url TEXT,
  author_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PACKAGES PUBLIC VIEW (hides price columns from public API)
-- ============================================================
CREATE OR REPLACE VIEW packages_public AS
SELECT
  id, slug, name, short_description, description,
  prep_instructions, image_url, category,
  primary_doctor_id, display_order, is_active,
  created_at, updated_at
FROM packages
WHERE is_active = true;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_packages_slug ON packages(slug);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_primary_doctor ON packages(primary_doctor_id);
CREATE INDEX IF NOT EXISTS idx_package_tests_package ON package_tests(package_id);
CREATE INDEX IF NOT EXISTS idx_package_tests_sort ON package_tests(package_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_doctor_status ON appointment_requests(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_status ON appointment_requests(status);
CREATE INDEX IF NOT EXISTS idx_appointment_requests_created ON appointment_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_request ON lead_status_history(appointment_request_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_translation_group ON articles(translation_group_id);
CREATE INDEX IF NOT EXISTS idx_doctors_slug ON doctors(slug);
CREATE INDEX IF NOT EXISTS idx_doctors_is_active ON doctors(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_users_email ON staff_users(email);
