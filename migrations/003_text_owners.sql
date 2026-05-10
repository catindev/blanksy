-- Привязка texts к пользователям внешнего SSO-сервиса.
-- user_id — непрозрачный идентификатор из JWT (поле sub).
-- Bytext не знает о провайдерах (Telegram, VK и т.д.) —
-- это ответственность SSO-сервиса.

CREATE TABLE IF NOT EXISTS text_owners (
  text_id   UUID        NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL,
  linked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (text_id, user_id)
);

CREATE INDEX IF NOT EXISTS text_owners_user_id_idx ON text_owners (user_id);
