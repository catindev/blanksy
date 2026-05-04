-- Привязка blanks к пользователям внешнего SSO-сервиса.
-- user_id — непрозрачный идентификатор из JWT (поле sub).
-- Blanksy не знает о провайдерах (Telegram, VK и т.д.) —
-- это ответственность SSO-сервиса.

CREATE TABLE IF NOT EXISTS blank_owners (
  blank_id   UUID        NOT NULL REFERENCES blanks(id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL,
  linked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blank_id, user_id)
);

CREATE INDEX IF NOT EXISTS blank_owners_user_id_idx ON blank_owners (user_id);
