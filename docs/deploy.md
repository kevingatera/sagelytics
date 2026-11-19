# Deploy Sagelytics

Run the Next.js image on port 3000 and the NestJS image as a private TCP service on port 3001. Both containers run as the `node` user and log to stdout. Both need PostgreSQL, and the microservice also needs Redis.

## Build

Run both builds from the repository root. The Nest build needs `packages/types/src` to resolve `@shared/types` and emits the entry point at `dist/src/microservices/src/main.js`.

```sh
docker build -t sagelytics-app .
docker build -f src/microservices/Dockerfile -t sagelytics-microservice .
docker build --target migrate -t sagelytics-migrate .
```

Next.js skips environment validation during the image build. Supply real configuration at runtime through your host's secret store. Keep the Nest TCP port private and route public HTTP traffic to the Next.js app. Use `GET /api/health` to check PostgreSQL reachability. It returns 200 when PostgreSQL responds and 503 on failure. Use a TCP probe for Nest.

## Configure

- **Both services** need `DATABASE_URL`. The app uses `MICROSERVICE_HOST` as the service address. Nest uses the same variable as its bind address. Set the same `MICROSERVICE_PORT` on both.
- **App** needs `AUTH_SECRET`, `AUTH_GOOGLE_CLIENT_ID`, and `AUTH_GOOGLE_CLIENT_SECRET`. Set both `AUTH_URL` and `NEXTAUTH_URL` to the public origin and register `<origin>/api/auth/callback/google` with Google. `REDIS_URL` and SMTP settings are optional.
- **Microservice** needs `SPIDER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, and `VALUESERP_API_KEY` to pass configuration validation. Nest also requires `PERPLEXITY_API_KEY` at startup because the Perplexity service reads it during construction. Configure optional model-provider keys for the features you use. Set `REDIS_URL` and the matching `REDIS_HOST` and `REDIS_PORT` since different Redis clients read different settings. If your instance requires them, also set `REDIS_USERNAME`, `REDIS_PASSWORD`, and `REDIS_TLS`.

## Run with Compose

Save the following smoke-test settings in the gitignored `.env.docker.local` at the repository root. For a real installation, use a private password and credential values. Update `DATABASE_URL` to match the Postgres password, URL-encoding the password in the URL if needed.

```dotenv
APP_HOST_PORT=3300
POSTGRES_PASSWORD=local-placeholder
DATABASE_URL=postgresql://sagelytics:local-placeholder@postgres:5432/sagelytics
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
AUTH_SECRET=local-placeholder
AUTH_GOOGLE_CLIENT_ID=local-placeholder
AUTH_GOOGLE_CLIENT_SECRET=local-placeholder
AUTH_URL=http://127.0.0.1:3300
NEXTAUTH_URL=http://127.0.0.1:3300
SPIDER_API_KEY=local-placeholder
GROQ_API_KEY=local-placeholder
GEMINI_API_KEY=local-placeholder
VALUESERP_API_KEY=local-placeholder
PERPLEXITY_API_KEY=local-placeholder
```

```sh
docker compose --env-file .env.docker.local up -d --build --wait
curl -fsS http://127.0.0.1:3300/api/health
```

Open `http://127.0.0.1:3300/login`. The placeholder credentials support startup and page loading. Google sign-in and provider-backed features require live credentials. Compose publishes only the app on loopback and keeps Nest, PostgreSQL, and Redis on its network. Use `docker compose --env-file .env.docker.local down` to stop it and keep the named data volumes.

## Apply the database schema

The `migrate` image runs `drizzle-kit migrate` with the tracked history in `drizzle/`. It never prompts. Compose runs it once after PostgreSQL becomes healthy, and the app and microservice start only after it succeeds. Keep `pnpm db:push` for local development and throwaway test databases.

To run it on another host, use a network that can reach PostgreSQL and an env file with a reachable `DATABASE_URL` and the required app variables in [Configure](#configure). Use the migration role if you use separate database roles.

```sh
docker run --rm --env-file /path/to/migration.env sagelytics-migrate
```

The same history serves fresh databases and databases created from `main` with `db:push`:

- `0000_baseline_main` is `main`'s schema, written with `IF NOT EXISTS`, so it is a no-op on an existing install.
- `0001_user_competitor_analysis` creates the per-user analysis table. It copies the analysis stored on a shared competitor into a private row only when exactly one user is linked to that competitor. When two or more users are linked, the analysis cannot be attributed, so no private row is written and those users see no matches until discovery runs again. A notice reports both counts. It then strips the analysis fields (`matchScore`, `matchReasons`, `suggestedApproach`, `dataGaps`, and each product's `matchedProducts`) from every shared competitor row.
- `0002_billing` and `0003_monitoring_and_products` create the billing, monitoring, product, and notification tables.
- `0004_retire_post` removes `sg_post`, the starter template's example table. An empty table is dropped. A table with rows moves to `sg_archive.sg_post`, outside Drizzle's managed tables, and loses its user foreign key. Once its rows are no longer needed, drop it with `DROP TABLE sg_archive.sg_post;`.

Back up an existing database before its first migrate. The backfill and metadata cleanup cannot be undone.

To change the schema, edit `src/server/db/schema.ts`, run `pnpm db:generate`, review the SQL, and commit it with the snapshot. `scripts/maintenance/verify-migrations.sh` checks the history against disposable databases on the server in `DATABASE_URL`: fresh, built from `origin/main`'s schema with seeded rows, and built with `db:push`. It also checks that a second migrate is a no-op, that `drizzle-kit push` then finds no changes, and that `drizzle-kit generate` finds no schema changes. Set `MIGRATE_IMAGE=sagelytics-migrate` to run the `main` upgrade through the image.

## Fly.io

- Use two Fly apps on the same private network, one per image. Give only the web app a public HTTP service on internal port 3000 and configure its check at `/api/health`. Keep a Nest Machine running and set its bind host to `fly-local-6pn`. Set the web app's `MICROSERVICE_HOST` to `<nest-app>.internal` and `MICROSERVICE_PORT` to `3001`. [Fly private networking](https://docs.fly.io/networking/private-networking/)
- One Fly app with separate process groups would require a combined image that contains both programs. Expose HTTP only for the web process group and use `<nest-group>.process.<app>.internal` for the Nest address. [Fly process groups](https://docs.fly.io/launch/processes)
- Fly Managed Postgres or another reachable managed PostgreSQL instance can supply `DATABASE_URL` to both apps. Run the schema job from a machine with database access before starting the services. For Redis, consider Fly's Upstash integration or another managed Redis service. Test authentication and TLS with the existing Redis clients before launch. The Nest Redis transport options currently use only the host and port. [Managed Postgres](https://fly.io/docs/mpg/), [Redis on Fly](https://fly.io/redis/)
- Fly deployment, managed PostgreSQL and Redis connections, Google OAuth, and paid provider calls have not been tested with these images.
