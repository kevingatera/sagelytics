# Paid work and monitoring limits

Full competitor discovery uses the discovery allowance. Competitor add and on-demand price monitoring use separate hourly rate limits. The REST and tRPC add endpoints share a bucket. Each account can run one operation of each kind at a time.

- Set `COMPETITOR_ADD_MAX_PER_HOUR` in Next.js to change the default of 5 attempts.
- Set `PRODUCT_MONITOR_MAX_PER_HOUR` in Next.js to change the default of 3 attempts.
- Set `ANALYSIS_MAX_LLM_CALLS` in the microservice to change the default of 3 model requests per competitor analysis, including legacy fallback and Perplexity retries.
- The app passes a single 45-second deadline through both catalog loading and analysis. The configured TCP response timeout can shorten an individual call. Existing catalog products are read from Postgres before trying a fresh crawl.
- An attempt counts against the hourly limit as soon as it starts, even if the catalog fetch or analysis then fails (for example when the microservice is down). The 429 message says so.
- The one-at-a-time lock is a Redis lease (`SET NX PX`, released by compare-and-delete) that holds no database connection during the paid call. Hourly counts use the app rate limiter. Both fall back to per-process state when Redis is unavailable.

## Discovery deadline

Full discovery (`/api/competitor-discovery`, onboarding and `POST /api/competitor-initial`) sends the microservice one absolute deadline.

- The app's TCP timeout is `MICROSERVICE_DISCOVERY_TIMEOUT_MS`. The default is 120 s, and values below 90 s are raised to 90 s.
- The deadline is the TCP timeout minus 10 s. With the defaults that is 110 s from the request, or 80 s at the floor.
- From the deadline on, the microservice starts no paid call and aborts in-flight HTTP requests to Perplexity, ValueSERP, website fetches and bounded model calls. The service then has 5 s to answer, which is before the app's TCP timeout.
- Model calls in the legacy fallback and in match enhancement go through the model queue with the run's signal. A call is counted when the queue sends it, not when it is queued. A call still waiting when the run aborts or its deadline passes leaves the queue unsent and is not counted.
- The agent fallback uses at most 4 search queries from the model, after trimming and case-insensitive dedupe, and sends at most 6 ValueSERP requests per run (`MAX_FALLBACK_SEARCH_QUERIES` and `MAX_FALLBACK_SERP_REQUESTS` in `intelligent-agent.service.ts`).
- The two-stage pipeline uses `DISCOVERY_BUDGET_MS` (default 65 s) or the time left until the deadline, whichever is shorter.
- A failed run answers with `paidCallsStarted`. The legacy pipeline counts every paid request it dispatches. The website analysis step counts as paid even when it makes no billed call. The two-stage pipeline reports `null` (unknown).
- The app refunds the discovery only when the service reports `paidCallsStarted: 0`. A TCP timeout, an unknown count or any started paid call keeps the discovery charged. Onboarding also refunds a request that fails before it calls the microservice.
- A legacy run stopped by the deadline is not cached.

## Monitoring tasks

Monitoring task writes share the billing user lock. Onboarding stores the URLs that fit at write time. At run time the worker allocates the current allowance to active, enabled tasks in creation order, breaking ties by task ID. Excess URLs stay stored so a later upgrade can make them eligible again.

Set `MONITORING_BILLING_ENABLED=true` on the worker when billing is enabled in Next.js and the worker does not have Stripe credentials. Set it to `false` when billing is disabled. Without an explicit flag, the worker checks for the same three Stripe environment variables as Next.js. Keep `BILLING_FREE_MONITORED_PRODUCTS` and `BILLING_PRO_MONITORED_PRODUCTS` aligned across both processes. Defaults are 5 and 200.

The worker rotates through each task's eligible URLs, attempting at most `MONITORING_MAX_URLS_PER_TASK` (default 50) per run. It saves its next position (`url_cursor`, migration 0008) with the task's next scheduled time.
