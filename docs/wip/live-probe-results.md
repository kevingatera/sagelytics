# Live discovery probe results

The benchmark failed the latency requirement. Further paid probes were stopped because the ledger could not establish total spend.

| Pipeline | Domain | Latency | Ledger cost | Competitors | Verdict |
| --- | --- | --- | --- | --- | --- |
| two_stage | lebambougorillalodge.com | Timed out at 90.089 s | At least $0.05; five calls have unknown cost | No response | Fail |
| legacy | lebambougorillalodge.com | Not run | Unknown | Not measured | Not assessed |

The ledger recorded three ValueSERP calls, one OpenAI filter call, and one OpenRouter filter call with unknown cost. It recorded one Perplexity discovery call and four research calls at $0.05 total. Actual spend may be higher. The client timeout does not necessarily cancel server work. Raw client output is in the ignored `logs/probes/two-stage/benchmark.raw`.

Do not make two-stage the default based on this run. Establish complete cost accounting and bounded execution, then repeat the benchmark, legacy comparison, and remaining domain categories under the budget. No discovery code was changed.
