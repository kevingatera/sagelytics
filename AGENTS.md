# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router pages and API routes (`src/app/api/*`).
- `src/components`: UI and feature components (dashboard, competitors, monitoring, settings, shared `ui/`).
- `src/server`: tRPC routers, auth, and Drizzle DB schema/queries.
- `src/microservices`: NestJS competitor/discovery services, workers, and integration tests.
- `packages/types`: shared types package used across app and microservices.
- `public/`: static assets (for example `public/img/placeholder-logo.svg`).

## Build, Test, and Development Commands
- `pnpm dev`: run Next.js dev server with log capture (`logs/next`).
- `pnpm build`: production Next.js build.
- `pnpm typecheck`: TypeScript checks (no emit).
- `pnpm lint`: Next.js/ESLint checks.
- `pnpm check`: combined lint + typecheck.
- `cd src/microservices && pnpm start:dev`: run NestJS microservice with logs.
- `cd src/microservices && pnpm build`: build microservices.
- `cd src/microservices && pnpm test -- --runInBand --forceExit`: run microservice Jest suites.
- `drizzle/`: additive migrations for databases built with `db:push`. Review the SQL, then run `pnpm db:migrate` only against a database that already has the base tables.

## Coding Style & Naming Conventions
- Language: TypeScript for app and services.
- Formatting: Prettier (`pnpm format:check`, `pnpm format:write`).
- Linting: ESLint (`pnpm lint`, `pnpm lint:microservices`).
- Naming: React components `PascalCase`, functions/variables `camelCase`, route folders and utility files `kebab-case` or existing local style.
- Prefer small, typed modules and avoid `as unknown as` casts unless unavoidable.

## Testing Guidelines
- Framework: Jest in `src/microservices` (`*.spec.ts`).
- Integration tests live under `src/microservices/src/test/integration`.
- Optional live API validation: `pnpm test:perplexity` (requires valid API keys).
- No enforced coverage threshold currently; prioritize behavior-critical paths and regression tests.

## Commit & Pull Request Guidelines
- Use conventional prefixes reflected in history: `feat:`, `fix:`, `refactor:`, `chore:`.
- Keep commits scoped and verifiable; include only related files.
- Before PR: run `pnpm typecheck`, `pnpm lint`, `pnpm build`, and relevant microservice tests.
- PRs should include: problem summary, change scope, test evidence, and screenshots for UI-impacting changes.

## Security & Configuration Tips
- Never commit `.env` files or secrets.
- Required service keys are validated in microservices env handling; confirm DB/Redis/API keys before running integration paths.

## User Preferences (Living)
- Prefer real probes over mocked confidence for critical flows (especially competitor discovery).
- Optimize for cost and practical benefit, not just feature volume.
- Keep uncommitted work safe: do not discard anything without explicit approval and clear rationale.
- Commit tested milestones incrementally.
- Keep logging wrappers and startup script wrappers intact unless explicitly changed by request.

## Lessons Learned (Living)
- `discover_competitors` can fail hard when Redis auth is wrong (`WRONGPASS`), so Redis-backed progress/cache paths must degrade gracefully.
- Existing integration tests for competitor discovery are heavily mocked; passing tests do not prove live behavior.
- Runtime verification should include end-to-end calls against actual domains (for example `lebambougorillalodge.com`) plus log review.
- Expensive paths are primarily LLM/SERP-heavy discovery and enrichment loops; cap candidate volume and reuse cache when safe.

## Agent Memory Update Protocol
- Treat this file as active memory, not static docs.
- After each milestone, append an entry under `## Session Notes` with:
- `What changed`
- `What broke / risk found`
- `User preference learned`
- `Follow-up actions`
- Keep entries short (3-6 lines each) and factual.
- Never delete prior notes; mark outdated items as superseded.
- Do not add dates unless explicitly requested.

