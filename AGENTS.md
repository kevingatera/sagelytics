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
