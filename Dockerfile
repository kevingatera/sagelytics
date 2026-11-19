FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Only what drizzle-kit push loads (config, schema, env), pinned to the lockfile's versions.
FROM base AS migrate
RUN npm install --no-save --no-audit --no-fund --omit=dev \
      drizzle-kit@0.24.2 drizzle-orm@0.33.0 postgres@3.4.5 \
      @t3-oss/env-nextjs@0.10.1 zod@3.24.2 \
    && npm cache clean --force
COPY drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY src/env.js ./src/
COPY src/server/db/schema.ts src/server/db/competitor-analysis.ts ./src/server/db/
USER node
CMD ["./node_modules/.bin/drizzle-kit", "push"]

FROM deps AS build
COPY . .
RUN SKIP_ENV_VALIDATION=1 NEXT_TELEMETRY_DISABLED=1 pnpm build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
