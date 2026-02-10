# Monitoring Plan

This plan consolidates prior `tasks.md` and `plan.md` drafts into one implementation roadmap.

## Current Baseline

- Monitoring UI exists with task management surfaces
- Discovery and enrichment are functional with Redis-safe degradation
- Live probes against real domains are available and required for acceptance
- Remaining work is mainly persistence depth, alerting quality, and analytics polish

## Prioritized Roadmap

## 1. Reliability (High)

- Enforce end-to-end time budgets on long chains
- Ensure partial-result behavior on downstream timeouts
- Improve open-handle cleanup in tests and workers

## 2. Data Model and History (High)

- Harden `monitoring_tasks` and `price_history` persistence flows
- Validate retention/indexing for trend queries
- Add explicit health fields for task run status

## 3. Alerting and Notifications (Medium)

- Standardize threshold semantics (absolute vs percentage)
- Improve dedupe/batching for noisy changes
- Track delivery outcomes and retries

## 4. Analytics and Reporting (Medium)

- Trend summaries and volatility metrics
- Competitor movement snapshots
- Export/report consistency checks

## 5. UX and Operations (Medium)

- Better operator controls for frequency/cost profile
- Add standard probe presets in maintenance scripts
- Surface runtime transport caveat (TCP, not HTTP) in UI/dev docs

## Definition of Done per Milestone

- Typecheck/build pass
- Relevant tests pass
- Real-domain probe evidence captured
- AGENTS session note appended with outcomes and follow-up
