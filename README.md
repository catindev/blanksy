# Bytext

Минималистичный сервис для публикации текстовых заметок и статей.  
Открыл страницу — сразу пишешь. Нажал «Опубликовать» — получил публичную ссылку и ссылку доступа для редактирования.

**Стек:** Node.js 20+ · Express · PostgreSQL · HTML/CSS/JS · contenteditable · Docker Compose

---

## Быстрый старт

```bash
cp .env.example .env
docker compose up --build
```

Открыть: `http://localhost:3000`

---

## Разработка (приложение на хосте, БД в Docker)

```bash
cp .env.example .env
npm ci
npm run dev
npm run dev:down   # остановить контейнеры
```

---

## Тесты

```bash
npm test                  # unit-тесты
npm run test:e2e          # e2e (нужен запущенный сервер)
npm run test:e2e:desktop  # только desktop Chrome
npm run test:e2e:mobile   # только iPhone 14 viewport
npm run test:all          # unit + e2e
```

### Первый запуск Playwright

```bash
npx playwright install chromium webkit
```

---

## Возможности

| Функция | Описание |
|---|---|
| Rich-text редактор | Bold, italic, ссылки, H2, H3, цитата |
| Toolbar active/mixed | Кнопки отражают текущий формат; `mixed` при частичном выделении |
| Медиа | Изображения по URL, YouTube, VK Video, RuTube |
| Публикация | `POST /api/texts` → public link + access link |
| Редактирование | Access link в localStorage; `?access=TOKEN` с любого устройства |
| SSO (опционально) | JWT от внешнего identity-сервиса — привязка текстов к userId |
| SSR | Open Graph / Twitter Card мета-теги |
| Безопасность | `helmet` + CSP, токены как SHA-256 hash, rate limiting |

---

## SSO / Identity

Bytext работает **и без авторизации, и с SSO** одновременно.

Без авторизации — всё как раньше: access link, localStorage.

С SSO — передай JWT в `Authorization: Bearer {jwt}`:
- `POST /api/texts` — text автоматически привязывается к `userId` из `sub`
- `GET /api/my/texts` — список всех текстов пользователя
- `POST /api/texts/:id/link` — привязать существующий text (нужен access token)

### Настройка SSO

```env
AUTH_JWT_PUBLIC_KEY=<PEM публичного ключа RS256>
AUTH_JWT_ISSUER=https://id.yourdomain.ru
AUTH_JWT_AUDIENCE=bytext
```

Если переменные не заданы — SSO отключён, Bytext работает только с access links.

**JWT payload:**
```json
{ "sub": "usr_abc123", "iss": "https://id.yourdomain.ru", "aud": "bytext", "exp": 0 }
```

Подробнее: `COMPATIBILITY.md`.

---

## Расширение: новый тип блока

1. Запись в `BLOCK_EDITORS` (`editor.js`, секция 1): `renderEditable`, `serialize`, `resolveTarget`
2. Кнопка в `renderBlockToolbar()` (`toolbars.js`): `data-insert="mytype"`
3. Обработчик клика в block toolbar (`editor.js`, секция 3)
4. Read-only рендерер в `render.js` и `text.renderer.js`
5. Тип в `text.schema.js`
6. E2e-тест

---

## Production deploy

| Переменная | Значение |
|---|---|
| `PUBLIC_BASE_URL` | `https://bytext.example.com` |
| `DATABASE_URL` | Production PostgreSQL |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` за одним reverse proxy |

Требования:
- HTTPS через Caddy / Nginx + Let's Encrypt
- Убрать `ports` у `db` в docker-compose
- Регулярный backup PostgreSQL

---

## Release workflow

```bash
npm ci && npm test
# запустить сервер, прогнать e2e
npm run test:e2e

git add .
git commit -m "Release v2.0.0"
git tag -a v2.0.0 -m "Bytext 2.0.0"
git push origin main --tags
gh release create v2.0.0 --title "Bytext 2.0.0" --notes-file CHANGELOG.md
```
