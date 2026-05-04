# Changelog

All notable changes to this project are documented in this file.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.3.3] — 2026-04-27

### Removed
- **Автосохранение черновика в localStorage** удалено полностью. Несохранённые изменения теряются при перезагрузке страницы — как в Telegraph. Это устраняет сценарий когда пользователь видит устаревший черновик вместо актуального контента с сервера.

### Changed
- **Ошибки API** теперь на русском языке. Вместо `"Failed to fetch"` пользователь видит понятное сообщение: «Не удалось связаться с сервером. Проверьте соединение и попробуйте снова.» Отдельные сообщения для 401, 403, 404, 429, 500, 503.

### Fixed
- **Media UX после вставки** (начато в 1.3.3): после вставки изображения или видео каретка ставится в `figcaption` вместо пустого параграфа под figure. Блок toolbar больше не появляется сразу («висящая иконка»). При загрузке/ошибке изображения пересчитывается позиция UI.
- `insertMediaBlock` теперь принимает `env` первым параметром.

---

## [1.3.2] — 2026-04-27

### Fixed
- **Накопление пустых параграфов**: `collapseConsecutiveEmptyParagraphs()` вызывается в `input` handler и в `hydrateEditor`. Схлопывает подряд идущие пустые `<p>` в один — при вводе и при загрузке сохранённого контента из БД. Одиночный пустой параграф между блоками сохраняется как осознанный отступ.
- **`beforeinput` guard**: Enter в пустом `<p>` перехватывается через `beforeinput` с `inputType === 'insertParagraph'` (тот же механизм что уже закрывал BUG-001 для blockquote/h2/h3).
- **CSS**: промежуточные пустые параграфы не показывают плейсхолдер «Начните писать…» — только последний.
- **Размер заголовка**: `clamp(2.7rem, 6vw, 4rem)` → `clamp(2rem, 4vw, 2.8rem)` на десктопе; `clamp(2.35rem, 12vw, 3.15rem)` → `clamp(1.85rem, 9vw, 2.4rem)` на мобильном.
- **e2e**: два новых теста на repeated Enter и одиночный отступ между блоками.

---

## [1.3.1] — 2026-04-27

### Fixed
- CSS-фикс для промежуточных плейсхолдеров и размер заголовка (предшественник 1.3.2, применён к правильному архиву).

---

## [1.3.0] — 2026-04-26

### Added
- Playwright e2e test suite: `01-publish`, `02-edit`, `03-toolbar`, `04-media` — 25 тестов. Desktop Chrome + iPhone 14.
- Toolbar active/mixed state через DOM-обход (`TreeWalker`). Класс `bs_tool_mixed` для частичного выделения.
- Link tooltip: позиция от `savedRange.getBoundingClientRect()`, подставляет существующий `href`, пустое поле → `unlink`.

### Removed
- Diagram block type (`type: "diagram"`) удалён из API, schema, renderers, CSS, CSP. API возвращает 400 на diagram payload.
- Mermaid CDN и PlantUML из CSP и layout.

---

## [1.2.0] — 2026-04-26

### Refactored
- `editor.js` реорганизован на 13 секций. `BLOCK_EDITORS` registry — расширяемый реестр типов блоков.
- `core.css` разбит на 11 секций с дизайн-токенами.

---

## [1.1.x] — 2026-04-26

Серия патчей: SVG-иконки, toggle медиа-промпта, чёрная кнопка Сохранить, cursor-in-end при входе в редактирование, кнопки копирования URL в панели публикации, позиционирование тулбаров, удаление diagram UI.

---

## [1.0.0] — 2026-04-25

Initial release. Rich-text editor, media by URL, publish/access link flow, SSR с OG-мета, Docker Compose, PostgreSQL, helmet + CSP, rate limiting, hash-only access tokens.
