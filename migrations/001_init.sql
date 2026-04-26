CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS blanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  signature TEXT,
  body JSONB NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blank_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blank_id UUID NOT NULL REFERENCES blanks(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE(blank_id, token_hash)
);

CREATE TABLE IF NOT EXISTS blank_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blank_id UUID NOT NULL REFERENCES blanks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  signature TEXT,
  body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blank_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blank_id UUID NOT NULL REFERENCES blanks(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  comment TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blanks_status_deleted_idx ON blanks (status, deleted_at);
CREATE INDEX IF NOT EXISTS blanks_expires_at_idx ON blanks (expires_at);
CREATE INDEX IF NOT EXISTS blank_access_tokens_blank_id_idx ON blank_access_tokens (blank_id);
CREATE INDEX IF NOT EXISTS blank_reports_blank_id_idx ON blank_reports (blank_id);
