CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS texts (
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

CREATE TABLE IF NOT EXISTS text_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id UUID NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE(text_id, token_hash)
);

CREATE TABLE IF NOT EXISTS text_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id UUID NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  signature TEXT,
  body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS text_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id UUID NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  comment TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS texts_status_deleted_idx ON texts (status, deleted_at);
CREATE INDEX IF NOT EXISTS texts_expires_at_idx ON texts (expires_at);
CREATE INDEX IF NOT EXISTS text_access_tokens_text_id_idx ON text_access_tokens (text_id);
CREATE INDEX IF NOT EXISTS text_reports_text_id_idx ON text_reports (text_id);
