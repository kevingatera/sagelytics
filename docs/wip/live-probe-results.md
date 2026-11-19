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

## Re-probe through cliproxy

Run after merging `fix/llm-config`. OpenAI and OpenRouter calls went to the OpenAI-compatible cliproxy (`OPENAI_BASE_URL` and `OPENROUTER_BASE_URL`) with `gpt-6-luna`. Perplexity, ValueSERP and Spider used the direct keys. Domain: lebambougorillalodge.com. One run each.

| Pipeline | Latency | Competitors | Quality | Paid spend (est.) |
| --- | --- | --- | --- | --- |
| legacy | 84.6 s | wildernessdestinations.com, singita.com, amakoro.com | not reported | about $0.05 (Perplexity discovery + 3-4 research calls) |
| two_stage | 52.1 s | sabyinyo.com, fivevolcanoesrwanda.com, virungalodge.com | degraded, partial, low confidence: `strict_filter_unavailable`, `budget_exhausted:valueserp`, `budget_exhausted:strict_filter` | $0.0475 in the ledger, 5 calls with unknown cost |

What it shows:

- The cliproxy route works end to end. Both pipelines returned within the client timeout, and there were no account errors.
- two_stage now finishes inside the 55 s budget (it timed out at 90 s before the fixes). Its competitor list is closer to the business: lodges in the same park, not a parent brand (`wildernessdestinations.com`) or a pan-African chain.
- The strict filter never ran. ValueSERP took its whole 15 s candidate slice, three of six searches hit the deadline, and the OpenAI filter then hit its 10 s slice. A direct `/responses` call to `gpt-6-luna` through cliproxy with the same task took 8.0 s (`gpt-5.6-luna` took 6.5 s; `deepseek-v4.1-flash` took 39 s), so 10 s leaves no margin once request setup and JSON parsing are added.
- The homepage LLM call in two_stage got a 2 s bound because the website stage started late, and it timed out. It fell back to text extraction.
- Legacy spent 60 s in two website LLM calls that each timed out at 30 s before reaching Perplexity.

Next: give the strict filter a 15-18 s slice (take it from the 15 s candidate slice by capping ValueSERP at 8-10 s, or raise `DISCOVERY_BUDGET_MS` to about 70 s), then re-run two_stage on this domain plus two other categories before deciding the default. Keep legacy as the default until then.
