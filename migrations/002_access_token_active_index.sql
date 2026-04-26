CREATE INDEX IF NOT EXISTS blank_access_tokens_token_hash_active_idx
  ON blank_access_tokens (token_hash)
  WHERE revoked_at IS NULL;
