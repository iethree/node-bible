# bible

Minimal Bible-lookup app with ESV API caching, served at https://bible.infopanel.org.

## Stack

- **Runtime**: Cloudflare Workers (API under `/api/*`; everything else is static assets)
- **Database**: Cloudflare D1 (`bible`), schema in `migrations/`
- **Frontend**: Preact + Vite + Tailwind v4
- **Lint/format**: Biome
- **Tests**: `bun test`, with a bun:sqlite stand-in for D1

## Setup

```sh
bun install
cp .dev.vars.example .dev.vars   # add ESVTOKEN, e.g. "Token abc123"
bun run db:migrate:local
```

## Develop

```sh
bun run dev           # builds the client, then wrangler dev on :8787
bun run dev:client    # optional: Vite HMR on :5173, /api proxied to :8787
```

## Test, lint, typecheck

```sh
bun test
bun run lint
bun run typecheck
```

## Deploy

```sh
bun run db:migrate    # apply new migrations to the remote D1 database
bun run deploy        # builds the client and deploys to bible.infopanel.org
```

The ESV token is a Worker secret: `wrangler secret put ESVTOKEN`.
