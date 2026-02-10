# Sagelytics

Sagelytics is a competitor intelligence platform built with Next.js + tRPC (app) and NestJS (microservices). It discovers competitors, tracks product and price signals, and surfaces actionable comparisons.

## Quick Start

1. Install dependencies:
```bash
pnpm install
```
2. Start local data services:
```bash
./start-database.sh
```
3. Run migrations/schema push:
```bash
pnpm db:push
```
4. Run the app and microservices:
```bash
pnpm dev
cd src/microservices && pnpm start:dev
```

## Common Commands

- `pnpm dev` - Next.js app with logs
- `pnpm typecheck` - TypeScript checks
- `pnpm lint` - ESLint checks
- `cd src/microservices && pnpm build` - Build microservices
- `pnpm maintenance:probe-discovery -- --domain "https://example.com"` - Live TCP discovery probe

## Documentation

- Contributor and memory guide: `AGENTS.md`
- Docs index: `docs/README.md`
- Microservices guide: `src/microservices/README.md`
- Shared types package: `packages/types/README.md`

## Notes

- The microservice on port `3001` uses Nest **TCP transport**, not HTTP.
- Use the app API or TCP client for discovery probes.
