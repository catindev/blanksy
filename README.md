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

PostgreSQL поднимается вторым контейнером. Миграции запускаются автоматически при старте приложения.

---

## Локальная разработка (приложение на хосте, БД в Docker)

```bash
cp .env.example .env
npm ci
npm run dev        # поднимает БД, ждёт PostgreSQL, запускает node --watch
npm run dev:down   # останавливает контейнеры
```

---

## Возможности

| Функция | Описание |
|---|---|
| Rich-text редактор | Bold, italic, ссылки, H2, H3, цитата |
| Медиа | Изображения по URL, YouTube, VK Video, RuTube |
| Публикация | POST `/api/blanks` → public link + access link |
| Редактирование | Access link сохраняется в `localStorage`; `?access=TOKEN` даёт доступ с любого устройства |
| Автосохранение | Черновик сохраняется в `localStorage` каждые 300 мс |
| SEO | SSR с Open Graph / Twitter Card мета-тегами |
| Безопасность | `helmet` + CSP, токены только как SHA-256 hash, rate limiting |
| Диаграммы | Mermaid (CDN) и PlantUML (plantuml.com) — рендеринг legacy-нод |

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
3. **Обработать клик** в block toolbar click handler (`editor.js`, секция 3):
   ```js
   } else if (btn.dataset.insert === 'mytype') {
     insertMyBlock(env, paragraph);
   }
   ```
4. **Добавить read-only рендерер** в `src/public/js/render.js` и `src/blanks/blank.renderer.js`.
5. **Добавить в схему** в `src/blanks/blank.schema.js`.

---

## Тесты

```bash
npm ci
npm test
```

---

## Release checklist

```bash
npm ci && npm test
docker compose up --build
```

Проверить вручную:
1. `http://localhost:3000` → создать blank
2. Скопировать access link
3. Открыть публичную ссылку в новой вкладке
4. Открыть access link → нажать «Редактировать» → изменить → «Сохранить»
5. Проверить мобильную ширину в DevTools

```bash
git add .
git commit -m "Release Blanksy vX.Y.Z"
git tag -a vX.Y.Z -m "Blanksy X.Y.Z"
git push origin main --tags

gh release create vX.Y.Z --title "Blanksy X.Y.Z" --notes-file CHANGELOG.md
```

---

## Production deploy

| Переменная | Значение |
|---|---|
| `PUBLIC_BASE_URL` | Публичный домен, напр. `https://blanksy.example.com` |
| `DATABASE_URL` | Production PostgreSQL |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` если приложение стоит за одним reverse proxy; `0` локально |

Требования:
- HTTPS через reverse proxy (Caddy / Nginx + Let's Encrypt)
- Настроить `TRUST_PROXY` под число доверенных proxy-hop, иначе rate limit и report IP будут видеть IP прокси
- Убрать `ports` у `db` в docker-compose для production
- Регулярный backup PostgreSQL
