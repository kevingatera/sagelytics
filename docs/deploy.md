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
- **Microservice** needs `SPIDER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, and `VALUESERP_API_KEY` to pass configuration validation. Perplexity is optional. Configure model-provider keys for the features you use. Set `REDIS_URL` and the matching `REDIS_HOST` and `REDIS_PORT` since different Redis clients read different settings. If your instance requires them, also set `REDIS_USERNAME`, `REDIS_PASSWORD`, and `REDIS_TLS`.

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

Back up an existing database before its first migrate. Migration 0001 strips per-user analysis from shared competitor rows and copies it to `sg_archive.sg_competitor_analysis_pre_split`, not to any user, because the old schema never recorded who wrote it. Users see matches again after their next discovery.

To change the schema, edit `src/server/db/schema.ts`, run `pnpm db:generate`, review the SQL, and commit it with the snapshot. `scripts/maintenance/verify-migrations.sh` checks the history against disposable databases on the server in `DATABASE_URL`: fresh, built from `origin/main`'s schema with seeded rows, and built with `db:push`. It also checks that a second migrate is a no-op, that `drizzle-kit push` then finds no changes, and that `drizzle-kit generate` finds no schema changes. Set `MIGRATE_IMAGE=sagelytics-migrate` to run the `main` upgrade through the image.

## Fly.io

Staging uses `deploy/fly/web.toml` for public HTTPS on port 3000 and `deploy/fly/svc.toml` for the private Nest TCP service. Both configs validate with `fly config validate --config <path>`. Use one 512 MB machine per app in Toronto. Fly Proxy stops the idle web machine and starts it on demand. Keep the Nest machine running for the monitoring worker.

For a fresh setup in the `personal` organization, these commands created a healthy single-node PostgreSQL cluster and attached both apps to the same database. Fly writes the app connections to `DATABASE_URL` and includes credentials in the command output. Keep the output private. Skip creation and attachment for resources that already exist.

```sh
fly apps create sagelytics-web --org personal
fly apps create sagelytics-svc --org personal
fly postgres create --name sagelytics-pg --org personal --region yyz \
  --initial-cluster-size 1 --vm-size shared-cpu-1x --vm-memory 256 --volume-size 1 >/dev/null
fly postgres attach sagelytics-pg -a sagelytics-web --database-name sagelytics --yes >/dev/null
fly postgres attach sagelytics-pg -a sagelytics-svc --database-name sagelytics --yes >/dev/null
```

The Fly trial allowed those steps and returned HTTP 422 when creating a release for an updated Postgres secret. Set up billing before resuming. If the admin password has already been rotated in PostgreSQL and the corresponding secret is staged, apply it with `fly secrets deploy -a sagelytics-pg`. The web and Nest deployments, schema push, Redis connection, and sign-in flows still need live verification.

1. Create Upstash Redis with `fly redis create --name sagelytics-redis --org personal --region yyz --plan Pay-as-you-go --disable-eviction --no-replicas`. Run it interactively, decline ProdPack, and keep the connection output private. The plan name is case-sensitive in flyctl v0.5.13. Use `iad` if Upstash is unavailable in Toronto.
2. Stage runtime secrets with `fly secrets import --stage -a <app>` from a private source. Follow [Configure](#configure). Set `MICROSERVICE_HOST=sagelytics-svc.internal` on web and `MICROSERVICE_HOST=fly-local-6pn` on Nest, with port `3001` on both. Set `DISCOVERY_PIPELINE=legacy` on Nest. Use the provided Redis URL scheme and credentials to configure Redis. The Nest Redis transport options currently use only the host and port. Remove the provider base URLs from Nest startup logs before deploying with confidential `OPENAI_BASE_URL` or `OPENROUTER_BASE_URL` values.
3. For a disposable staging database, open `fly proxy 15432:5432 sagelytics-pg.internal -a sagelytics-pg` and run `SKIP_ENV_VALIDATION=1 pnpm db:push` with `DATABASE_URL` supplied in the environment. Use an attached role's private URL with its host and port changed to `127.0.0.1:15432`.
4. Deploy both images from the repository root. Use `--ha=false` to set up a single machine per app.

```sh
fly deploy --config deploy/fly/svc.toml --dockerfile src/microservices/Dockerfile --remote-only --ha=false
fly deploy --config deploy/fly/web.toml --dockerfile Dockerfile --remote-only --ha=false
fly status -a sagelytics-svc
fly status -a sagelytics-web
curl -fsS https://sagelytics-web.fly.dev/api/health
```

Check that `fly-local-6pn` resolves inside the Nest machine and that the web machine can reach `sagelytics-svc.internal:3001`. The read-only Nest message `get_user_monitoring_tasks` can also verify the database connection without calling discovery providers. Google OAuth requires registering `https://sagelytics-web.fly.dev/api/auth/callback/google` with Google. [Fly private networking](https://docs.fly.io/networking/private-networking/)

