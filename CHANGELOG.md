# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-04-26

### Refactored
- **editor.js** полностью реорганизован на 13 именованных секций со сквозными комментариями.
- Введён **BLOCK_EDITORS registry** (`Map`): каждый тип блока (image, video, diagram) регистрирует `renderEditable`, `serialize`, `resolveTarget`. Добавить новый тип блока теперь означает добавить одну запись в реестр и кнопку в тулбар — больше ничего трогать не нужно.
- Весь `esc()` / `trim()` / `clamp()` / `closestBlock()` вынесен в секцию «Utilities» в конце файла.
- Устранено дублирование: `serializeInline` и `mergeStrings` заменяют три разных реализации слияния inline-нод.
- `showControl` / `hideControl` / `hidePanel` — единый интерфейс управления видимостью элементов вместо прямого `node.hidden`.

### CSS
- **core.css** разбит на 11 секций с заголовками; каждая секция самодостаточна.
- Введены новые дизайн-токены: `--bs-font-mono`, `--bs-block-gap`, `--bs-figure-gap`, `--bs-toolbar-hover`, `--bs-toolbar-active`, `--bs-shadow-toolbar`.
- Удалено мёртвое правило `--bs-icon-sprite` (спрайт убран в 1.1.x).
- Удалены стили редактора диаграмм (`.bs_diagram_controls`, `.bs_diag_syntax_btn`, `.bs_diagram_code`); стили просмотра диаграмм сохранены с явным комментарием «read-only legacy».
- Дублирующие селекторы блоков объединены через `--bs-block-gap` и `--bs-figure-gap`.

### Removed (dead code)
- `replaceParagraphWithCodeBlock` — UI-кнопка кода удалена в 1.1.3.
- `replaceParagraphWithDiagram` — UI-кнопка диаграммы удалена в 1.1.3.
- `insertDividerAfterParagraph` — кнопка разделителя удалена в 1.1.3.
- Обработчик `.bs_diag_syntax_btn` из `bindEditorEvents`.
- `enableStaticIcons` и `ICON_SPRITE_URL` — убраны вместе со спрайтом в 1.1.3.
- Функции плавающей кнопки отмены медиа (`hideMediaCancelBtn`, `positionMediaCancelBtn`) — убраны в 1.1.6.

### Production hardening
- Прямые text nodes в `contenteditable` root нормализуются в параграфы перед сериализацией, чтобы видимый текст не терялся при публикации.
- Индекс активных access-token hash вынесен в отдельную миграцию `002_access_token_active_index.sql`.
- Добавлен `TRUST_PROXY` для корректных client IP за reverse proxy.
- Логи HTTP и 5xx-ошибок редактируют `?access=...`, чтобы access tokens не попадали в серверные логи.
- Создание дополнительных access tokens получило rate limit и ограничение активных токенов на blank.

---

## [1.1.6] — 2026-04-26

### Changed
- Кнопка медиа в block toolbar работает как **toggle**: первый клик активирует промпт и подсвечивает кнопку (как bold/italic); второй клик деактивирует и возвращает «Начните писать...».
- Escape в медиа-промпте также деактивирует режим.

### Removed
- Плавающая кнопка «✕» отмены медиа-промпта удалена вместе со всеми связанными функциями и CSS.

---

## [1.1.5] — 2026-04-26

### Added
- Кнопка «Сохранить» получила чёрную заливку — визуально выделяется среди прочих кнопок.
- При входе в режим редактирования в конец статьи автоматически добавляется пустой параграф, курсор ставится туда — можно сразу продолжать писать.
- В панели публикации каждый URL (публичный и доступа) теперь имеет кнопку-иконку копирования. Кнопка зеленеет на 1.5 с после успешного копирования; при недоступном Clipboard API выделяет input автоматически.

### Removed
- Статусные сообщения «Редактирование включено» и «Изменения сохранены» убраны — смена кнопок сама по себе является достаточным сигналом.

---

## [1.1.4] — 2026-04-26

### Changed
- Нераспознанная ссылка в медиа-промпте больше не выдаёт ошибку — вместо этого вставляется как обычная гиперссылка (`<a href>`). Пустая строка просто деактивирует промпт.
- Кнопка блока кода убрана из block toolbar.
- Убран border-left у h2/h3 в редакторе (визуально они ошибочно выглядели как цитаты).

