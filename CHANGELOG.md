# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.3.0] — 2026-04-26

### Added

#### Playwright e2e test suite
- `e2e/01-publish.spec.js` — критический путь: создать blank → опубликовать → проверить публичную страницу → проверить OG-мета → проверить сериализацию прямых text nodes (6 тестов).
- `e2e/02-edit.spec.js` — access link → войти в режим редактирования → сохранить → изменения видны на публичной странице (3 теста).
- `e2e/03-toolbar.spec.js` — active/mixed состояния bold/italic/link/H2/H3/quote, link tooltip, удаление ссылки пустым полем, BUG-001 Enter в blockquote/h2 (15 тестов).
- `e2e/04-media.spec.js` — toggle медиа-промпта, вставка изображения, YouTube, нераспознанный URL → гиперссылка (7 тестов).
- `e2e/helpers.js` — общие утилиты (`fillBlank`, `publishBlank`, `typeInEditor`, `selectAll`).
- `playwright.config.js` — desktop Chrome + iPhone 14, `on-first-retry` трейсы и скриншоты.
- Новые npm scripts: `test:e2e`, `test:e2e:desktop`, `test:e2e:mobile`, `test:e2e:headed`, `test:e2e:ui`, `test:all`.

#### Toolbar active/mixed state (proper DOM traversal)
- Заменён `document.queryCommandState('bold/italic')` на `rangeInlineState()`: обходит все text nodes в range через `TreeWalker`, определяет `active` (все узлы отформатированы) / `mixed` (часть) / `inactive` (ни одного).
- Новый CSS-класс `.bs_tool_mixed` — приглушённая подсветка кнопки при частичном выделении.
- `setButtonState()` управляет обоими классами (`bs_tool_active`, `bs_tool_mixed`) из единой точки.

#### Link tooltip — полноценное редактирование
- Позиционируется от `savedRange.getBoundingClientRect()` (прямо под выделенным текстом), а не от rect тулбара.
- При открытии подставляет текущий `href` если выделение уже является ссылкой — пользователь сразу видит и может изменить URL.
- Пустое поле при подтверждении вызывает `execCommand('unlink')` — удаляет ссылку без дополнительных кнопок.
- Логика в `applyLinkFromTooltip`: один путь для create / update / unlink.

#### Production hardening preserved
- Индекс активных access-token hash остаётся отдельной миграцией `002_access_token_active_index.sql`, чтобы доезжать до существующих баз.
- `TRUST_PROXY` сохранён для корректных client IP за reverse proxy.
- HTTP/5xx-логи редактируют `?access=...`, чтобы access tokens не попадали в серверные логи.
- Создание дополнительных access tokens сохраняет rate limit и ограничение активных токенов на blank.

### Removed — Diagrams (complete removal)

Diagrams удалены полностью из всех 7 мест. Пользователей нет, поддерживать нечего.

| Файл | Что удалено |
|---|---|
| `blank.schema.js` | тип `diagram` из `blockNodeSchema`, case в `validateBodyLimits`, ветка в `hasMeaningfulBodyContent` |
| `blank.renderer.js` | `plantumlHexUrl()`, case `diagram` в `renderBlockNode` |
| `render.js` | `plantumlHexUrl()`, case `diagram` в `renderBodyNode` |
| `editor.js` | запись `diagram` в `BLOCK_EDITORS`, `mermaid.run()` в `renderReadOnly`, ветка в `hasMeaningfulContent` |
| `core.css` | секция 10 (`.bs_diagram`, `.bs_diagram_preview`, `.mermaid` правила) |
| `layout.js` | флаг `includeMermaid`, `<script>` тег Mermaid CDN |
| `security.js` | `cdn.jsdelivr.net` из `scriptSrc`, `www.plantuml.com` из `imgSrc`, `blob:` из `workerSrc` |

---

## [1.2.0] — 2026-04-26

### Refactored
- **editor.js** полностью реорганизован на 13 именованных секций со сквозными комментариями.
- Введён **BLOCK_EDITORS registry** (`Map`): каждый тип блока (image, video) регистрирует `renderEditable`, `serialize`, `resolveTarget`. Добавить новый тип блока — одна запись в реестр и кнопка в тулбар.
- Весь `esc()` / `trim()` / `clamp()` / `closestBlock()` вынесен в секцию «Utilities».
- Устранено дублирование: `serializeInline` и `mergeStrings` заменяют три разных реализации слияния inline-нод.
- `showControl` / `hideControl` / `hidePanel` — единый интерфейс управления видимостью.

