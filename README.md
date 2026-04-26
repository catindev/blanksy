# Blanksy

Minimal blank publishing service inspired by telegra.ph. The MVP uses `Node.js + Express + PostgreSQL` on the backend and plain `HTML/CSS/JS` with `contenteditable` on the frontend.

## Local start

1. Optional: copy [.env.example](/Users/vladimirtitskiy/Dev/blanksy/.env.example) to `.env`.
2. Run:

```bash
docker compose up --build
```

3. Open [http://localhost:3000](http://localhost:3000).

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
