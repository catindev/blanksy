# Compatibility

## Content model — supported block types (v1.4.1)

| Type | Since | Notes |
|---|---|---|
| `paragraph` | 1.0.0 | |
| `heading` | 1.0.0 | `level: 2 \| 3` |
| `quote` | 1.0.0 | |
| `divider` | 1.0.0 | |
| `image` | 1.0.0 | |
| `video` | 1.0.0 | `provider: 'youtube' \| 'vkvideo' \| 'rutube'` |
| `code` | 1.0.0 | |
| `list` | 1.0.0 | |

**Removed:** `diagram` удалён в 1.3.0 — API возвращает 400 на diagram payload.

## API

### Breaking changes by version

**1.4.0:**
- `POST /api/blanks` — добавлен `optionalAuth`. Без авторизации поведение не изменилось.
- `PATCH /api/blanks/:id` — принимает access token **или** SSO ownership.
- Новые: `POST /api/blanks/:id/link`, `GET /api/my/blanks`.

**1.3.0:** `diagram` nodes → HTTP 400.

## SSO / Identity contract

JWT payload принимаемый Blanksy:
```json
{ "sub": "usr_abc123", "iss": "https://id.example.com", "aud": "blanksy", "iat": 0, "exp": 0 }
```

- `sub` — непрозрачный userId, хранится как TEXT.
- `aud` — должен совпадать с `AUTH_JWT_AUDIENCE` (по умолчанию `"blanksy"`).

**Алгоритмы:**

| Окружение | Разрешено | Запрещено |
|---|---|---|
| `NODE_ENV=production` | RS256 | HS256 |
| `NODE_ENV!=production` | RS256, HS256 | — |

HS256 запрещён в production для защиты от algorithm confusion attack (CVE-2015-9235).

**Различение токенов:**
- Blanksy access token — base64url без точек.
- JWT — три части через точку (`xxx.yyy.zzz`).

## Expires policy

| Blank type | expires_at |
|---|---|
| Anonymous (без SSO) | `now + 1 year` |
| SSO-owned (`userId` в запросе) | `null` (не истекает) |

## Storage

Access tokens — только как SHA-256 hash.

`localStorage` keys:
- `blanksy:access:{blankId}` — access token
- `blanksy:known_blanks` — до 50 недавно открытых blanks

Note: draft autosave keys удалены в v1.3.3.

## Architectural boundaries

- Frontend JS: vanilla IIFE, нет build step.
- Все block types рендерятся SSR (SEO) и client-side (editor). При добавлении нового типа — менять оба рендерера + schema + BLOCK_EDITORS.
- SSO — опциональный слой. Все существующие endpoints работают без авторизации.
- `blank_owners` создаётся атомарно в той же транзакции что и blank + access token.
