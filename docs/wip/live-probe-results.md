# Live discovery probe results

The benchmark failed the latency requirement. Further paid probes were stopped because the ledger could not establish total spend.

| Pipeline | Domain | Latency | Ledger cost | Competitors | Verdict |
| --- | --- | --- | --- | --- | --- |
| two_stage | lebambougorillalodge.com | Timed out at 90.089 s | At least $0.05; five calls have unknown cost | No response | Fail |
| legacy | lebambougorillalodge.com | Not run | Unknown | Not measured | Not assessed |

The ledger recorded three ValueSERP calls, one OpenAI filter call, and one OpenRouter filter call with unknown cost. It recorded one Perplexity discovery call and four research calls at $0.05 total. Actual spend may be higher. The client timeout does not necessarily cancel server work. Raw client output is in the ignored `logs/probes/two-stage/benchmark.raw`.

Do not make two-stage the default based on this run. Establish complete cost accounting and bounded execution, then repeat the benchmark, legacy comparison, and remaining domain categories under the budget. No discovery code was changed.

## Fixes after probe

Verified with mocked tests only. No paid calls were made, so the benchmark has not been re-run.

- Budget: `DISCOVERY_BUDGET_MS` (default 55000) bounds a run. Stage slices are website 18 s, candidates 15 s, strict filter 10 s, escalation 8 s, and enrichment gets the remainder minus a 1.5 s finalize reserve. A stage that runs out returns partial, degraded results.
- Escalation is skipped when less than 20 s remains.
- Website: the homepage LLM call is bounded at `min(12 s, remaining - 3 s)`, floor 1 s. On timeout it falls back to text extraction. The probe showed the homepage LLM finishing at about 30 s, just after the 30 s stage deadline.
- Account errors (401, 402, `insufficient_quota`) are not retried. The provider is disabled for the rest of the run, and the error is logged once and reported in `quality.accountErrors`.
- Perplexity 429s retry at most twice with jittered backoff, honouring Retry-After, and only while the deadline allows. OpenAI and OpenRouter 429s are not retried.
- Enrichment concurrency is set by `COMPETITOR_ENRICHMENT_CONCURRENCY` (default 2, was 3).
- ValueSERP requests run in parallel within the candidate stage. Each search is priced at `VALUESERP_COST_PER_QUERY_USD` (default 0.0025, from https://www.valueserp.com/). Calls that failed before billing (401, 402, network error before response) count as $0. An unset price stays unknown.
- Client: the discovery timeout is at least 60 s, above the budget. The probe keeps its 240 s default and prints `quality`.

Open items:

- ValueSERP price conflict: the homepage says "from $2.50/1k searches", but the pricing page lists credit plans at $1.00–$2.00 per 1k. Confirm before relying on the cost figures.
- At the default budget, escalation's 8 s slice rarely completes an OpenAI web search, so escalation is effectively off unless the budget is raised.
- Timeouts and 429s are reported as unknown cost, not $0, because the spend cannot be established.
- `withBatchProcessing` takes no abort signal, so an abandoned LLM call still occupies the batch queue.