### CSS
- **core.css** разбит на 11 секций с заголовками; каждая секция самодостаточна.
- Введены новые дизайн-токены: `--bs-font-mono`, `--bs-block-gap`, `--bs-figure-gap`, `--bs-toolbar-hover`, `--bs-toolbar-active`, `--bs-shadow-toolbar`.
- Удалено мёртвое правило `--bs-icon-sprite`.

### Removed (dead code)
- `replaceParagraphWithCodeBlock`, `replaceParagraphWithDiagram`, `insertDividerAfterParagraph` — UI удалён ранее.
- `enableStaticIcons` и `ICON_SPRITE_URL`.
- Функции плавающей кнопки отмены медиа.

---

## [1.1.6] — 2026-04-26

### Changed
- Кнопка медиа в block toolbar работает как **toggle**: первый клик активирует промпт и подсвечивает кнопку; второй клик деактивирует.
- Escape в медиа-промпте деактивирует режим.

### Removed
- Плавающая кнопка «✕» отмены медиа-промпта.

---

## [1.1.5] — 2026-04-26

### Added
- Кнопка «Сохранить» получила чёрную заливку.
- При входе в режим редактирования курсор автоматически ставится в конец статьи.
- В панели публикации каждый URL имеет кнопку-иконку копирования с визуальным подтверждением.

### Removed
- Статусные сообщения «Редактирование включено» и «Изменения сохранены».

---

## [1.1.4] — 2026-04-26

### Changed
- Нераспознанная ссылка в медиа-промпте вставляется как гиперссылка.
- Кнопка блока кода убрана из block toolbar.
- Убран border-left у h2/h3 в редакторе.

---

## [1.1.3] — 2026-04-26

### Added
- Иконки тулбара заменены на inline SVG.

### Removed
- Кнопки «Разделитель» и «Диаграмма» удалены из block toolbar.

---

## [1.1.2] — 2026-04-26

### Fixed
- **BUG-005** Кнопка ссылки работает как toggle: если текст уже ссылка — клик убирает её.
- **BUG-006** Text toolbar и link tooltip позиционируются в page-relative координатах.
- **BUG-007** Block toolbar позиционируется от `.bs_page` padding.
- Активные состояния кнопок тулбара через `bs_tool_active`.

---

## [1.1.1] — 2026-04-26

### Fixed
- PlantUML диаграммы без `@startuml` получают автоматическую обёртку.
- Кнопки H2/H3 показывают текстовые метки «H2»/«H3».

---

## [1.1.0] — 2026-04-26

### Added
- Диаграммы Mermaid и PlantUML (удалены в 1.3.0).
- `compression` middleware, request logging (`morgan`).
- HTTP `Cache-Control` + `ETag` на страницах просмотра.
- `pg Pool` error handler + `connectionTimeoutMillis`.
- `errorHandler` скрывает детали от клиента на 5xx.
- `Dockerfile`: `ENV NODE_ENV=production`, `HEALTHCHECK`.
- `docker-compose.yml`: `restart: unless-stopped`, DB port на `127.0.0.1`.
- Общий модуль `toolbars.js`.

### Fixed
- **BUG-001** Enter в blockquote/h2/h3 через `beforeinput`.
- **BUG-002** `updateBlockToolbar` двойной `requestAnimationFrame`.
- **BUG-003** `showPublishSuccessFallback` не перезаписывает innerHTML панели.
- **BUG-004** Оба URL видимы после публикации.
- **UX-001** `min-height` только на `.bs_blank_host--editor`.
- **UX-002** Разделитель «·» между именем автора и датой.

---

## [1.0.0] — 2026-04-25

Initial release.

### Added
- Rich-text редактор: bold, italic, ссылки, H2, H3, цитата.
- Медиа по URL: изображения, YouTube, VK Video, RuTube.
- Публикация → public link + access link.
- Access token в `localStorage`, `?access=TOKEN` верификация.
- Автосохранение черновика каждые 300 мс.
- SSR с Open Graph / Twitter Card.
- Docker Compose, PostgreSQL, `helmet`, CSP, rate limiting.
- Токены хранятся только как SHA-256 hash.
