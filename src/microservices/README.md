# Sagelytics Microservices

NestJS microservices for competitor discovery, website analysis, and monitoring workflows.

## Runtime Model

- Transport: Nest TCP (`@nestjs/microservices`)
- Default bind: `0.0.0.0:3001`
- Redis is used for caching/progress and should degrade gracefully when unavailable

This service is not a standalone HTTP API on port `3001`.

## Setup

```bash
pnpm install
cd src/microservices
pnpm start:dev
```

Required env values are validated in `src/microservices/src/env.ts`.

## Useful Commands

```bash
# Build
cd src/microservices && pnpm build

# Integration test (discovery)
cd src/microservices && pnpm test -- src/test/integration/competitor-discovery.spec.ts --runInBand --forceExit

# Live Perplexity integration check
cd src/microservices && pnpm test:perplexity
```

## Core Modules

- `src/competitor/` - competitor discovery and analysis orchestration
- `src/website/` - website crawling/content extraction
- `src/llm-tools/` - Perplexity and model integrations
- `src/shared/` - shared utilities/services

## Message Patterns

Primary patterns include:

- `discover_competitors`
- `analyze_competitor`
- `discover_website_content`
- monitoring-related patterns in website/monitoring services

Use the app API layer or Nest TCP client to invoke them.
