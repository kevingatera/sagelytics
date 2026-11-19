FROM node:22-slim AS base
WORKDIR /repo/src/microservices
RUN corepack enable && corepack prepare pnpm@9.11.0 --activate
COPY src/microservices/package.json src/microservices/pnpm-lock.yaml ./

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY packages/types/src /repo/packages/types/src
COPY src/microservices ./
RUN pnpm build

FROM base AS deps
RUN pnpm install --prod --frozen-lockfile

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    MICROSERVICE_HOST=0.0.0.0 \
    MICROSERVICE_PORT=3001
COPY --from=deps /repo/src/microservices/node_modules ./node_modules
COPY --from=build /repo/src/microservices/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/src/microservices/src/main.js"]
