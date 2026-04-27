# Blanksy

Минималистичный сервис для публикации текстовых заметок и статей.
Открыл страницу — сразу пишешь. Нажал «Опубликовать» — получил публичную ссылку и ссылку доступа для редактирования.

**Стек:** Node.js 20+ · Express · PostgreSQL · чистый HTML/CSS/JS · contenteditable · Docker Compose

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
# Юнит-тесты (schema, media parser)
npm test

# E2e-тесты (требует запущенного сервера на localhost:3000)
npm run test:e2e

# Только desktop
npm run test:e2e:desktop

# Только mobile (iPhone 14 viewport)
npm run test:e2e:mobile

# С UI-режимом Playwright
npm run test:e2e:ui

# Всё сразу
npm run test:all
```

### Первый запуск Playwright

```bash
npx playwright install chromium webkit
```

### Запуск e2e против локального сервера

```bash
# Терминал 1
npm run dev

# Терминал 2
npm run test:e2e
```

---

## Возможности

| Функция | Описание |
|---|---|
| Rich-text редактор | Bold, italic, ссылки, H2, H3, цитата |
| Toolbar active/mixed state | Кнопки отражают текущий формат выделения; `mixed` при частичном выделении |
| Медиа | Изображения по URL, YouTube, VK Video, RuTube |
| Нераспознанный URL в медиа | Вставляется как гиперссылка вместо ошибки |
| Публикация | POST `/api/blanks` → public link + access link |
| Редактирование | Access link сохраняется в `localStorage`; `?access=TOKEN` даёт доступ с любого устройства |
| Автосохранение | Черновик в `localStorage` каждые 300 мс |
| SSR | Open Graph / Twitter Card мета-теги |
| Безопасность | `helmet` + CSP, токены только как SHA-256 hash, rate limiting |

---

## Расширение: добавление нового типа блока

1. **Зарегистрировать** тип в `BLOCK_EDITORS` (`src/public/js/editor.js`, секция 1):
   ```js
   BLOCK_EDITORS.set('mytype', {
     renderEditable: (node) => `<figure data-node-type="mytype">…</figure>`,
     serialize:      (el)   => ({ type: 'mytype', … }),
     resolveTarget:  (el)   => el.querySelector('…'),
   });
   ```
2. **Добавить кнопку** в `renderBlockToolbar()` (`src/views/toolbars.js`):
   ```html
   <button type="button" class="bs_tool_button bs_block_btn" data-insert="mytype">…</button>
   ```
3. **Обработать клик** в block toolbar click handler (`editor.js`, секция 3).
4. **Добавить read-only рендерер** в `src/public/js/render.js` и `src/blanks/blank.renderer.js`.
5. **Добавить в схему** в `src/blanks/blank.schema.js`.
6. **Написать e2e-тест** в `e2e/04-media.spec.js` или новый spec-файл.

---

## Production deploy

| Переменная | Значение |
|---|---|
| `PUBLIC_BASE_URL` | `https://blanksy.example.com` |
| `DATABASE_URL` | Production PostgreSQL |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` если приложение стоит за одним reverse proxy; `0` локально |

Требования:
- HTTPS через reverse proxy (Caddy / Nginx + Let's Encrypt)
- Настроить `TRUST_PROXY` под число доверенных proxy-hop, иначе rate limit и report IP будут видеть IP прокси
- Убрать `ports` у `db` в docker-compose
- Регулярный backup PostgreSQL

## Release workflow

```bash
npm ci && npm test
# Запустить сервер и прогнать e2e
npm run test:e2e

git add .
git commit -m "Release v1.3.0"
git tag -a v1.3.0 -m "Blanksy 1.3.0"
git push origin main --tags
```
