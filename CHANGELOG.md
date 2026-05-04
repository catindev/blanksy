# Changelog

All notable changes are documented in this file.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [1.4.1] — 2026-05-04

### Security

- **HS256 запрещён в production** (algorithm confusion fix, CVE-2015-9235).  
  В `NODE_ENV=production` `auth.middleware.js` принимает только `RS256`.  
  Если в `alg` заголовке токена указан `HS256` — токен отклоняется с ошибкой верификации.  
  В development (`NODE_ENV != production`) разрешены оба алгоритма для удобства локальной работы.  
  До этого фикса: если `AUTH_JWT_PUBLIC_KEY` содержал RSA public key, атакующий мог подписать  
  произвольный JWT RSA public key как HMAC secret и получить валидный `userId`.

### Fixed

- **SSO ownership теперь атомарна.**  
  `createBlankWithAccessToken` принимает опциональный `userId` и создаёт запись  
  в `blank_owners` внутри той же транзакции что и blank + access token.  
  Раньше: два отдельных запроса — при падении второго blank существовал без владельца.

- **`expires_at = null` для SSO-owned blanks.**  
  Anonymous blank: `expires_at = now + 1 year` (как раньше).  
  Blank созданный авторизованным пользователем: `expires_at = null` — не истекает.  
  Раньше: все blanks истекали через год, включая owned.

### Infrastructure

- **E2e тесты добавлены в release workflow** (`.github/workflows/release.yml`).  
  При пуше тега `v*` последовательно запускаются:  
  `test-unit` → `test-e2e` (desktop Chrome + mobile Safari, PostgreSQL service) → `release`.  
  GitHub Release создаётся только если оба test-job зелёные.  
  При падении e2e — Playwright report сохраняется как artifact на 7 дней.

### Tests

- 2 новых unit-теста в `auth.middleware.test.js`:
  - `rejects HS256 in production even with valid signature`
  - `accepts RS256 in production` (smoke — модуль грузится без ошибок в production mode)

---

## [1.4.0] — 2026-05-04

### Added — SSO / Identity foundation

Blanksy поддерживает работу **и без авторизации** (только access links),  
**и с SSO** (JWT от внешнего identity-сервиса). Оба режима совместимы.

- `src/auth/auth.middleware.js` — верификация JWT (RS256/HS256). `optionalAuth` / `requireAuth`.
- `migrations/003_blank_owners.sql` — `blank_owners (blank_id, user_id TEXT)`.
- `test/auth.middleware.test.js` — 9 unit-тестов.
- `POST /api/blanks/:id/link` — привязка существующего blank к userId.
- `GET /api/my/blanks` — список blanks текущего SSO-пользователя.
- `POST /api/blanks` + `PATCH /api/blanks/:id` — принимают `optionalAuth`.

### Fixed (хвосты из ревью)
- README: убрана строка «Автосохранение».
- `api.js` 403: уточнено сообщение для недействительного access token.
- `editor.js`: версия в заголовке → v1.4.0.
- `ensureTrailingParagraph`: проверяет фокус перед `placeCaretAtEnd` в rAF.
- Порядок `ensureTrailingParagraph` → `collapseConsecutiveEmptyParagraphs` в `hydrateEditor`.

### Removed
- `static/icons_2x.png` — мёртвый файл спрайта.
- `cookie-parser` — зависимость и middleware.
- `createBlank` (без токена) убран из `module.exports` репозитория.

---

## [1.3.3] — 2026-04-27

### Removed
- Автосохранение черновика в localStorage (как в Telegraph).

### Changed
- Ошибки API на русском языке с try/catch вокруг `fetch()`.
- После вставки медиа каретка → `figcaption`.
- `insertMediaBlock(env, paragraph, media)`.

### Fixed
- `collapseConsecutiveEmptyParagraphs` в `input` + `hydrateEditor`.
- `beforeinput` guard для пустого `<p>`.
- CSS: плейсхолдер только на последнем пустом параграфе.
- Размер заголовка уменьшен.

---

## [1.3.0] — 2026-04-26

### Added
- Playwright e2e: 25 тестов, desktop Chrome + iPhone 14.
- Toolbar active/mixed state через TreeWalker.
- Link tooltip от selection rect, подставляет href, пустое поле → unlink.

### Removed
- Diagram block type из API, schema, renderers, CSS, CSP.

---

## [1.2.0] — 2026-04-26

### Refactored
- `editor.js` — 13 секций, `BLOCK_EDITORS` registry.
- `core.css` — 11 секций, дизайн-токены.

---

## [1.1.x] — 2026-04-26

SVG-иконки, toggle медиа-промпта, позиционирование тулбаров, удаление diagram UI.

---

## [1.0.0] — 2026-04-25

Initial release. Rich-text editor, media by URL, publish/access link, SSR OG-мета,
Docker Compose, PostgreSQL, helmet + CSP, rate limiting, hash-only access tokens.
