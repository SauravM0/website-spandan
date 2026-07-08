-- Migration 014: Article governance and public resource filtering

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS reviewer_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_display_name TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_time_minutes INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS content_format TEXT NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS content_status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

UPDATE articles
SET
  reviewer_display_name = COALESCE(reviewer_display_name, 'Spandan clinical review team'),
  reviewed_at = COALESCE(reviewed_at, published_at, updated_at),
  read_time_minutes = GREATEST(1, CEIL(array_length(regexp_split_to_array(body_md, '\s+'), 1)::numeric / 220)::integer),
  content_format = CASE
    WHEN youtube_video_url IS NOT NULL AND youtube_video_url <> '' THEN 'video'
    ELSE COALESCE(content_format, 'article')
  END,
  content_status = CASE
    WHEN published_at IS NULL THEN 'draft'
    ELSE COALESCE(content_status, 'published')
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'articles_read_time_positive'
  ) THEN
    ALTER TABLE articles
      ADD CONSTRAINT articles_read_time_positive CHECK (read_time_minutes > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'articles_content_format_check'
  ) THEN
    ALTER TABLE articles
      ADD CONSTRAINT articles_content_format_check CHECK (content_format IN ('article', 'video', 'tool', 'download'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'articles_content_status_check'
  ) THEN
    ALTER TABLE articles
      ADD CONSTRAINT articles_content_status_check CHECK (content_status IN ('draft', 'published', 'withdrawn'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_articles_public_catalog
  ON articles (language, category, content_format, published_at DESC)
  WHERE published_at IS NOT NULL AND content_status = 'published' AND withdrawn_at IS NULL;
