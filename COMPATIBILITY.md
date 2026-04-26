# Compatibility

## Content model

### Backward compatibility
Published blank content is stored as `BlankNode[]` JSON in PostgreSQL.
The renderer (`blank.renderer.js`, `render.js`) supports all node types that have ever been produced.
The editor (`editor.js`) may remove insertion UI for a node type while still rendering existing nodes of that type correctly.

### Breaking changes by version

#### 1.1.3 — Diagram editor UI removed
The diagram block type (`type: "diagram"`) is no longer insertable via the editor UI.
Existing blanks containing diagram nodes continue to render correctly in read-only mode.
The `BLOCK_EDITORS` registry in `editor.js` retains the diagram entry for `renderEditable` (opening old blanks) and `serialize` (saving old blanks without data loss).

#### 1.0.0 — Initial schema
Stable schema established. All 1.x releases maintain full read compatibility with blanks created since 1.0.0.

## API

`POST /api/blanks` and `PATCH /api/blanks/:id` validate the body against `blank.schema.js`.
The schema accepts all node types listed in `blockNodeSchema` including legacy `diagram` nodes.

## Storage

Access tokens are stored only as SHA-256 hash. Raw tokens are never persisted.
`localStorage` keys:
- `blanksy:access:{blankId}` — access token for a specific blank
- `blanksy:new:draft` — draft of the currently-being-created blank
- `blanksy:blank:{blankId}:draft` — draft of a blank being edited
- `blanksy:known_blanks` — list of up to 50 recently accessed blanks (title + path)

## Architectural boundaries

- Frontend JS is vanilla IIFE modules with no build step. Adding a build step is a breaking change to the development workflow.
- All block types are rendered server-side (SSR) for SEO and client-side for the live editor. Both renderers must be kept in sync.
- The `BLOCK_EDITORS` registry in `editor.js` is the single source of truth for the editor's knowledge of block types.
