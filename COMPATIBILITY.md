# Compatibility

## Content model

### Supported block types (v1.3.0)

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

### Removed block types

| Type | Removed | Reason |
|---|---|---|
| `diagram` | 1.3.0 | No users, no content to preserve. Removed from API, schema, renderers, CSS and CSP. |

### Breaking changes by version

#### 1.3.0 — Diagram block type removed
`type: "diagram"` nodes are no longer accepted by the API (`POST /api/blanks`, `PATCH /api/blanks/:id`).
Requests containing diagram nodes will fail validation with HTTP 400.

#### 1.1.3 — Diagram editor UI removed
Diagram insertion was removed from the editor UI. The API still accepted diagram nodes at this point.

#### 1.0.0 — Initial schema
Stable schema established.

## API

`POST /api/blanks` and `PATCH /api/blanks/:id` validate the body against `blank.schema.js`.

## Storage

Access tokens stored only as SHA-256 hash. Raw tokens are never persisted.

`localStorage` keys:
- `blanksy:access:{blankId}` — access token
- `blanksy:new:draft` — draft of blank being created
- `blanksy:blank:{blankId}:draft` — draft of blank being edited
- `blanksy:known_blanks` — up to 50 recently accessed blanks

## Architectural boundaries

- Frontend JS: vanilla IIFE modules, no build step. Adding a build step is a breaking dev workflow change.
- All block types are rendered SSR (for SEO) and client-side (for the live editor). Both renderers must stay in sync — add a new block type to `render.js`, `blank.renderer.js`, `blank.schema.js` and `BLOCK_EDITORS` registry together.
- `BLOCK_EDITORS` registry in `editor.js` is the single source of truth for editor knowledge of block types.
- E2e tests live in `e2e/` and require a running server. Unit tests in `test/` are standalone.
