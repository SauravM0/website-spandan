-- Secure remote intake links. Clinical content remains in versioned intake
-- submissions and is never copied into the patient record without staff review.
CREATE TABLE IF NOT EXISTS intake_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash CHAR(64) NOT NULL UNIQUE,
  purpose VARCHAR(40) NOT NULL DEFAULT 'appointment_intake' CHECK (purpose = 'appointment_intake'),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  clinic_scope VARCHAR(80) NOT NULL DEFAULT 'spandan-main',
  consultation_mode VARCHAR(20) NOT NULL CHECK (consultation_mode IN ('in_person', 'video', 'phone')),
  contact_type VARCHAR(10) NOT NULL CHECK (contact_type IN ('phone', 'email')),
  contact_ciphertext TEXT NOT NULL,
  contact_fingerprint CHAR(64) NOT NULL,
  preferred_language VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'mr')),
  allowed_actions TEXT[] NOT NULL DEFAULT ARRAY['verify','draft','submit','status']::TEXT[],
  earliest_preference_at TIMESTAMPTZ,
  latest_preference_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'expired', 'revoked')),
  created_by_staff_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
  revoked_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at),
  CHECK (latest_preference_at IS NULL OR earliest_preference_at IS NULL OR latest_preference_at >= earliest_preference_at)
);

CREATE TABLE IF NOT EXISTS verified_contact_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES intake_invitations(id) ON DELETE CASCADE,
  challenge_hash CHAR(64) NOT NULL,
  session_token_hash CHAR(64),
  attempt_count SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  resend_count SMALLINT NOT NULL DEFAULT 0 CHECK (resend_count BETWEEN 0 AND 5),
  challenge_expires_at TIMESTAMPTZ NOT NULL,
  resend_available_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  session_expires_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  ip_hash CHAR(64),
  user_agent_hash CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intake_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES intake_invitations(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  state VARCHAR(20) NOT NULL CHECK (state IN ('draft', 'submitted', 'superseded')),
  encrypted_payload TEXT NOT NULL,
  payload_digest CHAR(64) NOT NULL,
  field_provenance JSONB NOT NULL DEFAULT '{}'::JSONB,
  consent_version VARCHAR(40),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invitation_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intake_one_draft
  ON intake_submissions(invitation_id) WHERE state = 'draft';

CREATE TABLE IF NOT EXISTS intake_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES intake_invitations(id) ON DELETE RESTRICT,
  submission_id UUID REFERENCES intake_submissions(id) ON DELETE SET NULL,
  object_key VARCHAR(300) NOT NULL UNIQUE,
  original_name_ciphertext TEXT NOT NULL,
  declared_mime VARCHAR(100) NOT NULL,
  declared_size BIGINT NOT NULL CHECK (declared_size BETWEEN 1 AND 10485760),
  status VARCHAR(20) NOT NULL DEFAULT 'pending_upload' CHECK (status IN ('pending_upload','quarantined','scanning','clean','rejected','promoted')),
  sha256 CHAR(64),
  scan_result VARCHAR(100),
  uploaded_at TIMESTAMPTZ,
  scanned_at TIMESTAMPTZ,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status <> 'promoted' OR (scanned_at IS NOT NULL AND scan_result = 'clean'))
);

CREATE TABLE IF NOT EXISTS intake_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL UNIQUE REFERENCES intake_invitations(id) ON DELETE RESTRICT,
  submission_id UUID NOT NULL REFERENCES intake_submissions(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','information_requested','accepted','declined')),
  assigned_to_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  duplicate_candidate_patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  missing_information TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  decision_note VARCHAR(2000),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  reviewed_by_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_invitations_status_expiry ON intake_invitations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_intake_invitations_creator_created ON intake_invitations(created_by_staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verified_sessions_invitation_created ON verified_contact_sessions(invitation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_invitation_version ON intake_submissions(invitation_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_intake_reviews_queue ON intake_reviews(status, due_at, created_at);
CREATE INDEX IF NOT EXISTS idx_intake_uploads_scan_queue ON intake_uploads(status, created_at) WHERE status IN ('quarantined','scanning');