## Session Notes
- Entry:
- What changed: Added logging wrappers, reorganized WIP docs/scripts, and stabilized contributor guide.
- What broke / risk found: Live competitor probe failed due to Redis auth mismatch causing discovery failure.
- User preference learned: Validate with real probes, preserve uncommitted work, and prioritize cost-effective fixes.
- Follow-up actions: Harden Redis failure handling, complete live discovery verification, then continue broken-feature sweep.
- Entry:
- What changed: Hardened Redis clients and confirmed Redis container health; added safer competitor discovery prefiltering and redacted ValueSERP API key logging.
- What broke / risk found: Live probe no longer fails with Redis WRONGPASS; current hard blocker is Perplexity API 401 and recurring LLM timeouts in website discovery.
- User preference learned: Session notes should not use dates; keep memory entries concise and ongoing.
- Follow-up actions: Provide valid Perplexity credentials, then rerun full live probe and continue broken-feature sweep.
- Entry:
- What changed: Perplexity live calls are unblocked; competitor JSON parsing is now tolerant of mixed text/JSON responses; website discovery now falls back to deterministic offering extraction when LLM calls time out.
- What broke / risk found: Full live discovery can still exceed 180s for some payloads; there is remaining tail latency in competitor enrichment.
- User preference learned: Keep real-domain probes as acceptance criteria and ship tested milestones incrementally.
- Follow-up actions: Add strict end-to-end timeout/partial-result return in discovery flow, then reduce enrichment fan-out to cut cost and latency.
- Entry:
- What changed: Added per-step competitor research timeouts, capped known-competitor enrichment volume, disabled match-enhancement LLM calls by default, and added validated env controls for these knobs.
- What broke / risk found: HTTP probing against port 3001 is invalid because the microservice uses TCP transport; probes must run via microservice client/app API.
- User preference learned: Probe with real domains and optimize for practical latency/cost over maximal enrichment depth.
- Follow-up actions: Add a dedicated probe script under `scripts/maintenance/` and optionally expose timeout/cost controls in onboarding settings UI.
- Entry:
- What changed: Added `scripts/maintenance/probe-discovery.sh` and a `pnpm maintenance:probe-discovery` alias for repeatable TCP live probes.
- What broke / risk found: Script initially hung after success because timeout timers were not cleared; fixed by clearing timeout handles on both success and error paths.
- User preference learned: Keep maintenance tooling practical and directly runnable for real verification, not ad-hoc command snippets.
- Follow-up actions: Add optional presets for common probe targets and write probe output to `logs/` for comparison across runs.
- Entry:
- What changed: Consolidated and reorganized documentation into `docs/` domains (architecture, monitoring, prompts, research, strategy) and moved outdated/redundant material into `docs/archive/`.
- What broke / risk found: Root and service docs had drifted from runtime reality (especially TCP microservice transport vs HTTP assumptions), which could mislead debugging and operations.
- User preference learned: Keep docs streamlined, current, and consolidated; avoid duplicate sources of truth.
- Follow-up actions: Add lightweight docs lint/checklist in CI and periodically prune/archive stale drafts.
- Entry:
- What changed: Competitor analysis is per user (`sg_user_competitor_analysis`, migration `0001_user_competitor_analysis`). `competitors.metadata` holds public facts only. One listed-price parser (`shared/utils/price-parser.ts`) serves the competitor services. The price monitoring worker runs persisted tasks from the real DB service.
- What broke / risk found: Whichever user analyzed a domain last overwrote the shared row. The price regex read quantities, years and "24/7" as prices. The monitoring worker had no DB client, so scheduled runs did nothing.
- User preference learned: Check migrations against a real Postgres before merging; keep per-user data out of shared rows.
- Follow-up actions: Backfilled per-user rows copy the last writer's analysis, so linked users should re-run analysis. Price regexes in `website-discovery.service.ts` and `agent-tools.service.ts` still use the old pattern.
- Entry:
- What changed: PR #4 now merges the security/API, discovery-pipeline and data-model fix branches; the only textual conflict was in `competitor-discovery.service.ts`, resolved by keeping the pipeline rewrite and re-applying the shared price parser.
- What broke / risk found: Nothing broke; the merge needed a placeholder `.env` (gitignored) for lint and build, since env validation runs at config load.
- User preference learned: Merge integration should re-run the full gate set on the committed tree, not just on the working tree.
- Follow-up actions: Watch the PR after merge; remaining known gaps are the price regexes noted above and the backfill caveat.
- Entry:
- What changed: Added a Playwright route capture script and desktop and mobile screenshots.
- What broke / risk found: T3 preview could not launch Chrome as root; capture used Playwright. Request logs include aborted prefetches.
- User preference learned: Preserve each tested phase with a commit and push.
- Follow-up actions: Review captures and interactions, then add regression specs and CI.
- Entry:
- What changed: Deployed the PR #4 head on omv-108 with project-scoped Compose and a Quick Tunnel. Added the deployment procedure and URL refresh helper.
- What broke / risk found: A restrictive clone umask made the migration config unreadable in the container. Keep checkout files readable and restrict only the staging directory and env file.
- User preference learned: Verify public staging with real auth and SMTP checks while avoiding paid discovery calls.
- Follow-up actions: Refresh the auth URLs after tunnel restarts. Google OAuth needs the current callback URL registered.
