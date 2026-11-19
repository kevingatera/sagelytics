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
# Nest uses TCP transport, so check that the port accepts connections.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "const h=process.env.MICROSERVICE_HOST;const host=!h||h==='0.0.0.0'||h==='::'?'localhost':h;require('node:net').connect(Number(process.env.MICROSERVICE_PORT||3001),host).on('connect',function(){this.end();process.exit(0)}).on('error',()=>process.exit(1))"
CMD ["node", "dist/src/microservices/src/main.js"]
