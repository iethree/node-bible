# bible

Minimal Bible-lookup app with ESV API caching.

## Stack

- **Runtime**: Bun (`bun` runs the TypeScript backend directly — no transpile step)
- **Backend**: Express 5 + `bun:sqlite`
- **Frontend**: Preact + Vite + Tailwind v4
- **Lint/format**: Biome
- **Process manager**: PM2

## Setup

```sh
bun install
cp .env.example .env   # add ESVTOKEN
```

## Develop

```sh
bun run dev           # server (3004) + Vite client (5173) with /api proxied
```

## Test, lint, build

```sh
bun test
bun run lint
bun run build         # outputs dist/client
```

## Production

```sh
bun run build
pm2 start ecosystem.config.cjs
```

The server serves the built client bundle from `dist/client` and the API under `/api`.
