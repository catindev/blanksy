# Blanksy

Minimal blank publishing service inspired by telegra.ph. The MVP uses `Node.js + Express + PostgreSQL` on the backend and plain `HTML/CSS/JS` with `contenteditable` on the frontend.

## Local start

1. Optional: copy [.env.example](/Users/vladimirtitskiy/Dev/blanksy/.env.example) to `.env`.
2. Run:

```bash
docker compose up --build
```

3. Open [http://localhost:3000](http://localhost:3000).

## Development modes

### Full stack in Docker

```bash
docker compose up --build
```

### App on host, Postgres in Docker

1. Create `.env` from [.env.example](/Users/vladimirtitskiy/Dev/blanksy/.env.example).
2. Run:

```bash
npm ci
```

```bash
npm run dev
```

When `DATABASE_URL` points to `localhost:5432`, `npm run dev` automatically starts `docker compose` service `db`, waits for PostgreSQL, and then launches the watched app server.

To stop local containers later:

```bash
npm run dev:down
```

## MVP slice

- Open `/` and start writing immediately.
- Publish a blank and get:
  - public URL
  - access URL
- Open the public page in read-only mode.
- Open the access link, enable `Edit`, and `Save`.
- Media by external URL only:
  - image
  - YouTube
  - VK Video canonical public links
  - RuTube

## Development

```bash
npm ci
npm test
npm run dev
```

## Releases and tags

- CI runs on every push and pull request.
- Pushing a tag matching `v*.*.*` triggers:
  - tests
  - GitHub Release creation
  - Docker image publish to `ghcr.io/<owner>/<repo>`

Suggested versioning flow:

```bash
npm version patch
git push origin main --follow-tags
```

Or use:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```
