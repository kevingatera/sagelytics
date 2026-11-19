# Paid work and monitoring limits

Full competitor discovery uses the discovery allowance. Competitor add and on-demand price monitoring use separate hourly rate limits. The REST and tRPC add endpoints share a bucket. Each account can run one operation of each kind at a time.

- Set `COMPETITOR_ADD_MAX_PER_HOUR` in Next.js to change the default of 5 attempts.
- Set `PRODUCT_MONITOR_MAX_PER_HOUR` in Next.js to change the default of 3 attempts.
- Set `ANALYSIS_MAX_LLM_CALLS` in the microservice to change the default of 3 model requests per competitor analysis, including legacy fallback and Perplexity retries.
- The app passes a single 45-second deadline through both catalog loading and analysis. The configured TCP response timeout can shorten an individual call. Existing catalog products are read from Postgres before trying a fresh crawl.
- An attempt counts against the hourly limit as soon as it starts, even if the catalog fetch or analysis then fails (for example when the microservice is down). The 429 message says so.
- The one-at-a-time lock is a Redis lease (`SET NX PX`, released by compare-and-delete) that holds no database connection during the paid call. Hourly counts use the app rate limiter. Both fall back to per-process state when Redis is unavailable.

Monitoring task writes share the billing user lock. Onboarding stores the URLs that fit at write time. At run time the worker allocates the current allowance to active, enabled tasks in creation order, breaking ties by task ID. Excess URLs stay stored so a later upgrade can make them eligible again.

Set `MONITORING_BILLING_ENABLED=true` on the worker when billing is enabled in Next.js and the worker does not have Stripe credentials. Set it to `false` when billing is disabled. Without an explicit flag, the worker checks for the same three Stripe environment variables as Next.js. Keep `BILLING_FREE_MONITORED_PRODUCTS` and `BILLING_PRO_MONITORED_PRODUCTS` aligned across both processes. Defaults are 5 and 200.

The worker rotates through each task's eligible URLs, attempting at most `MONITORING_MAX_URLS_PER_TASK` (default 50) per run. It saves its next position (`url_cursor`, migration 0008) with the task's next scheduled time.
