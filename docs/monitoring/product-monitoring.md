# Product Monitoring

This document is the canonical reference for competitor monitoring behavior.

## What Exists Today

- Competitor discovery and enrichment through microservices
- Product/price extraction via website discovery + AI fallback
- Monitoring task workflows in app and microservice client
- Live probing support via TCP discovery probe script

## Request Paths

- App API entrypoints (Next.js): `/api/product-monitor`, monitoring/task APIs
- Microservice transport: Nest TCP patterns (for example `discover_competitors`, `monitor_competitor_prices`)

Do not probe microservices with raw HTTP on `:3001`; use app APIs or a TCP client.

## Monitoring Loop

1. Discover competitors and candidate products
2. Persist/refresh monitored competitor-product targets
3. Run scheduled checks
4. Compare against prior history
5. Raise alerts and surface trends

Each worker polls once a minute and skips ticks while its previous batch is running.
It claims due tasks in oldest-first order, up to five per user, and runs up to five
tasks concurrently. Postgres leases keep replicas from sharing an active claim
and make unfinished tasks eligible again after a lease expires.

Each task stops checking URLs after two minutes and logs skipped work. Its next
run stays on the original hourly, six-hourly, or daily schedule. After downtime,
the worker runs one overdue check and resumes at the next future slot.

## Operational Commands

```bash
# Start microservices
cd src/microservices && pnpm start:dev

# Run live discovery probe (TCP)
pnpm maintenance:probe-discovery -- --domain "https://example.com"
```

## Key Cost/Latency Controls

Environment knobs (validated in `src/microservices/src/env.ts`):

- `MONITORING_BATCH_SIZE` limits each poll to 25 tasks by default.
- `MONITORING_MAX_URLS_PER_TASK` limits each run to 50 URLs by default.
- `MONITORING_URL_TIMEOUT_MS` gives each URL up to 45,000 ms by default.
- `COMPETITOR_DISCOVERY_LIMIT`
- `COMPETITOR_KNOWN_LIMIT`
- `COMPETITOR_RESEARCH_TIMEOUT_MS`
- `MATCH_ENHANCEMENT_TIMEOUT_MS`
- `ENABLE_MATCH_ENHANCEMENT`
- `PERPLEXITY_TIMEOUT_MS`
- `PERPLEXITY_ENABLE_MODEL_FALLBACK`

Use these first before changing code when optimizing runtime cost.