---

## [1.1.3] — 2026-04-26

### Added
- Иконки тулбара заменены на inline SVG (italic, link, H2, H3, quote, media). Поддержка спрайта и класс `bs_has_icons` удалены.
- Добавлен «⬡» code block button в block toolbar (убран в 1.1.4).
- Добавлена кнопка отмены медиа-промпта «✕» (убрана в 1.1.6).

### Removed
- Кнопки «Разделитель» и «Диаграмма» удалены из block toolbar.

---

## [1.1.2] — 2026-04-26

### Fixed
- **BUG-005** Кнопка ссылки в text toolbar работает как toggle: если выделенный текст уже является ссылкой — клик убирает её (`execCommand('unlink')`).
- **BUG-006** Text toolbar и link tooltip позиционируются в page-relative координатах через `getPageLeft()`. На широких экранах tooltip больше не уезжает вправо за пределы viewport.
- **BUG-007** Block toolbar позиционируется от `.bs_page` padding, а не от `rect.left` параграфа.
- Добавлены активные состояния кнопок тулбара (`bs_tool_active`) через `queryCommandState` и `closest('a')`.

---

## [1.1.1] — 2026-04-26

### Fixed
- **BUG-003** PlantUML диаграммы без `@startuml` получают автоматическую обёртку — без неё сервер возвращал welcome-страницу.
- Кнопки H2/H3 в text toolbar убраны из спрайта — показывают текстовые метки «H2»/«H3».
- Убран border-left у заголовков в редакторе (первая попытка; финально исправлено в 1.1.4).

---

## [1.1.0] — 2026-04-26

### Added
- **Диаграммы**: новый тип блока `diagram` с `syntax: 'mermaid' | 'plantuml'`. Mermaid рендерится через CDN-библиотеку (загружается только на страницах с диаграммами). PlantUML — через `plantuml.com/svg/~h{hex}`.
- **Compression** middleware (`npm: compression`).
- **Request logging** (`morgan`).
- HTTP `Cache-Control` + `ETag` на страницах просмотра blank.
- `pg Pool` error handler + `connectionTimeoutMillis`.
- `errorHandler` теперь скрывает детали от клиента на 5xx.
- `Dockerfile`: `ENV NODE_ENV=production`, `HEALTHCHECK`.
- `docker-compose.yml`: `restart: unless-stopped`, DB port привязан к `127.0.0.1`.
- Общий модуль `toolbars.js` — устранено дублирование HTML тулбаров.

### Fixed
- **BUG-001** Enter в blockquote/h2/h3 переводился через `beforeinput` вместо `keydown` — браузер больше не успевает клонировать блок.
- **BUG-002** `updateBlockToolbar` использует двойной `requestAnimationFrame` чтобы `offsetWidth` был корректен.
- **BUG-003** `showPublishSuccessFallback` больше не перезаписывает innerHTML панели — крашит режим показа access URL.
- **BUG-004** Оба URL (публичный и доступа) видимы в панели после публикации.
- **UX-001** `min-height` убран со страницы просмотра blank; добавлен только на `.bs_blank_host--editor`.
- **UX-002** Разделитель «·» между именем автора и датой отображается корректно.

---

## [1.0.0] — 2026-04-25

Initial production release.

### Added
- Минималистичный редактор в духе Telegraph: `/` открывает редактор, вводишь, публикуешь.
- Форматирование выделения: жирный, курсив, ссылка, H2, H3, цитата.
- Block toolbar на пустой строке: медиа (изображение, YouTube, VK Video, RuTube), разделитель.
- Публикация через `POST /api/blanks`; ответ содержит public link + access link.
- Access token хранится в `localStorage`; `?access=TOKEN` верифицирует и убирает токен из URL.
- Анонимные blanks получают `expires_at` через год; cleanup job раз в сутки.
- SSR blank-страниц с SEO-мета-тегами (Open Graph, Twitter Card).
- Docker Compose для локального запуска (Node.js + PostgreSQL).
- Rate limiting через `express-rate-limit` на create/update/verify.
- Безопасность: `helmet` + CSP, токены хранятся только как SHA-256 hash, `serializeBootData` экранирует `</script>`.
