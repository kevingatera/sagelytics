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

## Budget rebalance (`fix/two-stage-budget`)

Recommendation: keep `legacy` as the default. The strict filter now runs on every domain, but two_stage still returns degraded results on all three, and it found nothing for the local service business.

Changes:

- Slices: website 18 s, candidates 10 s (was 15), strict filter 17 s (was 10), escalation 8 s. `DISCOVERY_BUDGET_MS` default is 65 s (was 55). Each ValueSERP search is capped at 8 s (was 30, floor 10). `DISCOVERY_{WEBSITE,CANDIDATE,STRICT,ESCALATION}_STAGE_MS` override the slices.
- The strict filter gets at most 12 candidates (the most it can approve). Reasons and snippets are cut to 160 characters, and only snippets for those 12 domains are sent. The first lodge run's prompt held 16 candidates and 16 snippets (10.7k chars). Replayed through cliproxy, it took 15-17 s and missed the 17 s slice. The trimmed prompt took 8-13 s.
- Trade-off: the worst case is 18 + 10 + 17 = 45 s before enrichment. That leaves 20 s, exactly the escalation minimum (8 s plus the 12 s enrichment reserve). ValueSERP searches slower than 8 s are dropped, so SERP candidates are lost more often. Perplexity usually supplies the candidates anyway.

Probes: one run each over TCP on port 3001. LLM calls went through cliproxy (`gpt-6-luna`), and `ENABLE_COMPETITOR_CACHE=false`. Cost is the ledger's known estimate. The bound in brackets also counts unknown-cost paid calls at list price.

| Domain | Pipeline | Latency | Competitors | Quality | Ledger cost |
| --- | --- | --- | --- | --- | --- |
| lebambougorillalodge.com (before prompt trim) | two_stage | 57.0 s | sabyinyo.com, singita.com, wildernessdestinations.com | degraded: `strict_filter_unavailable`, `budget_exhausted:valueserp`, `budget_exhausted:strict_filter` | $0.0475 (≤ $0.065) |
| lebambougorillalodge.com (before prompt trim, traced) | two_stage | 55.1 s | singita.com, wildernessdestinations.com, oneandonlyresorts.com | same as above | $0.045 (≤ $0.065) |
| lebambougorillalodge.com | two_stage | 52.0 s | wildernessdestinations.com, singita.com, oneandonlyresorts.com | degraded: `budget_exhausted:valueserp`; filter ran (13.6 s) | $0.0467 (≤ $0.065) |
| brightland.co (DTC olive oil) | two_stage | 50.4 s | corto.com, terradelyssa.com, colavita.com; 0 user products | degraded: `budget_exhausted:product_fallback`, `budget_exhausted:valueserp`; filter ran (9.6 s) | $0.0487 (≤ $0.075) |
| fullmoongroom.com (Portland mobile groomer) | two_stage | 42.7 s | none | degraded: `budget_exhausted:product_fallback`, `budget_exhausted:perplexity_discovery`, `budget_exhausted:escalation`; filter ran (6.7 s) | $0.0185 (≤ $0.0375) |
| brightland.co | legacy | 83.3 s | californiaoliveranch.com, corto-olive.com, cobramestate.com; 1 user product | not reported (no ledger) | about $0.05 (1 discovery + 4 research calls) |

Paid spend for this round: about $0.25 known, at most $0.36. Legacy was not re-run on the lodge (84.6 s in the previous round) or on the groomer, to stay under $0.40.

Findings:

- Strict filter: it ran on all three domains after the prompt trim. On the lodge it approved `wildernessdestinations.com` (Bisate's operator) and `oneandonlyresorts.com` (Gorilla's Nest). Both run lodges in the park, but they are brand domains, not lodge sites. That is no clear gain over the earlier unfiltered list.
- Brightland: both pipelines found direct olive oil brands. two_stage was 33 s faster, but it extracted no user products, so product matching is empty. Legacy found one.
- Full Moon Groom: zero competitors. With `businessType=other`, Perplexity first runs a research call to infer the type, which took 9 s of the 10 s candidate slice, so discovery was cut off. ValueSERP's queries used the vague type, so its results were restaurants and directories, and the filter rejected all of them. Escalation started with about 30 s left, and its 8 s slice was too short for an OpenAI web search.
- Website LLM: it still timed out on every two_stage run. The homepage call used its full 12 s, and the catalog call then got 1-2 s. The 2 s bound is still present after rebasing onto `ef6cd71` (fix/ssrf-guard), whose website-discovery changes pass an abort signal but keep `max(1000, min(12000, remaining - 3000))`. The model manager uses `gemini-2.5-flash` with thinking enabled. A direct call with the real prompt took 12-13 s, or 4.6-5.3 s with `thinkingConfig.thinkingBudget: 0`. Gemini also returned 503 "high demand" in bursts, and LangChain retries those up to 6 times. Running homepage and catalog in parallel would not help, because one model's calls are queued in sequence.

Missing before two_stage can be the default:

1. Website stage: turn off Gemini thinking for the website extraction call, or switch models, so the homepage call fits in 12 s. Skip the catalog LLM call when less than about 5 s is left, and use the text fallback instead. These changes are in `website-discovery.service.ts` and `model-manager.service.ts`.
2. Vague business types: pass the website-derived type to Perplexity instead of `other`, or skip its inference call when the stage has under 15 s left.
3. Escalation: the 8 s slice is too short for an OpenAI web search, so it only adds cost. Give it at least 15 s or turn it off by default.
4. Re-run all three domains with legacy for a full comparison once 1-3 are fixed.
