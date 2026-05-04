# Blanksy

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
| Публикация | `POST /api/blanks` → public link + access link |
| Редактирование | Access link в localStorage; `?access=TOKEN` с любого устройства |
| SSO (опционально) | JWT от внешнего identity-сервиса — привязка blanks к userId |
| SSR | Open Graph / Twitter Card мета-теги |
| Безопасность | `helmet` + CSP, токены как SHA-256 hash, rate limiting |

---

## SSO / Identity

Blanksy работает **и без авторизации, и с SSO** одновременно.

Без авторизации — всё как раньше: access link, localStorage.

С SSO — передай JWT в `Authorization: Bearer {jwt}`:
- `POST /api/blanks` — blank автоматически привязывается к `userId` из `sub`
- `GET /api/my/blanks` — список всех blanks пользователя
- `POST /api/blanks/:id/link` — привязать существующий blank (нужен access token)

### Настройка SSO

```env
AUTH_JWT_PUBLIC_KEY=<PEM публичного ключа RS256>
AUTH_JWT_ISSUER=https://id.yourdomain.ru
AUTH_JWT_AUDIENCE=blanksy
```

Если переменные не заданы — SSO отключён, Blanksy работает только с access links.

**JWT payload:**
```json
{ "sub": "usr_abc123", "iss": "https://id.yourdomain.ru", "aud": "blanksy", "exp": 0 }
```

Подробнее: `COMPATIBILITY.md`.

---

## Расширение: новый тип блока

1. Запись в `BLOCK_EDITORS` (`editor.js`, секция 1): `renderEditable`, `serialize`, `resolveTarget`
2. Кнопка в `renderBlockToolbar()` (`toolbars.js`): `data-insert="mytype"`
3. Обработчик клика в block toolbar (`editor.js`, секция 3)
4. Read-only рендерер в `render.js` и `blank.renderer.js`
5. Тип в `blank.schema.js`
6. E2e-тест

---

## Production deploy

| Переменная | Значение |
|---|---|
| `PUBLIC_BASE_URL` | `https://blanksy.example.com` |
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
git commit -m "Release v1.4.0"
git tag -a v1.4.0 -m "Blanksy 1.4.0"
git push origin main --tags
gh release create v1.4.0 --title "Blanksy 1.4.0" --notes-file CHANGELOG.md
```