## Homelab staging

Run the staging stack on `omv-108` as the `sagelytics-staging` Compose project. Its [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) gives the web app a temporary public HTTPS URL with open registration. Use test accounts and data. Google sign-in requires registering the current callback URL with Google.

### Install and configure

Run these commands from the checkout containing `deploy/homelab`. Keep the deployment files in `/srv/ssd-apps/sagelytics-staging` and the app checkout in its `src` subdirectory. Docker Compose 2.24.4 or newer supports the override's reset tags.

```bash
ssh omv-108 '
  set -eu
  umask 077
  mkdir -p /srv/ssd-apps/sagelytics-staging
  (umask 022; gh repo clone kevingatera/sagelytics /srv/ssd-apps/sagelytics-staging/src -- -b feat/two-stage-discovery-finish)
'
scp deploy/homelab/{compose.override.yml,compose.sh,refresh-url.sh} \
  omv-108:/srv/ssd-apps/sagelytics-staging/
```

With an unlocked Bitwarden CLI, set `SAGELYTICS_SMTP_ITEM_ID` to the staging mailbox password item ID. Pass the complete output of `prepare-env.sh` directly to SSH. The helper generates fresh auth, PostgreSQL, and Redis secrets, copies the Google and free-tier LLM settings from the local checkout, and reads SMTP and CLIProxy credentials from their local sources.

```bash
if staging_env=$(deploy/homelab/prepare-env.sh /root/sources/sagelytics \
  /tmp/opencode/sg-cliproxy-key "$SAGELYTICS_SMTP_ITEM_ID"); then
  printf '%s\n' "$staging_env" | ssh omv-108 '
    set -eu
    cd /srv/ssd-apps/sagelytics-staging
    umask 077
    set -C
    cat > .env.staging
  '
fi
unset staging_env
```

The override gives web and Nest the Purelymail settings. Nest uses CLIProxy for OpenAI and OpenRouter, with `gpt-6-luna` for filtering and escalation. Use only free-tier Groq and Gemini credentials. Spider and ValueSERP use `disabled-on-staging`, so account failures can leave discovery with fewer or zero results. Perplexity is unset and discovery uses the default pipeline.

### Start and verify

On `omv-108`, build the app images and start the stack.

```sh
cd /srv/ssd-apps/sagelytics-staging
./compose.sh config --quiet
./compose.sh build web microservice migrate
./compose.sh up -d --wait --wait-timeout 120 web
curl -fsS http://127.0.0.1:3110/api/health
./compose.sh up -d tunnel
./refresh-url.sh
./compose.sh ps -a
```

Web, Nest, PostgreSQL, and Redis should be healthy. The migration should exit with status 0 and the tunnel should be running. Web, PostgreSQL, and Redis bind to loopback at ports 3110, 5442, and 6392. Nest listens on TCP port 3001 inside the Compose network.

From another machine, visit the printed HTTPS URL and check `/api/health` for HTTP 200. Register a test user, open `/dashboard`, sign out, and sign back in. Use the password reset form and check the web logs for the send outcome. For users with incomplete onboarding, open `/dashboard` directly to avoid triggering discovery.

```sh
./compose.sh logs microservice | grep 'Microservice is listening'
./compose.sh exec -T web node -e "require('node:net').connect(3001, 'microservice').on('connect', function () { console.log('Nest TCP connected'); this.end() }).on('error', () => process.exit(1))"
./compose.sh restart web microservice
curl -fsS --retry 10 --retry-connrefused http://127.0.0.1:3110/api/health
```

To run the Playwright suite against staging from another machine, forward the staging database (the e2e helpers write verification tokens into it) and point the suite at the public URL. Set `E2E_SMTP_CONFIGURED=1`, because staging sends email. Each run leaves `e2e-*@example.test` users behind.

```sh
ssh -N -L 15442:127.0.0.1:5442 omv-108 &
DATABASE_URL=postgresql://sagelytics:<password>@127.0.0.1:15442/sagelytics \
  PLAYWRIGHT_BASE_URL=https://<tunnel-host> E2E_SMTP_CONFIGURED=1 npx playwright test
```

### Refresh the URL or stop staging

If the tunnel restarts, run `./refresh-url.sh` from the staging directory. It reads the current tunnel process's URL, updates `AUTH_URL` and `NEXTAUTH_URL` in the mode-600 env file, and applies the values to web. Use the new URL for browser sessions and reset links.

Run `./compose.sh down` from the staging directory to stop staging and keep its data volumes. To discard the staging database and Redis data as well, use `./compose.sh down --volumes`. The env file and checkout stay on disk.
