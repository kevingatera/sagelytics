-e 

# .env.example
```
# Since the ".env" file is gitignored, you can use the ".env.example" file to
# build a new ".env" file when you clone the repo. Keep this file up-to-date
# when you add new variables to `.env`.

# This file will be committed to version control, so make sure not to have any
# secrets in it. If you are cloning this repo, create a copy of this file named
# ".env" and populate it with your secrets.

# When adding additional environment variables, the schema in "/src/env.js"
# should be updated accordingly.

# Next Auth
# You can generate a new secret on the command line with:
# npx auth secret
# https://next-auth.js.org/configuration/options#secret
AUTH_SECRET=""

# Next Auth Discord Provider
AUTH_DISCORD_ID=""
AUTH_DISCORD_SECRET=""

# Drizzle
DATABASE_URL="postgresql://postgres:password@localhost:5432/sagelytics"

# Microservices
MICROSERVICE_HOST="localhost"
MICROSERVICE_PORT="3001"
-e 
```
-e 

# .eslintignore
```
# Build directories
.next/
dist/
build/
node_modules/
src/microservices/dist/

# Generated files
pnpm-lock.yaml
next-env.d.ts

# Config files
*.config.js
*.config.mjs
*.config.ts -e 
```
-e 

# .eslintrc.cjs
```
/** @type {import("eslint").Linter.Config} */
const config = {
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": true
  },
  "plugins": [
    "@typescript-eslint",
    "drizzle"
  ],
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked"
  ],
  "rules": {
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    // "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        "prefer": "type-imports",
        "fixStyle": "inline-type-imports"
      }
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        "checksVoidReturn": {
          "attributes": false
        }
      }
    ],
    "drizzle/enforce-delete-with-where": [
      "error",
      {
        "drizzleObjectName": [
          "db",
          "ctx.db"
        ]
      }
    ],
    "drizzle/enforce-update-with-where": [
      "error",
      {
        "drizzleObjectName": [
          "db",
          "ctx.db"
        ]
      }
    ]
  },
  "ignorePatterns": [
    "node_modules/",
    ".next/",
    "src/microservices/dist/",
    "dist/",
    "src/microservices/"
  ]
}
module.exports = config;-e 
```
-e 

# .gitignore
```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
**/node_modules
/.pnp
.pnp.js

# testing
**/coverage

# database
/prisma/db.sqlite
/prisma/db.sqlite-journal
db.sqlite

# next.js
/.next/
/out/
next-env.d.ts

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# local env files
# do not commit any .env files to git, except for the .env.example file. https://create.t3.gg/en/usage/env-variables#using-environment-variables
.env
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo

# idea files
.idea

*.cursor*
backup/**

business_blueprint.md
.vscode/settings.json
-e 
```
-e 

# .prettierignore
```
# Build and distribution files
.next/
dist/
build/
node_modules/
src/microservices/dist/

# Cache
.cache/
.eslintcache

# Generated files
pnpm-lock.yaml
package-lock.json
yarn.lock

# Misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local -e 
```
-e 

# .vscode/launch.json
```
{
  // Use IntelliSense to learn about possible attributes.
  // Hover to view descriptions of existing attributes.
  // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node-terminal",
      "name": "Run Script: dev",
      "request": "launch",
      "preLaunchTask": "Ensure sagelytics-postgres running",
      "command": "pnpm run dev",
      "cwd": "${workspaceFolder}"
    },
    {
      "type": "node-terminal",
      "request": "launch",
      "name": "NestJS debug",
      "command": "pnpm run start:debug",
      "cwd": "${workspaceFolder}/src/microservices"
    }
  ]
}-e 
```
-e 

# .vscode/tasks.json
```
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Ensure sagelytics-postgres running",
      "type": "shell",
      "command": "docker container inspect sagelytics-postgres >/dev/null 2>&1 && docker restart sagelytics-postgres || ./start-database.sh",
      "problemMatcher": []
    }
  ]
} -e 
```
-e 

# README.md
```
# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

Start up a database, if needed using `./start-database.sh`

Run `pnpm db:push` to push the schema to the database.

npm install react-chartjs-2 chart.js lucide-react next-themes

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) â€” Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) â€” your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
-e 
```
-e 

# artchitecture.md
```

```mermaid
graph TB
    subgraph Frontend
        LP[Landing Page]
        OB[Onboarding]
        DB[Dashboard]
        subgraph Components
            PC[Price Comparison]
            AI[AI Insights]
            PS[Pricing Strategy]
            SO[Sales Overview]
        end
    end

    subgraph Backend
        TR[tRPC Router]
        subgraph Services
            MA[Model Manager]
            MS[Metrics Service]
            WD[Website Discovery]
            CA[Competitor Analysis]
            CD[Competitor Discovery]
        end
        
        subgraph Database
            DZ[Drizzle ORM]
            PG[(PostgreSQL)]
        end
    end

    subgraph External
        LLM[LLM Models]
        SP[Spider Service]
        VS[ValueSERP API]
    end

    %% Frontend connections
    LP --> OB
    OB --> DB
    DB --> Components
    Components --> TR

    %% Backend connections
    TR --> Services
    Services --> DZ
    DZ --> PG
    
    %% External service connections
    MA --> LLM
    WD --> SP
    CD --> VS
    CD --> LLM

    %% Service interactions
    CA --> MA
    CD --> CA
    CD --> WD

    classDef primary fill:#2563eb,stroke:#1d4ed8,color:#fff
    classDef secondary fill:#4b5563,stroke:#374151,color:#fff
    classDef external fill:#059669,stroke:#047857,color:#fff
    classDef database fill:#7c3aed,stroke:#6d28d9,color:#fff

    class LP,OB,DB primary
    class TR,Services secondary
    class LLM,SP,VS external
    class DZ,PG database
```
-e 
```
-e 

# components.json
```
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "~/components",
    "utils": "~/lib/utils",
    "ui": "~/components/ui",
    "lib": "~/lib",
    "hooks": "~/hooks"
  },
  "iconLibrary": "lucide"
}-e 
```
-e 

# drizzle.config.ts
```
import { type Config } from 'drizzle-kit';

import { env } from '~/env';

export default {
  schema: './src/server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: ['sagelytics_*'],
} satisfies Config;
-e 
```
-e 

# fix-nullish-coalescing.sh
```
#!/bin/bash
-e 
```
-e 

# next.config.js
```
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import './src/env.js';

/** @type {import("next").NextConfig} */
const config = {};

export default config;
-e 
```
-e 

# package.json
```
{
  "name": "sagelytics",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "next build",
    "check": "next lint && tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "dev": "next dev --turbo",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,mdx}\" --cache",
    "format:write": "prettier --write \"**/*.{ts,tsx,js,jsx,mdx}\" --cache",
    "format:microservices": "prettier --write \"src/microservices/src/**/*.{ts,js}\" --config prettier.config.js",
    "format:all": "pnpm format:write && pnpm format:microservices",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "lint:microservices": "cd src/microservices && pnpm lint",
    "lint:all": "pnpm lint:fix && pnpm lint:microservices",
    "preview": "next build && next start",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@auth/drizzle-adapter": "^1.7.2",
    "@grpc/grpc-js": "^1.12.6",
    "@grpc/proto-loader": "^0.7.13",
    "@hookform/resolvers": "^3.10.0",
    "@langchain/groq": "^0.1.3",
    "@nestjs/core": "^11.0.1",
    "@nestjs/microservices": "^11.0.9",
    "@nestjs/platform-express": "^11.0.9",
    "@nestjs/platform-socket.io": "^11.0.9",
    "@nestjs/websockets": "^11.0.1",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@t3-oss/env-nextjs": "^0.10.1",
    "@tanstack/react-query": "^5.50.0",
    "@trpc/client": "^11.0.0-rc.446",
    "@trpc/react-query": "^11.0.0-rc.446",
    "@trpc/server": "^11.0.0-rc.446",
    "@upstash/ratelimit": "^2.0.5",
    "@upstash/redis": "^1.34.4",
    "amqp-connection-manager": "^4.1.14",
    "chart.js": "^4.3.0",
    "chartjs-plugin-annotation": "^3.1.0",
    "cheerio": "^1.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "drizzle-orm": "^0.33.0",
    "express": "^5.0.1",
    "geist": "^1.3.1",
    "ioredis": "^5.5.0",
    "kafkajs": "^2.2.4",
    "langchain": "^0.3.15",
    "lucide-react": "^0.244.0",
    "mqtt": "^5.10.3",
    "nats": "^2.29.1",
    "next": "^15.0.1",
    "next-auth": "5.0.0-beta.25",
    "next-themes": "^0.2.1",
    "postgres": "^3.4.4",
    "react": "^18.3.1",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.2",
    "rxjs": "^7.8.1",
    "server-only": "^0.0.1",
    "sonner": "^1.7.4",
    "superjson": "^2.2.1",
    "tailwind-merge": "^3.0.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/cheerio": "^0.22.35",
    "@types/eslint": "^8.56.10",
    "@types/node": "^20.14.10",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.1.0",
    "@typescript-eslint/parser": "^8.1.0",
    "autoprefixer": "^10.4.14",
    "drizzle-kit": "^0.24.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.0.1",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-drizzle": "^0.2.3",
    "eslint-plugin-prettier": "^5.2.3",
    "postcss": "^8.4.39",
    "prettier": "^3.3.2",
    "prettier-eslint": "^16.3.0",
    "prettier-plugin-tailwindcss": "^0.6.11",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.5.3"
  },
  "ct3aMetadata": {
    "initVersion": "7.38.1"
  },
  "packageManager": "pnpm@9.11.0"
}
-e 
```
-e 

# pnpm-lock.yaml
```
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      '@auth/drizzle-adapter':
        specifier: ^1.7.2
        version: 1.7.4
      '@grpc/grpc-js':
        specifier: ^1.12.6
        version: 1.12.6
      '@grpc/proto-loader':
        specifier: ^0.7.13
        version: 0.7.13
      '@hookform/resolvers':
        specifier: ^3.10.0
        version: 3.10.0(react-hook-form@7.54.2(react@18.3.1))
      '@langchain/groq':
        specifier: ^0.1.3
        version: 0.1.3(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))
      '@nestjs/core':
        specifier: ^11.0.1
        version: 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/microservices':
        specifier: ^11.0.9
        version: 11.0.9(@grpc/grpc-js@1.12.6)(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/websockets@11.0.9)(amqp-connection-manager@4.1.14(amqplib@0.10.5))(amqplib@0.10.5)(ioredis@5.5.0)(kafkajs@2.2.4)(mqtt@5.10.3)(nats@2.29.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/platform-express':
        specifier: ^11.0.9
        version: 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)
      '@nestjs/platform-socket.io':
        specifier: ^11.0.9
        version: 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/websockets@11.0.9)(rxjs@7.8.1)
      '@nestjs/websockets':
        specifier: ^11.0.1
        version: 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/platform-socket.io@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@radix-ui/react-label':
        specifier: ^2.1.1
        version: 2.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-progress':
        specifier: ^1.1.2
        version: 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-select':
        specifier: ^2.1.6
        version: 2.1.6(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-slot':
        specifier: ^1.1.2
        version: 1.1.2(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-switch':
        specifier: ^1.0.3
        version: 1.1.3(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-tabs':
        specifier: ^1.1.3
        version: 1.1.3(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-tooltip':
        specifier: ^1.1.8
        version: 1.1.8(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@t3-oss/env-nextjs':
        specifier: ^0.10.1
        version: 0.10.1(typescript@5.7.3)(zod@3.24.2)
      '@tanstack/react-query':
        specifier: ^5.50.0
        version: 5.66.0(react@18.3.1)
      '@trpc/client':
        specifier: ^11.0.0-rc.446
        version: 11.0.0-rc.764(@trpc/server@11.0.0-rc.764(typescript@5.7.3))(typescript@5.7.3)
      '@trpc/react-query':
        specifier: ^11.0.0-rc.446
        version: 11.0.0-rc.764(@tanstack/react-query@5.66.0(react@18.3.1))(@trpc/client@11.0.0-rc.764(@trpc/server@11.0.0-rc.764(typescript@5.7.3))(typescript@5.7.3))(@trpc/server@11.0.0-rc.764(typescript@5.7.3))(react-dom@18.3.1(react@18.3.1))(react@18.3.1)(typescript@5.7.3)
      '@trpc/server':
        specifier: ^11.0.0-rc.446
        version: 11.0.0-rc.764(typescript@5.7.3)
      '@upstash/ratelimit':
        specifier: ^2.0.5
        version: 2.0.5(@upstash/redis@1.34.4)
      '@upstash/redis':
        specifier: ^1.34.4
        version: 1.34.4
      amqp-connection-manager:
        specifier: ^4.1.14
        version: 4.1.14(amqplib@0.10.5)
      chart.js:
        specifier: ^4.3.0
        version: 4.4.7
      chartjs-plugin-annotation:
        specifier: ^3.1.0
        version: 3.1.0(chart.js@4.4.7)
      cheerio:
        specifier: ^1.0.0
        version: 1.0.0
      class-transformer:
        specifier: ^0.5.1
        version: 0.5.1
      class-validator:
        specifier: ^0.14.1
        version: 0.14.1
      class-variance-authority:
        specifier: ^0.7.1
        version: 0.7.1
      clsx:
        specifier: ^2.1.1
        version: 2.1.1
      drizzle-orm:
        specifier: ^0.33.0
        version: 0.33.0(@types/react@18.3.18)(postgres@3.4.5)(react@18.3.1)
      express:
        specifier: ^5.0.1
        version: 5.0.1
      geist:
        specifier: ^1.3.1
        version: 1.3.1(next@15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1))
      ioredis:
        specifier: ^5.5.0
        version: 5.5.0
      kafkajs:
        specifier: ^2.2.4
        version: 2.2.4
      langchain:
        specifier: ^0.3.15
        version: 0.3.15(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))(@langchain/google-genai@0.1.8(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))(zod@3.24.2))(@langchain/groq@0.1.3(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2))))(cheerio@1.0.0)(openai@4.84.0(zod@3.24.2))
      lucide-react:
        specifier: ^0.244.0
        version: 0.244.0(react@18.3.1)
      mqtt:
        specifier: ^5.10.3
        version: 5.10.3
      nats:
        specifier: ^2.29.1
        version: 2.29.1
      next:
        specifier: ^15.0.1
        version: 15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      next-auth:
        specifier: 5.0.0-beta.25
        version: 5.0.0-beta.25(next@15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1))(react@18.3.1)
      next-themes:
        specifier: ^0.2.1
        version: 0.2.1(next@15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1))(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      postgres:
        specifier: ^3.4.4
        version: 3.4.5
      react:
        specifier: ^18.3.1
        version: 18.3.1
      react-chartjs-2:
        specifier: ^5.2.0
        version: 5.3.0(chart.js@4.4.7)(react@18.3.1)
      react-dom:
        specifier: ^18.3.1
        version: 18.3.1(react@18.3.1)
      react-hook-form:
        specifier: ^7.54.2
        version: 7.54.2(react@18.3.1)
      rxjs:
        specifier: ^7.8.1
        version: 7.8.1
      server-only:
        specifier: ^0.0.1
        version: 0.0.1
      sonner:
        specifier: ^1.7.4
        version: 1.7.4(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      superjson:
        specifier: ^2.2.1
        version: 2.2.2
      tailwind-merge:
        specifier: ^3.0.1
        version: 3.0.1
      tailwindcss-animate:
        specifier: ^1.0.7
        version: 1.0.7(tailwindcss@3.4.17)
      zod:
        specifier: ^3.24.1
        version: 3.24.2
    devDependencies:
      '@types/cheerio':
        specifier: ^0.22.35
        version: 0.22.35
      '@types/eslint':
        specifier: ^8.56.10
        version: 8.56.12
      '@types/node':
        specifier: ^20.14.10
        version: 20.17.17
      '@types/react':
        specifier: ^18.3.3
        version: 18.3.18
      '@types/react-dom':
        specifier: ^18.3.0
        version: 18.3.5(@types/react@18.3.18)
      '@typescript-eslint/eslint-plugin':
        specifier: ^8.1.0
        version: 8.24.0(@typescript-eslint/parser@8.24.0(eslint@8.57.1)(typescript@5.7.3))(eslint@8.57.1)(typescript@5.7.3)
      '@typescript-eslint/parser':
        specifier: ^8.1.0
        version: 8.24.0(eslint@8.57.1)(typescript@5.7.3)
      autoprefixer:
        specifier: ^10.4.14
        version: 10.4.20(postcss@8.5.2)
      drizzle-kit:
        specifier: ^0.24.0
        version: 0.24.2
      eslint:
        specifier: ^8.57.0
        version: 8.57.1
      eslint-config-next:
        specifier: ^15.0.1
        version: 15.1.7(eslint@8.57.1)(typescript@5.7.3)
      eslint-config-prettier:
        specifier: ^10.0.1
        version: 10.0.1(eslint@8.57.1)
      eslint-plugin-drizzle:
        specifier: ^0.2.3
        version: 0.2.3(eslint@8.57.1)
      eslint-plugin-prettier:
        specifier: ^5.2.3
        version: 5.2.3(@types/eslint@8.56.12)(eslint-config-prettier@10.0.1(eslint@8.57.1))(eslint@8.57.1)(prettier@3.5.0)
      postcss:
        specifier: ^8.4.39
        version: 8.5.2
      prettier:
        specifier: ^3.3.2
        version: 3.5.0
      prettier-eslint:
        specifier: ^16.3.0
        version: 16.3.0
      prettier-plugin-tailwindcss:
        specifier: ^0.6.11
        version: 0.6.11(prettier@3.5.0)
      tailwindcss:
        specifier: ^3.4.17
        version: 3.4.17
      typescript:
        specifier: ^5.5.3
        version: 5.7.3

packages:

  '@acuminous/bitsyntax@0.1.2':
    resolution: {integrity: sha512-29lUK80d1muEQqiUsSo+3A0yP6CdspgC95EnKBMi22Xlwt79i/En4Vr67+cXhU+cZjbti3TgGGC5wy1stIywVQ==}
    engines: {node: '>=0.8'}

  '@alloc/quick-lru@5.2.0':
    resolution: {integrity: sha512-UrcABB+4bUrFABwbluTIBErXwvbsU/V7TZWfmbgJfbkwiBuziS9gxdODUyuiecfdGQ85jglMW6juS3+z5TsKLw==}
    engines: {node: '>=10'}

  '@auth/core@0.37.2':
    resolution: {integrity: sha512-kUvzyvkcd6h1vpeMAojK2y7+PAV5H+0Cc9+ZlKYDFhDY31AlvsB+GW5vNO4qE3Y07KeQgvNO9U0QUx/fN62kBw==}
    peerDependencies:
      '@simplewebauthn/browser': ^9.0.1
      '@simplewebauthn/server': ^9.0.2
      nodemailer: ^6.8.0
    peerDependenciesMeta:
      '@simplewebauthn/browser':
        optional: true
      '@simplewebauthn/server':
        optional: true
      nodemailer:
        optional: true

  '@auth/core@0.37.4':
    resolution: {integrity: sha512-HOXJwXWXQRhbBDHlMU0K/6FT1v+wjtzdKhsNg0ZN7/gne6XPsIrjZ4daMcFnbq0Z/vsAbYBinQhhua0d77v7qw==}
    peerDependencies:
      '@simplewebauthn/browser': ^9.0.1
      '@simplewebauthn/server': ^9.0.2
      nodemailer: ^6.8.0
    peerDependenciesMeta:
      '@simplewebauthn/browser':
        optional: true
      '@simplewebauthn/server':
        optional: true
      nodemailer:
        optional: true

  '@auth/drizzle-adapter@1.7.4':
    resolution: {integrity: sha512-OPZQakWWm5Hbx6okVMbtgI08WBliz/dCbFUXiPg9TThpp3Wh7MME/ubg4fW1oOp8P0gul6MkFvMVO733sVtd2w==}

  '@babel/runtime@7.26.7':
    resolution: {integrity: sha512-AOPI3D+a8dXnja+iwsUqGRjr1BbZIe771sXdapOtYI531gSqpi92vXivKcq2asu/DFpdl1ceFAKZyRzK2PCVcQ==}
    engines: {node: '>=6.9.0'}

  '@cfworker/json-schema@4.1.1':
    resolution: {integrity: sha512-gAmrUZSGtKc3AiBL71iNWxDsyUC5uMaKKGdvzYsBoTW/xi42JQHl7eKV2OYzCUqvc+D2RCcf7EXY2iCyFIk6og==}

  '@drizzle-team/brocli@0.10.2':
    resolution: {integrity: sha512-z33Il7l5dKjUgGULTqBsQBQwckHh5AbIuxhdsIxDDiZAzBOrZO6q9ogcWC65kU382AfynTfgNumVcNIjuIua6w==}

  '@emnapi/runtime@1.3.1':
    resolution: {integrity: sha512-kEBmG8KyqtxJZv+ygbEim+KCGtIq1fC22Ms3S4ziXmYKm8uyoLX0MHONVKwp+9opg390VaKRNt4a7A9NwmpNhw==}

  '@esbuild-kit/core-utils@3.3.2':
    resolution: {integrity: sha512-sPRAnw9CdSsRmEtnsl2WXWdyquogVpB3yZ3dgwJfe8zrOzTsV7cJvmwrKVa+0ma5BoiGJ+BoqkMvawbayKUsqQ==}
    deprecated: 'Merged into tsx: https://tsx.is'

  '@esbuild-kit/esm-loader@2.6.5':
    resolution: {integrity: sha512-FxEMIkJKnodyA1OaCUoEvbYRkoZlLZ4d/eXFu9Fh8CbBBgP5EmZxrfTRyN0qpXZ4vOvqnE5YdRdcrmUUXuU+dA==}
    deprecated: 'Merged into tsx: https://tsx.is'

  '@esbuild/aix-ppc64@0.19.12':
    resolution: {integrity: sha512-bmoCYyWdEL3wDQIVbcyzRyeKLgk2WtWLTWz1ZIAZF/EGbNOwSA6ew3PftJ1PqMiOOGu0OyFMzG53L0zqIpPeNA==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [aix]

  '@esbuild/android-arm64@0.18.20':
    resolution: {integrity: sha512-Nz4rJcchGDtENV0eMKUNa6L12zz2zBDXuhj/Vjh18zGqB44Bi7MBMSXjgunJgjRhCmKOjnPuZp4Mb6OKqtMHLQ==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [android]

  '@esbuild/android-arm64@0.19.12':
    resolution: {integrity: sha512-P0UVNGIienjZv3f5zq0DP3Nt2IE/3plFzuaS96vihvD0Hd6H/q4WXUGpCxD/E8YrSXfNyRPbpTq+T8ZQioSuPA==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [android]

  '@esbuild/android-arm@0.18.20':
    resolution: {integrity: sha512-fyi7TDI/ijKKNZTUJAQqiG5T7YjJXgnzkURqmGj13C6dCqckZBLdl4h7bkhHt/t0WP+zO9/zwroDvANaOqO5Sw==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [android]

  '@esbuild/android-arm@0.19.12':
    resolution: {integrity: sha512-qg/Lj1mu3CdQlDEEiWrlC4eaPZ1KztwGJ9B6J+/6G+/4ewxJg7gqj8eVYWvao1bXrqGiW2rsBZFSX3q2lcW05w==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [android]

  '@esbuild/android-x64@0.18.20':
    resolution: {integrity: sha512-8GDdlePJA8D6zlZYJV/jnrRAi6rOiNaCC/JclcXpB+KIuvfBN4owLtgzY2bsxnx666XjJx2kDPUmnTtR8qKQUg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [android]

  '@esbuild/android-x64@0.19.12':
    resolution: {integrity: sha512-3k7ZoUW6Q6YqhdhIaq/WZ7HwBpnFBlW905Fa4s4qWJyiNOgT1dOqDiVAQFwBH7gBRZr17gLrlFCRzF6jFh7Kew==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [android]

  '@esbuild/darwin-arm64@0.18.20':
    resolution: {integrity: sha512-bxRHW5kHU38zS2lPTPOyuyTm+S+eobPUnTNkdJEfAddYgEcll4xkT8DB9d2008DtTbl7uJag2HuE5NZAZgnNEA==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [darwin]

  '@esbuild/darwin-arm64@0.19.12':
    resolution: {integrity: sha512-B6IeSgZgtEzGC42jsI+YYu9Z3HKRxp8ZT3cqhvliEHovq8HSX2YX8lNocDn79gCKJXOSaEot9MVYky7AKjCs8g==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [darwin]

  '@esbuild/darwin-x64@0.18.20':
    resolution: {integrity: sha512-pc5gxlMDxzm513qPGbCbDukOdsGtKhfxD1zJKXjCCcU7ju50O7MeAZ8c4krSJcOIJGFR+qx21yMMVYwiQvyTyQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [darwin]

  '@esbuild/darwin-x64@0.19.12':
    resolution: {integrity: sha512-hKoVkKzFiToTgn+41qGhsUJXFlIjxI/jSYeZf3ugemDYZldIXIxhvwN6erJGlX4t5h417iFuheZ7l+YVn05N3A==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [darwin]

  '@esbuild/freebsd-arm64@0.18.20':
    resolution: {integrity: sha512-yqDQHy4QHevpMAaxhhIwYPMv1NECwOvIpGCZkECn8w2WFHXjEwrBn3CeNIYsibZ/iZEUemj++M26W3cNR5h+Tw==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [freebsd]

  '@esbuild/freebsd-arm64@0.19.12':
    resolution: {integrity: sha512-4aRvFIXmwAcDBw9AueDQ2YnGmz5L6obe5kmPT8Vd+/+x/JMVKCgdcRwH6APrbpNXsPz+K653Qg8HB/oXvXVukA==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [freebsd]

  '@esbuild/freebsd-x64@0.18.20':
    resolution: {integrity: sha512-tgWRPPuQsd3RmBZwarGVHZQvtzfEBOreNuxEMKFcd5DaDn2PbBxfwLcj4+aenoh7ctXcbXmOQIn8HI6mCSw5MQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [freebsd]

  '@esbuild/freebsd-x64@0.19.12':
    resolution: {integrity: sha512-EYoXZ4d8xtBoVN7CEwWY2IN4ho76xjYXqSXMNccFSx2lgqOG/1TBPW0yPx1bJZk94qu3tX0fycJeeQsKovA8gg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [freebsd]

  '@esbuild/linux-arm64@0.18.20':
    resolution: {integrity: sha512-2YbscF+UL7SQAVIpnWvYwM+3LskyDmPhe31pE7/aoTMFKKzIc9lLbyGUpmmb8a8AixOL61sQ/mFh3jEjHYFvdA==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [linux]

  '@esbuild/linux-arm64@0.19.12':
    resolution: {integrity: sha512-EoTjyYyLuVPfdPLsGVVVC8a0p1BFFvtpQDB/YLEhaXyf/5bczaGeN15QkR+O4S5LeJ92Tqotve7i1jn35qwvdA==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [linux]

  '@esbuild/linux-arm@0.18.20':
    resolution: {integrity: sha512-/5bHkMWnq1EgKr1V+Ybz3s1hWXok7mDFUMQ4cG10AfW3wL02PSZi5kFpYKrptDsgb2WAJIvRcDm+qIvXf/apvg==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [linux]

  '@esbuild/linux-arm@0.19.12':
    resolution: {integrity: sha512-J5jPms//KhSNv+LO1S1TX1UWp1ucM6N6XuL6ITdKWElCu8wXP72l9MM0zDTzzeikVyqFE6U8YAV9/tFyj0ti+w==}
    engines: {node: '>=12'}
    cpu: [arm]
    os: [linux]

  '@esbuild/linux-ia32@0.18.20':
    resolution: {integrity: sha512-P4etWwq6IsReT0E1KHU40bOnzMHoH73aXp96Fs8TIT6z9Hu8G6+0SHSw9i2isWrD2nbx2qo5yUqACgdfVGx7TA==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [linux]

  '@esbuild/linux-ia32@0.19.12':
    resolution: {integrity: sha512-Thsa42rrP1+UIGaWz47uydHSBOgTUnwBwNq59khgIwktK6x60Hivfbux9iNR0eHCHzOLjLMLfUMLCypBkZXMHA==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [linux]

  '@esbuild/linux-loong64@0.18.20':
    resolution: {integrity: sha512-nXW8nqBTrOpDLPgPY9uV+/1DjxoQ7DoB2N8eocyq8I9XuqJ7BiAMDMf9n1xZM9TgW0J8zrquIb/A7s3BJv7rjg==}
    engines: {node: '>=12'}
    cpu: [loong64]
    os: [linux]

  '@esbuild/linux-loong64@0.19.12':
    resolution: {integrity: sha512-LiXdXA0s3IqRRjm6rV6XaWATScKAXjI4R4LoDlvO7+yQqFdlr1Bax62sRwkVvRIrwXxvtYEHHI4dm50jAXkuAA==}
    engines: {node: '>=12'}
    cpu: [loong64]
    os: [linux]

  '@esbuild/linux-mips64el@0.18.20':
    resolution: {integrity: sha512-d5NeaXZcHp8PzYy5VnXV3VSd2D328Zb+9dEq5HE6bw6+N86JVPExrA6O68OPwobntbNJ0pzCpUFZTo3w0GyetQ==}
    engines: {node: '>=12'}
    cpu: [mips64el]
    os: [linux]

  '@esbuild/linux-mips64el@0.19.12':
    resolution: {integrity: sha512-fEnAuj5VGTanfJ07ff0gOA6IPsvrVHLVb6Lyd1g2/ed67oU1eFzL0r9WL7ZzscD+/N6i3dWumGE1Un4f7Amf+w==}
    engines: {node: '>=12'}
    cpu: [mips64el]
    os: [linux]

  '@esbuild/linux-ppc64@0.18.20':
    resolution: {integrity: sha512-WHPyeScRNcmANnLQkq6AfyXRFr5D6N2sKgkFo2FqguP44Nw2eyDlbTdZwd9GYk98DZG9QItIiTlFLHJHjxP3FA==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [linux]

  '@esbuild/linux-ppc64@0.19.12':
    resolution: {integrity: sha512-nYJA2/QPimDQOh1rKWedNOe3Gfc8PabU7HT3iXWtNUbRzXS9+vgB0Fjaqr//XNbd82mCxHzik2qotuI89cfixg==}
    engines: {node: '>=12'}
    cpu: [ppc64]
    os: [linux]

  '@esbuild/linux-riscv64@0.18.20':
    resolution: {integrity: sha512-WSxo6h5ecI5XH34KC7w5veNnKkju3zBRLEQNY7mv5mtBmrP/MjNBCAlsM2u5hDBlS3NGcTQpoBvRzqBcRtpq1A==}
    engines: {node: '>=12'}
    cpu: [riscv64]
    os: [linux]

  '@esbuild/linux-riscv64@0.19.12':
    resolution: {integrity: sha512-2MueBrlPQCw5dVJJpQdUYgeqIzDQgw3QtiAHUC4RBz9FXPrskyyU3VI1hw7C0BSKB9OduwSJ79FTCqtGMWqJHg==}
    engines: {node: '>=12'}
    cpu: [riscv64]
    os: [linux]

  '@esbuild/linux-s390x@0.18.20':
    resolution: {integrity: sha512-+8231GMs3mAEth6Ja1iK0a1sQ3ohfcpzpRLH8uuc5/KVDFneH6jtAJLFGafpzpMRO6DzJ6AvXKze9LfFMrIHVQ==}
    engines: {node: '>=12'}
    cpu: [s390x]
    os: [linux]

  '@esbuild/linux-s390x@0.19.12':
    resolution: {integrity: sha512-+Pil1Nv3Umes4m3AZKqA2anfhJiVmNCYkPchwFJNEJN5QxmTs1uzyy4TvmDrCRNT2ApwSari7ZIgrPeUx4UZDg==}
    engines: {node: '>=12'}
    cpu: [s390x]
    os: [linux]

  '@esbuild/linux-x64@0.18.20':
    resolution: {integrity: sha512-UYqiqemphJcNsFEskc73jQ7B9jgwjWrSayxawS6UVFZGWrAAtkzjxSqnoclCXxWtfwLdzU+vTpcNYhpn43uP1w==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [linux]

  '@esbuild/linux-x64@0.19.12':
    resolution: {integrity: sha512-B71g1QpxfwBvNrfyJdVDexenDIt1CiDN1TIXLbhOw0KhJzE78KIFGX6OJ9MrtC0oOqMWf+0xop4qEU8JrJTwCg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [linux]

  '@esbuild/netbsd-x64@0.18.20':
    resolution: {integrity: sha512-iO1c++VP6xUBUmltHZoMtCUdPlnPGdBom6IrO4gyKPFFVBKioIImVooR5I83nTew5UOYrk3gIJhbZh8X44y06A==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [netbsd]

  '@esbuild/netbsd-x64@0.19.12':
    resolution: {integrity: sha512-3ltjQ7n1owJgFbuC61Oj++XhtzmymoCihNFgT84UAmJnxJfm4sYCiSLTXZtE00VWYpPMYc+ZQmB6xbSdVh0JWA==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [netbsd]

  '@esbuild/openbsd-x64@0.18.20':
    resolution: {integrity: sha512-e5e4YSsuQfX4cxcygw/UCPIEP6wbIL+se3sxPdCiMbFLBWu0eiZOJ7WoD+ptCLrmjZBK1Wk7I6D/I3NglUGOxg==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [openbsd]

  '@esbuild/openbsd-x64@0.19.12':
    resolution: {integrity: sha512-RbrfTB9SWsr0kWmb9srfF+L933uMDdu9BIzdA7os2t0TXhCRjrQyCeOt6wVxr79CKD4c+p+YhCj31HBkYcXebw==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [openbsd]

  '@esbuild/sunos-x64@0.18.20':
    resolution: {integrity: sha512-kDbFRFp0YpTQVVrqUd5FTYmWo45zGaXe0X8E1G/LKFC0v8x0vWrhOWSLITcCn63lmZIxfOMXtCfti/RxN/0wnQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [sunos]

  '@esbuild/sunos-x64@0.19.12':
    resolution: {integrity: sha512-HKjJwRrW8uWtCQnQOz9qcU3mUZhTUQvi56Q8DPTLLB+DawoiQdjsYq+j+D3s9I8VFtDr+F9CjgXKKC4ss89IeA==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [sunos]

  '@esbuild/win32-arm64@0.18.20':
    resolution: {integrity: sha512-ddYFR6ItYgoaq4v4JmQQaAI5s7npztfV4Ag6NrhiaW0RrnOXqBkgwZLofVTlq1daVTQNhtI5oieTvkRPfZrePg==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [win32]

  '@esbuild/win32-arm64@0.19.12':
    resolution: {integrity: sha512-URgtR1dJnmGvX864pn1B2YUYNzjmXkuJOIqG2HdU62MVS4EHpU2946OZoTMnRUHklGtJdJZ33QfzdjGACXhn1A==}
    engines: {node: '>=12'}
    cpu: [arm64]
    os: [win32]

  '@esbuild/win32-ia32@0.18.20':
    resolution: {integrity: sha512-Wv7QBi3ID/rROT08SABTS7eV4hX26sVduqDOTe1MvGMjNd3EjOz4b7zeexIR62GTIEKrfJXKL9LFxTYgkyeu7g==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [win32]

  '@esbuild/win32-ia32@0.19.12':
    resolution: {integrity: sha512-+ZOE6pUkMOJfmxmBZElNOx72NKpIa/HFOMGzu8fqzQJ5kgf6aTGrcJaFsNiVMH4JKpMipyK+7k0n2UXN7a8YKQ==}
    engines: {node: '>=12'}
    cpu: [ia32]
    os: [win32]

  '@esbuild/win32-x64@0.18.20':
    resolution: {integrity: sha512-kTdfRcSiDfQca/y9QIkng02avJ+NCaQvrMejlsB3RRv5sE9rRoeBPISaZpKxHELzRxZyLvNts1P27W3wV+8geQ==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [win32]

  '@esbuild/win32-x64@0.19.12':
    resolution: {integrity: sha512-T1QyPSDCyMXaO3pzBkF96E8xMkiRYbUEZADd29SyPGabqxMViNoii+NcK7eWJAEoU6RZyEm5lVSIjTmcdoB9HA==}
    engines: {node: '>=12'}
    cpu: [x64]
    os: [win32]

  '@eslint-community/eslint-utils@4.4.1':
    resolution: {integrity: sha512-s3O3waFUrMV8P/XaF/+ZTp1X9XBZW1a4B97ZnjQF2KYWaFD2A8KyFBsrsfSjEmjn3RGWAIuvlneuZm3CUK3jbA==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
    peerDependencies:
      eslint: ^6.0.0 || ^7.0.0 || >=8.0.0

  '@eslint-community/regexpp@4.12.1':
    resolution: {integrity: sha512-CCZCDJuduB9OUkFkY2IgppNZMi2lBQgD2qzwXkEia16cge2pijY/aXi96CJMquDMn3nJdlPV1A5KrJEXwfLNzQ==}
    engines: {node: ^12.0.0 || ^14.0.0 || >=16.0.0}

  '@eslint/eslintrc@2.1.4':
    resolution: {integrity: sha512-269Z39MS6wVJtsoUl10L60WdkhJVdPG24Q4eZTH3nnF6lpvSShEK3wQjDX9JRWAUPvPh7COouPpU9IrqaZFvtQ==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}

  '@eslint/js@8.57.1':
    resolution: {integrity: sha512-d9zaMRSTIKDLhctzH12MtXvJKSSUhaHcjV+2Z+GK+EEY7XKpP5yR4x+N3TAcHTcu963nIr+TMcCb4DBCYX1z6Q==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}

  '@floating-ui/core@1.6.9':
    resolution: {integrity: sha512-uMXCuQ3BItDUbAMhIXw7UPXRfAlOAvZzdK9BWpE60MCn+Svt3aLn9jsPTi/WNGlRUu2uI0v5S7JiIUsbsvh3fw==}

  '@floating-ui/dom@1.6.13':
    resolution: {integrity: sha512-umqzocjDgNRGTuO7Q8CU32dkHkECqI8ZdMZ5Swb6QAM0t5rnlrN3lGo1hdpscRd3WS8T6DKYK4ephgIH9iRh3w==}

  '@floating-ui/react-dom@2.1.2':
    resolution: {integrity: sha512-06okr5cgPzMNBy+Ycse2A6udMi4bqwW/zgBF/rwjcNqWkyr82Mcg8b0vjX8OJpZFy/FKjJmw6wV7t44kK6kW7A==}
    peerDependencies:
      react: '>=16.8.0'
      react-dom: '>=16.8.0'

  '@floating-ui/utils@0.2.9':
    resolution: {integrity: sha512-MDWhGtE+eHw5JW7lq4qhc5yRLS11ERl1c7Z6Xd0a58DozHES6EnNNwUWbMiG4J9Cgj053Bhk8zvlhFYKVhULwg==}

  '@google/generative-ai@0.21.0':
    resolution: {integrity: sha512-7XhUbtnlkSEZK15kN3t+tzIMxsbKm/dSkKBFalj+20NvPKe1kBY7mR2P7vuijEn+f06z5+A8bVGKO0v39cr6Wg==}
    engines: {node: '>=18.0.0'}

  '@grpc/grpc-js@1.12.6':
    resolution: {integrity: sha512-JXUj6PI0oqqzTGvKtzOkxtpsyPRNsrmhh41TtIz/zEB6J+AUiZZ0dxWzcMwO9Ns5rmSPuMdghlTbUuqIM48d3Q==}
    engines: {node: '>=12.10.0'}

  '@grpc/proto-loader@0.7.13':
    resolution: {integrity: sha512-AiXO/bfe9bmxBjxxtYxFAXGZvMaN5s8kO+jBHAJCON8rJoB5YS/D6X7ZNc6XQkuHNmyl4CYaMI1fJ/Gn27RGGw==}
    engines: {node: '>=6'}
    hasBin: true

  '@hookform/resolvers@3.10.0':
    resolution: {integrity: sha512-79Dv+3mDF7i+2ajj7SkypSKHhl1cbln1OGavqrsF7p6mbUv11xpqpacPsGDCTRvCSjEEIez2ef1NveSVL3b0Ag==}
    peerDependencies:
      react-hook-form: ^7.0.0

  '@humanwhocodes/config-array@0.13.0':
    resolution: {integrity: sha512-DZLEEqFWQFiyK6h5YIeynKx7JlvCYWL0cImfSRXZ9l4Sg2efkFGTuFf6vzXjK1cq6IYkU+Eg/JizXw+TD2vRNw==}
    engines: {node: '>=10.10.0'}
    deprecated: Use @eslint/config-array instead

  '@humanwhocodes/module-importer@1.0.1':
    resolution: {integrity: sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==}
    engines: {node: '>=12.22'}

  '@humanwhocodes/object-schema@2.0.3':
    resolution: {integrity: sha512-93zYdMES/c1D69yZiKDBj0V24vqNzB/koF26KPaagAfd3P/4gUlh3Dys5ogAK+Exi9QyzlD8x/08Zt7wIKcDcA==}
    deprecated: Use @eslint/object-schema instead

  '@img/sharp-darwin-arm64@0.33.5':
    resolution: {integrity: sha512-UT4p+iz/2H4twwAoLCqfA9UH5pI6DggwKEGuaPy7nCVQ8ZsiY5PIcrRvD1DzuY3qYL07NtIQcWnBSY/heikIFQ==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [arm64]
    os: [darwin]

  '@img/sharp-darwin-x64@0.33.5':
    resolution: {integrity: sha512-fyHac4jIc1ANYGRDxtiqelIbdWkIuQaI84Mv45KvGRRxSAa7o7d1ZKAOBaYbnepLC1WqxfpimdeWfvqqSGwR2Q==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [x64]
    os: [darwin]

  '@img/sharp-libvips-darwin-arm64@1.0.4':
    resolution: {integrity: sha512-XblONe153h0O2zuFfTAbQYAX2JhYmDHeWikp1LM9Hul9gVPjFY427k6dFEcOL72O01QxQsWi761svJ/ev9xEDg==}
    cpu: [arm64]
    os: [darwin]

  '@img/sharp-libvips-darwin-x64@1.0.4':
    resolution: {integrity: sha512-xnGR8YuZYfJGmWPvmlunFaWJsb9T/AO2ykoP3Fz/0X5XV2aoYBPkX6xqCQvUTKKiLddarLaxpzNe+b1hjeWHAQ==}
    cpu: [x64]
    os: [darwin]

  '@img/sharp-libvips-linux-arm64@1.0.4':
    resolution: {integrity: sha512-9B+taZ8DlyyqzZQnoeIvDVR/2F4EbMepXMc/NdVbkzsJbzkUjhXv/70GQJ7tdLA4YJgNP25zukcxpX2/SueNrA==}
    cpu: [arm64]
    os: [linux]

  '@img/sharp-libvips-linux-arm@1.0.5':
    resolution: {integrity: sha512-gvcC4ACAOPRNATg/ov8/MnbxFDJqf/pDePbBnuBDcjsI8PssmjoKMAz4LtLaVi+OnSb5FK/yIOamqDwGmXW32g==}
    cpu: [arm]
    os: [linux]

  '@img/sharp-libvips-linux-s390x@1.0.4':
    resolution: {integrity: sha512-u7Wz6ntiSSgGSGcjZ55im6uvTrOxSIS8/dgoVMoiGE9I6JAfU50yH5BoDlYA1tcuGS7g/QNtetJnxA6QEsCVTA==}
    cpu: [s390x]
    os: [linux]

  '@img/sharp-libvips-linux-x64@1.0.4':
    resolution: {integrity: sha512-MmWmQ3iPFZr0Iev+BAgVMb3ZyC4KeFc3jFxnNbEPas60e1cIfevbtuyf9nDGIzOaW9PdnDciJm+wFFaTlj5xYw==}
    cpu: [x64]
    os: [linux]

  '@img/sharp-libvips-linuxmusl-arm64@1.0.4':
    resolution: {integrity: sha512-9Ti+BbTYDcsbp4wfYib8Ctm1ilkugkA/uscUn6UXK1ldpC1JjiXbLfFZtRlBhjPZ5o1NCLiDbg8fhUPKStHoTA==}
    cpu: [arm64]
    os: [linux]

  '@img/sharp-libvips-linuxmusl-x64@1.0.4':
    resolution: {integrity: sha512-viYN1KX9m+/hGkJtvYYp+CCLgnJXwiQB39damAO7WMdKWlIhmYTfHjwSbQeUK/20vY154mwezd9HflVFM1wVSw==}
    cpu: [x64]
    os: [linux]

  '@img/sharp-linux-arm64@0.33.5':
    resolution: {integrity: sha512-JMVv+AMRyGOHtO1RFBiJy/MBsgz0x4AWrT6QoEVVTyh1E39TrCUpTRI7mx9VksGX4awWASxqCYLCV4wBZHAYxA==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [arm64]
    os: [linux]

  '@img/sharp-linux-arm@0.33.5':
    resolution: {integrity: sha512-JTS1eldqZbJxjvKaAkxhZmBqPRGmxgu+qFKSInv8moZ2AmT5Yib3EQ1c6gp493HvrvV8QgdOXdyaIBrhvFhBMQ==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [arm]
    os: [linux]

  '@img/sharp-linux-s390x@0.33.5':
    resolution: {integrity: sha512-y/5PCd+mP4CA/sPDKl2961b+C9d+vPAveS33s6Z3zfASk2j5upL6fXVPZi7ztePZ5CuH+1kW8JtvxgbuXHRa4Q==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [s390x]
    os: [linux]

  '@img/sharp-linux-x64@0.33.5':
    resolution: {integrity: sha512-opC+Ok5pRNAzuvq1AG0ar+1owsu842/Ab+4qvU879ippJBHvyY5n2mxF1izXqkPYlGuP/M556uh53jRLJmzTWA==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [x64]
    os: [linux]

  '@img/sharp-linuxmusl-arm64@0.33.5':
    resolution: {integrity: sha512-XrHMZwGQGvJg2V/oRSUfSAfjfPxO+4DkiRh6p2AFjLQztWUuY/o8Mq0eMQVIY7HJ1CDQUJlxGGZRw1a5bqmd1g==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [arm64]
    os: [linux]

  '@img/sharp-linuxmusl-x64@0.33.5':
    resolution: {integrity: sha512-WT+d/cgqKkkKySYmqoZ8y3pxx7lx9vVejxW/W4DOFMYVSkErR+w7mf2u8m/y4+xHe7yY9DAXQMWQhpnMuFfScw==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [x64]
    os: [linux]

  '@img/sharp-wasm32@0.33.5':
    resolution: {integrity: sha512-ykUW4LVGaMcU9lu9thv85CbRMAwfeadCJHRsg2GmeRa/cJxsVY9Rbd57JcMxBkKHag5U/x7TSBpScF4U8ElVzg==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [wasm32]

  '@img/sharp-win32-ia32@0.33.5':
    resolution: {integrity: sha512-T36PblLaTwuVJ/zw/LaH0PdZkRz5rd3SmMHX8GSmR7vtNSP5Z6bQkExdSK7xGWyxLw4sUknBuugTelgw2faBbQ==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [ia32]
    os: [win32]

  '@img/sharp-win32-x64@0.33.5':
    resolution: {integrity: sha512-MpY/o8/8kj+EcnxwvrP4aTJSWw/aZ7JIGR4aBeZkZw5B7/Jn+tY9/VNwtcoGmdT7GfggGIU4kygOMSbYnOrAbg==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}
    cpu: [x64]
    os: [win32]

  '@ioredis/commands@1.2.0':
    resolution: {integrity: sha512-Sx1pU8EM64o2BrqNpEO1CNLtKQwyhuXuqyfH7oGKCk+1a33d2r5saW8zNwm3j6BTExtjrv2BxTgzzkMwts6vGg==}

  '@isaacs/cliui@8.0.2':
    resolution: {integrity: sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA==}
    engines: {node: '>=12'}

  '@jest/schemas@29.6.3':
    resolution: {integrity: sha512-mo5j5X+jIZmJQveBKeS/clAueipV7KgiX1vMgCxam1RNYiqE1w62n0/tJJnHtjW8ZHcQco5gY85jA3mi0L+nSA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jridgewell/gen-mapping@0.3.8':
    resolution: {integrity: sha512-imAbBGkb+ebQyxKgzv5Hu2nmROxoDOXHh80evxdoXNOrvAnVx7zimzc1Oo5h9RlfV4vPXaE2iM5pOFbvOCClWA==}
    engines: {node: '>=6.0.0'}

  '@jridgewell/resolve-uri@3.1.2':
    resolution: {integrity: sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==}
    engines: {node: '>=6.0.0'}

  '@jridgewell/set-array@1.2.1':
    resolution: {integrity: sha512-R8gLRTZeyp03ymzP/6Lil/28tGeGEzhx1q2k703KGWRAI1VdvPIXdG70VJc2pAMw3NA6JKL5hhFu1sJX0Mnn/A==}
    engines: {node: '>=6.0.0'}

  '@jridgewell/sourcemap-codec@1.5.0':
    resolution: {integrity: sha512-gv3ZRaISU3fjPAgNsriBRqGWQL6quFx04YMPW/zD8XMLsU32mhCCbfbO6KZFLjvYpCZ8zyDEgqsgf+PwPaM7GQ==}

  '@jridgewell/trace-mapping@0.3.25':
    resolution: {integrity: sha512-vNk6aEwybGtawWmy/PzwnGDOjCkLWSD2wqvjGGAgOAwCGWySYXfYoxt00IJkTF+8Lb57DwOb3Aa0o9CApepiYQ==}

  '@js-sdsl/ordered-map@4.4.2':
    resolution: {integrity: sha512-iUKgm52T8HOE/makSxjqoWhe95ZJA1/G1sYsGev2JDKUSS14KAgg1LHb+Ba+IPow0xflbnSkOsZcO08C7w1gYw==}

  '@kurkle/color@0.3.4':
    resolution: {integrity: sha512-M5UknZPHRu3DEDWoipU6sE8PdkZ6Z/S+v4dD+Ke8IaNlpdSQah50lz1KtcFBa2vsdOnwbbnxJwVM4wty6udA5w==}

  '@langchain/core@0.3.40':
    resolution: {integrity: sha512-RGhJOTzJv6H+3veBAnDlH2KXuZ68CXMEg6B6DPTzL3IGDyd+vLxXG4FIttzUwjdeQKjrrFBwlXpJDl7bkoApzQ==}
    engines: {node: '>=18'}

  '@langchain/google-genai@0.1.8':
    resolution: {integrity: sha512-aBz8IzEJfihOVz2GpqFrdLWjDlpscZUYIA7LZ2iazU7edO03etPaqxdexiYKr/Q+Be2D0BT7uaFJsouvQApIZA==}
    engines: {node: '>=18'}
    peerDependencies:
      '@langchain/core': '>=0.3.17 <0.4.0'

  '@langchain/groq@0.1.3':
    resolution: {integrity: sha512-dMzvBVaLf/0IQoHdAOAN8W/PbOcwgbvgUMCn02CqvCC90mxZ45LI0Tipzqnoaam0hiKALR5hLc3dNj1oCYV92w==}
    engines: {node: '>=18'}
    peerDependencies:
      '@langchain/core': '>=0.2.21 <0.4.0'

  '@langchain/openai@0.3.17':
    resolution: {integrity: sha512-uw4po32OKptVjq+CYHrumgbfh4NuD7LqyE+ZgqY9I/LrLc6bHLMc+sisHmI17vgek0K/yqtarI0alPJbzrwyag==}
    engines: {node: '>=18'}
    peerDependencies:
      '@langchain/core': '>=0.3.29 <0.4.0'

  '@langchain/openai@0.4.4':
    resolution: {integrity: sha512-UZybJeMd8+UX7Kn47kuFYfqKdBCeBUWNqDtmAr6ZUIMMnlsNIb6MkrEEhGgAEjGCpdT4CU8U/DyyddTz+JayOQ==}
    engines: {node: '>=18'}
    peerDependencies:
      '@langchain/core': '>=0.3.39 <0.4.0'

  '@langchain/textsplitters@0.1.0':
    resolution: {integrity: sha512-djI4uw9rlkAb5iMhtLED+xJebDdAG935AdP4eRTB02R7OB/act55Bj9wsskhZsvuyQRpO4O1wQOp85s6T6GWmw==}
    engines: {node: '>=18'}
    peerDependencies:
      '@langchain/core': '>=0.2.21 <0.4.0'

  '@lukeed/csprng@1.1.0':
    resolution: {integrity: sha512-Z7C/xXCiGWsg0KuKsHTKJxbWhpI3Vs5GwLfOean7MGyVFGqdRgBbAjOCh6u4bbjPc/8MJ2pZmK/0DLdCbivLDA==}
    engines: {node: '>=8'}

  '@nestjs/common@11.0.9':
    resolution: {integrity: sha512-+SKMYQE7O55tJGQVibnAlR9sXRBCF/8gM1cILdLT7cLj7+51NYD7eAHuAcGYiQIyXsTehZoO7C+B7S3ibNi3aw==}
    peerDependencies:
      class-transformer: '*'
      class-validator: '*'
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      class-transformer:
        optional: true
      class-validator:
        optional: true

  '@nestjs/core@11.0.9':
    resolution: {integrity: sha512-w32ZF1acSnidiRERGRC/Ki7eSrnTdP7twRnjy15Qnmij3oYRCdgX5aZvbUNv17A7bn9S22p+wMNcpHxqwUiOsQ==}
    engines: {node: '>= 20'}
    peerDependencies:
      '@nestjs/common': ^11.0.0
      '@nestjs/microservices': ^11.0.0
      '@nestjs/platform-express': ^11.0.0
      '@nestjs/websockets': ^11.0.0
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      '@nestjs/microservices':
        optional: true
      '@nestjs/platform-express':
        optional: true
      '@nestjs/websockets':
        optional: true

  '@nestjs/microservices@11.0.9':
    resolution: {integrity: sha512-eyrAVs3P+IDymhzk6xdtS0AqArz1bVyc3TQa1GQm2VZSdAXHxl9tEVikfVdcUbip/Xya8Qp45UalYXFdP5lbpQ==}
    peerDependencies:
      '@grpc/grpc-js': '*'
      '@nestjs/common': ^11.0.0
      '@nestjs/core': ^11.0.0
      '@nestjs/websockets': ^11.0.0
      amqp-connection-manager: '*'
      amqplib: '*'
      cache-manager: '*'
      ioredis: '*'
      kafkajs: '*'
      mqtt: '*'
      nats: '*'
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      '@grpc/grpc-js':
        optional: true
      '@nestjs/websockets':
        optional: true
      amqp-connection-manager:
        optional: true
      amqplib:
        optional: true
      cache-manager:
        optional: true
      ioredis:
        optional: true
      kafkajs:
        optional: true
      mqtt:
        optional: true
      nats:
        optional: true

  '@nestjs/platform-express@11.0.9':
    resolution: {integrity: sha512-AX3UbVNkK+yB0lxfwjy5krxLZy/bWD2V+3WIbc0btRQVcxGj4LWL0yenbAo0jiAFwW3rKt7SbmMHUuKK6OH5qA==}
    peerDependencies:
      '@nestjs/common': ^11.0.0
      '@nestjs/core': ^11.0.0

  '@nestjs/platform-socket.io@11.0.9':
    resolution: {integrity: sha512-H+wTOollSZ1GSAp2+UIl4x+rYutkrH0poYeeo/+Dr8AwobghZuSGxoQ3FpqIurI/NuwBoBdFJV7cm7v9mlKkuw==}
    peerDependencies:
      '@nestjs/common': ^11.0.0
      '@nestjs/websockets': ^11.0.0
      rxjs: ^7.1.0

  '@nestjs/websockets@11.0.9':
    resolution: {integrity: sha512-+eWh4MPTYBCoCQgcTY6g8TNPg0FkKzoqWRuugoA95Zz5edldoEK/P4BkqvzBiwrKqoHKwpsM/cct2edFA1TzQg==}
    peerDependencies:
      '@nestjs/common': ^11.0.0
      '@nestjs/core': ^11.0.0
      '@nestjs/platform-socket.io': ^11.0.0
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      '@nestjs/platform-socket.io':
        optional: true

  '@next/env@15.1.7':
    resolution: {integrity: sha512-d9jnRrkuOH7Mhi+LHav2XW91HOgTAWHxjMPkXMGBc9B2b7614P7kjt8tAplRvJpbSt4nbO1lugcT/kAaWzjlLQ==}

  '@next/eslint-plugin-next@15.1.7':
    resolution: {integrity: sha512-kRP7RjSxfTO13NE317ek3mSGzoZlI33nc/i5hs1KaWpK+egs85xg0DJ4p32QEiHnR0mVjuUfhRIun7awqfL7pQ==}

  '@next/swc-darwin-arm64@15.1.7':
    resolution: {integrity: sha512-hPFwzPJDpA8FGj7IKV3Yf1web3oz2YsR8du4amKw8d+jAOHfYHYFpMkoF6vgSY4W6vB29RtZEklK9ayinGiCmQ==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [darwin]

  '@next/swc-darwin-x64@15.1.7':
    resolution: {integrity: sha512-2qoas+fO3OQKkU0PBUfwTiw/EYpN+kdAx62cePRyY1LqKtP09Vp5UcUntfZYajop5fDFTjSxCHfZVRxzi+9FYQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [darwin]

  '@next/swc-linux-arm64-gnu@15.1.7':
    resolution: {integrity: sha512-sKLLwDX709mPdzxMnRIXLIT9zaX2w0GUlkLYQnKGoXeWUhcvpCrK+yevcwCJPdTdxZEUA0mOXGLdPsGkudGdnA==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]

  '@next/swc-linux-arm64-musl@15.1.7':
    resolution: {integrity: sha512-zblK1OQbQWdC8fxdX4fpsHDw+VSpBPGEUX4PhSE9hkaWPrWoeIJn+baX53vbsbDRaDKd7bBNcXRovY1hEhFd7w==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]

  '@next/swc-linux-x64-gnu@15.1.7':
    resolution: {integrity: sha512-GOzXutxuLvLHFDAPsMP2zDBMl1vfUHHpdNpFGhxu90jEzH6nNIgmtw/s1MDwpTOiM+MT5V8+I1hmVFeAUhkbgQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]

  '@next/swc-linux-x64-musl@15.1.7':
    resolution: {integrity: sha512-WrZ7jBhR7ATW1z5iEQ0ZJfE2twCNSXbpCSaAunF3BKcVeHFADSI/AW1y5Xt3DzTqPF1FzQlwQTewqetAABhZRQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]

  '@next/swc-win32-arm64-msvc@15.1.7':
    resolution: {integrity: sha512-LDnj1f3OVbou1BqvvXVqouJZKcwq++mV2F+oFHptToZtScIEnhNRJAhJzqAtTE2dB31qDYL45xJwrc+bLeKM2Q==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [win32]

  '@next/swc-win32-x64-msvc@15.1.7':
    resolution: {integrity: sha512-dC01f1quuf97viOfW05/K8XYv2iuBgAxJZl7mbCKEjMgdQl5JjAKJ0D2qMKZCgPWDeFbFT0Q0nYWwytEW0DWTQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [win32]

  '@nodelib/fs.scandir@2.1.5':
    resolution: {integrity: sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==}
    engines: {node: '>= 8'}

  '@nodelib/fs.stat@2.0.5':
    resolution: {integrity: sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==}
    engines: {node: '>= 8'}

  '@nodelib/fs.walk@1.2.8':
    resolution: {integrity: sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==}
    engines: {node: '>= 8'}

  '@nolyfill/is-core-module@1.0.39':
    resolution: {integrity: sha512-nn5ozdjYQpUCZlWGuxcJY/KpxkWQs4DcbMCmKojjyrYDEAGy4Ce19NN4v5MduafTwJlbKc99UA8YhSVqq9yPZA==}
    engines: {node: '>=12.4.0'}

  '@nuxt/opencollective@0.4.1':
    resolution: {integrity: sha512-GXD3wy50qYbxCJ652bDrDzgMr3NFEkIS374+IgFQKkCvk9yiYcLvX2XDYr7UyQxf4wK0e+yqDYRubZ0DtOxnmQ==}
    engines: {node: ^14.18.0 || >=16.10.0, npm: '>=5.10.0'}
    hasBin: true

  '@panva/hkdf@1.2.1':
    resolution: {integrity: sha512-6oclG6Y3PiDFcoyk8srjLfVKyMfVCKJ27JwNPViuXziFpmdz+MZnZN/aKY0JGXgYuO/VghU0jcOAZgWXZ1Dmrw==}

  '@pkgjs/parseargs@0.11.0':
    resolution: {integrity: sha512-+1VkjdD0QBLPodGrJUeqarH8VAIvQODIbwh9XpP5Syisf7YoQgsJKPNFoqqLQlu+VQ/tVSshMR6loPMn8U+dPg==}
    engines: {node: '>=14'}

  '@pkgr/core@0.1.1':
    resolution: {integrity: sha512-cq8o4cWH0ibXh9VGi5P20Tu9XF/0fFXl9EUinr9QfTM7a7p0oTA4iJRCQWppXR1Pg8dSM0UCItCkPwsk9qWWYA==}
    engines: {node: ^12.20.0 || ^14.18.0 || >=16.0.0}

  '@protobufjs/aspromise@1.1.2':
    resolution: {integrity: sha512-j+gKExEuLmKwvz3OgROXtrJ2UG2x8Ch2YZUxahh+s1F2HZ+wAceUNLkvy6zKCPVRkU++ZWQrdxsUeQXmcg4uoQ==}

  '@protobufjs/base64@1.1.2':
    resolution: {integrity: sha512-AZkcAA5vnN/v4PDqKyMR5lx7hZttPDgClv83E//FMNhR2TMcLUhfRUBHCmSl0oi9zMgDDqRUJkSxO3wm85+XLg==}

  '@protobufjs/codegen@2.0.4':
    resolution: {integrity: sha512-YyFaikqM5sH0ziFZCN3xDC7zeGaB/d0IUb9CATugHWbd1FRFwWwt4ld4OYMPWu5a3Xe01mGAULCdqhMlPl29Jg==}

  '@protobufjs/eventemitter@1.1.0':
    resolution: {integrity: sha512-j9ednRT81vYJ9OfVuXG6ERSTdEL1xVsNgqpkxMsbIabzSo3goCjDIveeGv5d03om39ML71RdmrGNjG5SReBP/Q==}

  '@protobufjs/fetch@1.1.0':
    resolution: {integrity: sha512-lljVXpqXebpsijW71PZaCYeIcE5on1w5DlQy5WH6GLbFryLUrBD4932W/E2BSpfRJWseIL4v/KPgBFxDOIdKpQ==}

  '@protobufjs/float@1.0.2':
    resolution: {integrity: sha512-Ddb+kVXlXst9d+R9PfTIxh1EdNkgoRe5tOX6t01f1lYWOvJnSPDBlG241QLzcyPdoNTsblLUdujGSE4RzrTZGQ==}

  '@protobufjs/inquire@1.1.0':
    resolution: {integrity: sha512-kdSefcPdruJiFMVSbn801t4vFK7KB/5gd2fYvrxhuJYg8ILrmn9SKSX2tZdV6V+ksulWqS7aXjBcRXl3wHoD9Q==}

  '@protobufjs/path@1.1.2':
    resolution: {integrity: sha512-6JOcJ5Tm08dOHAbdR3GrvP+yUUfkjG5ePsHYczMFLq3ZmMkAD98cDgcT2iA1lJ9NVwFd4tH/iSSoe44YWkltEA==}

  '@protobufjs/pool@1.1.0':
    resolution: {integrity: sha512-0kELaGSIDBKvcgS4zkjz1PeddatrjYcmMWOlAuAPwAeccUrPHdUqo/J6LiymHHEiJT5NrF1UVwxY14f+fy4WQw==}

  '@protobufjs/utf8@1.1.0':
    resolution: {integrity: sha512-Vvn3zZrhQZkkBE8LSuW3em98c0FwgO4nxzv6OdSxPKJIEKY2bGbHn+mhGIPerzI4twdxaP8/0+06HBpwf345Lw==}

  '@radix-ui/number@1.1.0':
    resolution: {integrity: sha512-V3gRzhVNU1ldS5XhAPTom1fOIo4ccrjjJgmE+LI2h/WaFpHmx0MQApT+KZHnx8abG6Avtfcz4WoEciMnpFT3HQ==}

  '@radix-ui/primitive@1.1.1':
    resolution: {integrity: sha512-SJ31y+Q/zAyShtXJc8x83i9TYdbAfHZ++tUZnvjJJqFjzsdUnKsxPL6IEtBlxKkU7yzer//GQtZSV4GbldL3YA==}

  '@radix-ui/react-arrow@1.1.2':
    resolution: {integrity: sha512-G+KcpzXHq24iH0uGG/pF8LyzpFJYGD4RfLjCIBfGdSLXvjLHST31RUiRVrupIBMvIppMgSzQ6l66iAxl03tdlg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-collection@1.1.2':
    resolution: {integrity: sha512-9z54IEKRxIa9VityapoEYMuByaG42iSy1ZXlY2KcuLSEtq8x4987/N6m15ppoMffgZX72gER2uHe1D9Y6Unlcw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-compose-refs@1.1.1':
    resolution: {integrity: sha512-Y9VzoRDSJtgFMUCoiZBDVo084VQ5hfpXxVE+NgkdNsjiDBByiImMZKKhxMwCbdHvhlENG6a833CbFkOQvTricw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-context@1.1.1':
    resolution: {integrity: sha512-UASk9zi+crv9WteK/NU4PLvOoL3OuE6BWVKNF6hPRBtYBDXQ2u5iu3O59zUlJiTVvkyuycnqrztsHVJwcK9K+Q==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-direction@1.1.0':
    resolution: {integrity: sha512-BUuBvgThEiAXh2DWu93XsT+a3aWrGqolGlqqw5VU1kG7p/ZH2cuDlM1sRLNnY3QcBS69UIz2mcKhMxDsdewhjg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-dismissable-layer@1.1.5':
    resolution: {integrity: sha512-E4TywXY6UsXNRhFrECa5HAvE5/4BFcGyfTyK36gP+pAW1ed7UTK4vKwdr53gAJYwqbfCWC6ATvJa3J3R/9+Qrg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-focus-guards@1.1.1':
    resolution: {integrity: sha512-pSIwfrT1a6sIoDASCSpFwOasEwKTZWDw/iBdtnqKO7v6FeOzYJ7U53cPzYFVR3geGGXgVHaH+CdngrrAzqUGxg==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-focus-scope@1.1.2':
    resolution: {integrity: sha512-zxwE80FCU7lcXUGWkdt6XpTTCKPitG1XKOwViTxHVKIJhZl9MvIl2dVHeZENCWD9+EdWv05wlaEkRXUykU27RA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-id@1.1.0':
    resolution: {integrity: sha512-EJUrI8yYh7WOjNOqpoJaf1jlFIH2LvtgAl+YcFqNCa+4hj64ZXmPkAKOFs/ukjz3byN6bdb/AVUqHkI8/uWWMA==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-label@2.1.2':
    resolution: {integrity: sha512-zo1uGMTaNlHehDyFQcDZXRJhUPDuukcnHz0/jnrup0JA6qL+AFpAnty+7VKa9esuU5xTblAZzTGYJKSKaBxBhw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-popper@1.2.2':
    resolution: {integrity: sha512-Rvqc3nOpwseCyj/rgjlJDYAgyfw7OC1tTkKn2ivhaMGcYt8FSBlahHOZak2i3QwkRXUXgGgzeEe2RuqeEHuHgA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-portal@1.1.4':
    resolution: {integrity: sha512-sn2O9k1rPFYVyKd5LAJfo96JlSGVFpa1fS6UuBJfrZadudiw5tAmru+n1x7aMRQ84qDM71Zh1+SzK5QwU0tJfA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-presence@1.1.2':
    resolution: {integrity: sha512-18TFr80t5EVgL9x1SwF/YGtfG+l0BS0PRAlCWBDoBEiDQjeKgnNZRVJp/oVBl24sr3Gbfwc/Qpj4OcWTQMsAEg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-primitive@2.0.2':
    resolution: {integrity: sha512-Ec/0d38EIuvDF+GZjcMU/Ze6MxntVJYO/fRlCPhCaVUyPY9WTalHJw54tp9sXeJo3tlShWpy41vQRgLRGOuz+w==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-progress@1.1.2':
    resolution: {integrity: sha512-u1IgJFQ4zNAUTjGdDL5dcl/U8ntOR6jsnhxKb5RKp5Ozwl88xKR9EqRZOe/Mk8tnx0x5tNUe2F+MzsyjqMg0MA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-roving-focus@1.1.2':
    resolution: {integrity: sha512-zgMQWkNO169GtGqRvYrzb0Zf8NhMHS2DuEB/TiEmVnpr5OqPU3i8lfbxaAmC2J/KYuIQxyoQQ6DxepyXp61/xw==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-select@2.1.6':
    resolution: {integrity: sha512-T6ajELxRvTuAMWH0YmRJ1qez+x4/7Nq7QIx7zJ0VK3qaEWdnWpNbEDnmWldG1zBDwqrLy5aLMUWcoGirVj5kMg==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-slot@1.1.2':
    resolution: {integrity: sha512-YAKxaiGsSQJ38VzKH86/BPRC4rh+b1Jpa+JneA5LRE7skmLPNAyeG8kPJj/oo4STLvlrs8vkf/iYyc3A5stYCQ==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-switch@1.1.3':
    resolution: {integrity: sha512-1nc+vjEOQkJVsJtWPSiISGT6OKm4SiOdjMo+/icLxo2G4vxz1GntC5MzfL4v8ey9OEfw787QCD1y3mUv0NiFEQ==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-tabs@1.1.3':
    resolution: {integrity: sha512-9mFyI30cuRDImbmFF6O2KUJdgEOsGh9Vmx9x/Dh9tOhL7BngmQPQfwW4aejKm5OHpfWIdmeV6ySyuxoOGjtNng==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-tooltip@1.1.8':
    resolution: {integrity: sha512-YAA2cu48EkJZdAMHC0dqo9kialOcRStbtiY4nJPaht7Ptrhcvpo+eDChaM6BIs8kL6a8Z5l5poiqLnXcNduOkA==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/react-use-callback-ref@1.1.0':
    resolution: {integrity: sha512-CasTfvsy+frcFkbXtSJ2Zu9JHpN8TYKxkgJGWbjiZhFivxaeW7rMeZt7QELGVLaYVfFMsKHjb7Ak0nMEe+2Vfw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-controllable-state@1.1.0':
    resolution: {integrity: sha512-MtfMVJiSr2NjzS0Aa90NPTnvTSg6C/JLCV7ma0W6+OMV78vd8OyRpID+Ng9LxzsPbLeuBnWBA1Nq30AtBIDChw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-escape-keydown@1.1.0':
    resolution: {integrity: sha512-L7vwWlR1kTTQ3oh7g1O0CBF3YCyyTj8NmhLR+phShpyA50HCfBFKVJTpshm9PzLiKmehsrQzTYTpX9HvmC9rhw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-layout-effect@1.1.0':
    resolution: {integrity: sha512-+FPE0rOdziWSrH9athwI1R0HDVbWlEhd+FR+aSDk4uWGmSJ9Z54sdZVDQPZAinJhJXwfT+qnj969mCsT2gfm5w==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-previous@1.1.0':
    resolution: {integrity: sha512-Z/e78qg2YFnnXcW88A4JmTtm4ADckLno6F7OXotmkQfeuCVaKuYzqAATPhVzl3delXE7CxIV8shofPn3jPc5Og==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-rect@1.1.0':
    resolution: {integrity: sha512-0Fmkebhr6PiseyZlYAOtLS+nb7jLmpqTrJyv61Pe68MKYW6OWdRE2kI70TaYY27u7H0lajqM3hSMMLFq18Z7nQ==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-use-size@1.1.0':
    resolution: {integrity: sha512-XW3/vWuIXHa+2Uwcc2ABSfcCledmXhhQPlGbfcRXbiUQI5Icjcg19BGCZVKKInYbvUCut/ufbbLLPFC5cbb1hw==}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  '@radix-ui/react-visually-hidden@1.1.2':
    resolution: {integrity: sha512-1SzA4ns2M1aRlvxErqhLHsBHoS5eI5UUcI2awAMgGUp4LoaoWOKYmvqDY2s/tltuPkh3Yk77YF/r3IRj+Amx4Q==}
    peerDependencies:
      '@types/react': '*'
      '@types/react-dom': '*'
      react: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
      react-dom: ^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true
      '@types/react-dom':
        optional: true

  '@radix-ui/rect@1.1.0':
    resolution: {integrity: sha512-A9+lCBZoaMJlVKcRBz2YByCG+Cp2t6nAnMnNba+XiWxnj6r4JUFqfsgwocMBZU9LPtdxC6wB56ySYpc7LQIoJg==}

  '@rtsao/scc@1.1.0':
    resolution: {integrity: sha512-zt6OdqaDoOnJ1ZYsCYGt9YmWzDXl4vQdKTyJev62gFhRGKdx7mcT54V9KIjg+d2wi9EXsPvAPKe7i7WjfVWB8g==}

  '@rushstack/eslint-patch@1.10.5':
    resolution: {integrity: sha512-kkKUDVlII2DQiKy7UstOR1ErJP8kUKAQ4oa+SQtM0K+lPdmmjj0YnnxBgtTVYH7mUKtbsxeFC9y0AmK7Yb78/A==}

  '@sinclair/typebox@0.27.8':
    resolution: {integrity: sha512-+Fj43pSMwJs4KRrH/938Uf+uAELIgVBmQzg/q1YG10djyfA3TnrU8N8XzqCh/okZdszqBQTZf96idMfE5lnwTA==}

  '@socket.io/component-emitter@3.1.2':
    resolution: {integrity: sha512-9BCxFwvbGg/RsZK9tjXd8s4UcwR0MWeFQ1XEKIQVVvAGJyINdrqKMcTRyLoK8Rse1GjzLV9cwjWV1olXRWEXVA==}

  '@swc/counter@0.1.3':
    resolution: {integrity: sha512-e2BR4lsJkkRlKZ/qCHPw9ZaSxc0MVUd7gtbtaB7aMvHeJVYe8sOB8DBZkP2DtISHGSku9sCK6T6cnY0CtXrOCQ==}

  '@swc/helpers@0.5.15':
    resolution: {integrity: sha512-JQ5TuMi45Owi4/BIMAJBoSQoOJu12oOk/gADqlcUL9JEdHB8vyjUSsxqeNXnmXHjYKMi2WcYtezGEEhqUI/E2g==}

  '@t3-oss/env-core@0.10.1':
    resolution: {integrity: sha512-GcKZiCfWks5CTxhezn9k5zWX3sMDIYf6Kaxy2Gx9YEQftFcz8hDRN56hcbylyAO3t4jQnQ5ifLawINsNgCDpOg==}
    peerDependencies:
      typescript: '>=5.0.0'
      zod: ^3.0.0
    peerDependenciesMeta:
      typescript:
        optional: true

  '@t3-oss/env-nextjs@0.10.1':
    resolution: {integrity: sha512-iy2qqJLnFh1RjEWno2ZeyTu0ufomkXruUsOZludzDIroUabVvHsrSjtkHqwHp1/pgPUzN3yBRHMILW162X7x2Q==}
    peerDependencies:
      typescript: '>=5.0.0'
      zod: ^3.0.0
    peerDependenciesMeta:
      typescript:
        optional: true

  '@tanstack/query-core@5.66.0':
    resolution: {integrity: sha512-J+JeBtthiKxrpzUu7rfIPDzhscXF2p5zE/hVdrqkACBP8Yu0M96mwJ5m/8cPPYQE9aRNvXztXHlNwIh4FEeMZw==}

  '@tanstack/react-query@5.66.0':
    resolution: {integrity: sha512-z3sYixFQJe8hndFnXgWu7C79ctL+pI0KAelYyW+khaNJ1m22lWrhJU2QrsTcRKMuVPtoZvfBYrTStIdKo+x0Xw==}
    peerDependencies:
      react: ^18 || ^19

  '@trpc/client@11.0.0-rc.764':
    resolution: {integrity: sha512-6NXnOm5c4U3CYqaIzZ9YHqwyEpGj8aMVpY7jvUwvpJjX11n1j52YbwqoeuUpz1JJzYw6g23PFORD4JQanqQntQ==}
    peerDependencies:
      '@trpc/server': 11.0.0-rc.764+71c7ccc49
      typescript: '>=5.7.2'

  '@trpc/react-query@11.0.0-rc.764':
    resolution: {integrity: sha512-tl84JuhHqo+EvJ7uzJTCemIBH9qv7VUbBIJwKSGpj0zRwoQdkh3l8EIn5Kb16N2/+Hkilfc34MPSmB91VrfPNg==}
    peerDependencies:
      '@tanstack/react-query': ^5.62.8
      '@trpc/client': 11.0.0-rc.764+71c7ccc49
      '@trpc/server': 11.0.0-rc.764+71c7ccc49
      react: '>=18.2.0'
      react-dom: '>=18.2.0'
      typescript: '>=5.7.2'

  '@trpc/server@11.0.0-rc.764':
    resolution: {integrity: sha512-fwU5Oowk0d7qD4nB29Fv54FGDp2JlxJcRLJUSBmXIYCK66BlwHUcaB6lzrwy6Weqlc9nt+U5j/WsooWcFDam7A==}
    peerDependencies:
      typescript: '>=5.7.2'

  '@types/cheerio@0.22.35':
    resolution: {integrity: sha512-yD57BchKRvTV+JD53UZ6PD8KWY5g5rvvMLRnZR3EQBCZXiDT/HR+pKpMzFGlWNhFrXlo7VPZXtKvIEwZkAWOIA==}

  '@types/cookie@0.6.0':
    resolution: {integrity: sha512-4Kh9a6B2bQciAhf7FSuMRRkUWecJgJu9nPnx3yzpsfXX/c50REIqpHY4C82bXP90qrLtXtkDxTZosYO3UpOwlA==}

  '@types/cors@2.8.17':
    resolution: {integrity: sha512-8CGDvrBj1zgo2qE+oS3pOCyYNqCPryMWY2bGfwA0dcfopWGgxs+78df0Rs3rc9THP4JkOhLsAa+15VdpAqkcUA==}

  '@types/eslint@8.56.12':
    resolution: {integrity: sha512-03ruubjWyOHlmljCVoxSuNDdmfZDzsrrz0P2LeJsOXr+ZwFQ+0yQIwNCwt/GYhV7Z31fgtXJTAEs+FYlEL851g==}

  '@types/estree@1.0.6':
    resolution: {integrity: sha512-AYnb1nQyY49te+VRAVgmzfcgjYS91mY5P0TKUDCLEM+gNnA+3T6rWITXRLYCpahpqSQbN5cE+gHpnPyXjHWxcw==}

  '@types/json-schema@7.0.15':
    resolution: {integrity: sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==}

  '@types/json5@0.0.29':
    resolution: {integrity: sha512-dRLjCWHYg4oaA77cxO64oO+7JwCwnIzkZPdrrC71jQmQtlhM556pwKo5bUzqvZndkVbeFLIIi+9TC40JNF5hNQ==}

  '@types/node-fetch@2.6.12':
    resolution: {integrity: sha512-8nneRWKCg3rMtF69nLQJnOYUcbafYeFSjqkw3jCRLsqkWFlHaoQrr5mXmofFGOx3DKn7UfmBMyov8ySvLRVldA==}

  '@types/node@18.19.75':
    resolution: {integrity: sha512-UIksWtThob6ZVSyxcOqCLOUNg/dyO1Qvx4McgeuhrEtHTLFTf7BBhEazaE4K806FGTPtzd/2sE90qn4fVr7cyw==}

  '@types/node@20.17.17':
    resolution: {integrity: sha512-/WndGO4kIfMicEQLTi/mDANUu/iVUhT7KboZPdEqqHQ4aTS+3qT3U5gIqWDFV+XouorjfgGqvKILJeHhuQgFYg==}

  '@types/prop-types@15.7.14':
    resolution: {integrity: sha512-gNMvNH49DJ7OJYv+KAKn0Xp45p8PLl6zo2YnvDIbTd4J6MER2BmWN49TG7n9LvkyihINxeKW8+3bfS2yDC9dzQ==}

  '@types/react-dom@18.3.5':
    resolution: {integrity: sha512-P4t6saawp+b/dFrUr2cvkVsfvPguwsxtH6dNIYRllMsefqFzkZk5UIjzyDOv5g1dXIPdG4Sp1yCR4Z6RCUsG/Q==}
    peerDependencies:
      '@types/react': ^18.0.0

  '@types/react@18.3.18':
    resolution: {integrity: sha512-t4yC+vtgnkYjNSKlFx1jkAhH8LgTo2N/7Qvi83kdEaUtMDiwpbLAktKDaAMlRcJ5eSxZkH74eEGt1ky31d7kfQ==}

  '@types/readable-stream@4.0.18':
    resolution: {integrity: sha512-21jK/1j+Wg+7jVw1xnSwy/2Q1VgVjWuFssbYGTREPUBeZ+rqVFl2udq0IkxzPC0ZhOzVceUbyIACFZKLqKEBlA==}

  '@types/retry@0.12.0':
    resolution: {integrity: sha512-wWKOClTTiizcZhXnPY4wikVAwmdYHp8q6DmC+EJUzAMsycb7HB32Kh9RN4+0gExjmPmZSAQjgURXIGATPegAvA==}

  '@types/uuid@10.0.0':
    resolution: {integrity: sha512-7gqG38EyHgyP1S+7+xomFtL+ZNHcKv6DwNaCZmJmo1vgMugyF3TCnXVg4t1uk89mLNwnLtnY3TpOpCOyp1/xHQ==}

  '@types/validator@13.12.2':
    resolution: {integrity: sha512-6SlHBzUW8Jhf3liqrGGXyTJSIFe4nqlJ5A5KaMZ2l/vbM3Wh3KSybots/wfWVzNLK4D1NZluDlSQIbIEPx6oyA==}

  '@types/ws@8.5.14':
    resolution: {integrity: sha512-bd/YFLW+URhBzMXurx7lWByOu+xzU9+kb3RboOteXYDfW+tr+JZa99OyNmPINEGB/ahzKrEuc8rcv4gnpJmxTw==}

  '@typescript-eslint/eslint-plugin@8.24.0':
    resolution: {integrity: sha512-aFcXEJJCI4gUdXgoo/j9udUYIHgF23MFkg09LFz2dzEmU0+1Plk4rQWv/IYKvPHAtlkkGoB3m5e6oUp+JPsNaQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      '@typescript-eslint/parser': ^8.0.0 || ^8.0.0-alpha.0
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/parser@6.21.0':
    resolution: {integrity: sha512-tbsV1jPne5CkFQCgPBcDOt30ItF7aJoZL997JSF7MhGQqOeT3svWRYxiqlfA5RUdlHN6Fi+EI9bxqbdyAUZjYQ==}
    engines: {node: ^16.0.0 || >=18.0.0}
    peerDependencies:
      eslint: ^7.0.0 || ^8.0.0
      typescript: '*'
    peerDependenciesMeta:
      typescript:
        optional: true

  '@typescript-eslint/parser@8.24.0':
    resolution: {integrity: sha512-MFDaO9CYiard9j9VepMNa9MTcqVvSny2N4hkY6roquzj8pdCBRENhErrteaQuu7Yjn1ppk0v1/ZF9CG3KIlrTA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/scope-manager@6.21.0':
    resolution: {integrity: sha512-OwLUIWZJry80O99zvqXVEioyniJMa+d2GrqpUTqi5/v5D5rOrppJVBPa0yKCblcigC0/aYAzxxqQ1B+DS2RYsg==}
    engines: {node: ^16.0.0 || >=18.0.0}

  '@typescript-eslint/scope-manager@8.24.0':
    resolution: {integrity: sha512-HZIX0UByphEtdVBKaQBgTDdn9z16l4aTUz8e8zPQnyxwHBtf5vtl1L+OhH+m1FGV9DrRmoDuYKqzVrvWDcDozw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@typescript-eslint/type-utils@8.24.0':
    resolution: {integrity: sha512-8fitJudrnY8aq0F1wMiPM1UUgiXQRJ5i8tFjq9kGfRajU+dbPyOuHbl0qRopLEidy0MwqgTHDt6CnSeXanNIwA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/types@6.21.0':
    resolution: {integrity: sha512-1kFmZ1rOm5epu9NZEZm1kckCDGj5UJEf7P1kliH4LKu/RkwpsfqqGmY2OOcUs18lSlQBKLDYBOGxRVtrMN5lpg==}
    engines: {node: ^16.0.0 || >=18.0.0}

  '@typescript-eslint/types@8.24.0':
    resolution: {integrity: sha512-VacJCBTyje7HGAw7xp11q439A+zeGG0p0/p2zsZwpnMzjPB5WteaWqt4g2iysgGFafrqvyLWqq6ZPZAOCoefCw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@typescript-eslint/typescript-estree@6.21.0':
    resolution: {integrity: sha512-6npJTkZcO+y2/kr+z0hc4HwNfrrP4kNYh57ek7yCNlrBjWQ1Y0OS7jiZTkgumrvkX5HkEKXFZkkdFNkaW2wmUQ==}
    engines: {node: ^16.0.0 || >=18.0.0}
    peerDependencies:
      typescript: '*'
    peerDependenciesMeta:
      typescript:
        optional: true

  '@typescript-eslint/typescript-estree@8.24.0':
    resolution: {integrity: sha512-ITjYcP0+8kbsvT9bysygfIfb+hBj6koDsu37JZG7xrCiy3fPJyNmfVtaGsgTUSEuTzcvME5YI5uyL5LD1EV5ZQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/utils@8.24.0':
    resolution: {integrity: sha512-07rLuUBElvvEb1ICnafYWr4hk8/U7X9RDCOqd9JcAMtjh/9oRmcfN4yGzbPVirgMR0+HLVHehmu19CWeh7fsmQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/visitor-keys@6.21.0':
    resolution: {integrity: sha512-JJtkDduxLi9bivAB+cYOVMtbkqdPOhZ+ZI5LC47MIRrDV4Yn2o+ZnW10Nkmr28xRpSpdJ6Sm42Hjf2+REYXm0A==}
    engines: {node: ^16.0.0 || >=18.0.0}

  '@typescript-eslint/visitor-keys@8.24.0':
    resolution: {integrity: sha512-kArLq83QxGLbuHrTMoOEWO+l2MwsNS2TGISEdx8xgqpkbytB07XmlQyQdNDrCc1ecSqx0cnmhGvpX+VBwqqSkg==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@ungap/structured-clone@1.3.0':
    resolution: {integrity: sha512-WmoN8qaIAo7WTYWbAZuG8PYEhn5fkz7dZrqTBZ7dtt//lL2Gwms1IcnQ5yHqjDfX8Ft5j4YzDM23f87zBfDe9g==}

  '@upstash/core-analytics@0.0.10':
    resolution: {integrity: sha512-7qJHGxpQgQr9/vmeS1PktEwvNAF7TI4iJDi8Pu2CFZ9YUGHZH4fOP5TfYlZ4aVxfopnELiE4BS4FBjyK7V1/xQ==}
    engines: {node: '>=16.0.0'}

  '@upstash/ratelimit@2.0.5':
    resolution: {integrity: sha512-1FRv0cs3ZlBjCNOCpCmKYmt9BYGIJf0J0R3pucOPE88R21rL7jNjXG+I+rN/BVOvYJhI9niRAS/JaSNjiSICxA==}
    peerDependencies:
      '@upstash/redis': ^1.34.3

  '@upstash/redis@1.34.4':
    resolution: {integrity: sha512-AZx2iD5s1Pu/KCrRA7KVCffu3NSoaYnNY7N9YI7aLAYhcJfsriQKTe+8OxQWJqGqFbrvm17Lyr9HFnDLvqNpfA==}

  abort-controller@3.0.0:
    resolution: {integrity: sha512-h8lQ8tacZYnR3vNQTgibj+tODHI5/+l06Au2Pcriv/Gmet0eaj4TwWH41sO9wnHDiQsEj19q0drzdWdeAHtweg==}
    engines: {node: '>=6.5'}

  accepts@1.3.8:
    resolution: {integrity: sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==}
    engines: {node: '>= 0.6'}

  accepts@2.0.0:
    resolution: {integrity: sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==}
    engines: {node: '>= 0.6'}

  acorn-jsx@5.3.2:
    resolution: {integrity: sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==}
    peerDependencies:
      acorn: ^6.0.0 || ^7.0.0 || ^8.0.0

  acorn@8.14.0:
    resolution: {integrity: sha512-cl669nCJTZBsL97OF4kUQm5g5hC2uihk0NxY3WENAC0TYdILVkAyHymAntgxGkl7K+t0cXIrH5siy5S4XkFycA==}
    engines: {node: '>=0.4.0'}
    hasBin: true

  agentkeepalive@4.6.0:
    resolution: {integrity: sha512-kja8j7PjmncONqaTsB8fQ+wE2mSU2DJ9D4XKoJ5PFWIdRMa6SLSN1ff4mOr4jCbfRSsxR4keIiySJU0N9T5hIQ==}
    engines: {node: '>= 8.0.0'}

  ajv@6.12.6:
    resolution: {integrity: sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==}

  amqp-connection-manager@4.1.14:
    resolution: {integrity: sha512-1km47dIvEr0HhMUazqovSvNwIlSvDX2APdUpULaINtHpiki1O+cLRaTeXb/jav4OLtH+k6GBXx5gsKOT9kcGKQ==}
    engines: {node: '>=10.0.0', npm: '>5.0.0'}
    peerDependencies:
      amqplib: '*'

  amqplib@0.10.5:
    resolution: {integrity: sha512-Dx5zmy0Ur+Q7LPPdhz+jx5IzmJBoHd15tOeAfQ8SuvEtyPJ20hBemhOBA4b1WeORCRa0ENM/kHCzmem1w/zHvQ==}
    engines: {node: '>=10'}

  ansi-regex@2.1.1:
    resolution: {integrity: sha512-TIGnTpdo+E3+pCyAluZvtED5p5wCqLdezCyhPZzKPcxvFplEt4i+W7OONCKgeZFT3+y5NZZfOOS/Bdcanm1MYA==}
    engines: {node: '>=0.10.0'}

  ansi-regex@5.0.1:
    resolution: {integrity: sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==}
    engines: {node: '>=8'}

  ansi-regex@6.1.0:
    resolution: {integrity: sha512-7HSX4QQb4CspciLpVFwyRe79O3xsIZDDLER21kERQ71oaPodF8jL725AgJMFAYbooIqolJoRLuM81SpeUkpkvA==}
    engines: {node: '>=12'}

  ansi-styles@2.2.1:
    resolution: {integrity: sha512-kmCevFghRiWM7HB5zTPULl4r9bVFSWjz62MhqizDGUrq2NWuNMQyuv4tHHoKJHs69M/MF64lEcHdYIocrdWQYA==}
    engines: {node: '>=0.10.0'}

  ansi-styles@4.3.0:
    resolution: {integrity: sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==}
    engines: {node: '>=8'}

  ansi-styles@5.2.0:
    resolution: {integrity: sha512-Cxwpt2SfTzTtXcfOlzGEee8O+c+MmUgGrNiBcXnuWxuFJHe6a5Hz7qwhwe5OgaSYI0IJvkLqWX1ASG+cJOkEiA==}
    engines: {node: '>=10'}

  ansi-styles@6.2.1:
    resolution: {integrity: sha512-bN798gFfQX+viw3R7yrGWRqnrN2oRkEkUjjl4JNn4E8GxxbjtG3FbrEIIY3l8/hrwUwIeCZvi4QuOTP4MErVug==}
    engines: {node: '>=12'}

  any-promise@1.3.0:
    resolution: {integrity: sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A==}

  anymatch@3.1.3:
    resolution: {integrity: sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==}
    engines: {node: '>= 8'}

  append-field@1.0.0:
    resolution: {integrity: sha512-klpgFSWLW1ZEs8svjfb7g4qWY0YS5imI82dTg+QahUvJ8YqAY0P10Uk8tTyh9ZGuYEZEMaeJYCF5BFuX552hsw==}

  arg@5.0.2:
    resolution: {integrity: sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==}

  argparse@2.0.1:
    resolution: {integrity: sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==}

  aria-hidden@1.2.4:
    resolution: {integrity: sha512-y+CcFFwelSXpLZk/7fMB2mUbGtX9lKycf1MWJ7CaTIERyitVlyQx6C+sxcROU2BAJ24OiZyK+8wj2i8AlBoS3A==}
    engines: {node: '>=10'}

  aria-query@5.3.2:
    resolution: {integrity: sha512-COROpnaoap1E2F000S62r6A60uHZnmlvomhfyT2DlTcrY1OrBKn2UhH7qn5wTC9zMvD0AY7csdPSNwKP+7WiQw==}
    engines: {node: '>= 0.4'}

  array-buffer-byte-length@1.0.2:
    resolution: {integrity: sha512-LHE+8BuR7RYGDKvnrmcuSq3tDcKv9OFEXQt/HpbZhY7V6h0zlUXutnAD82GiFx9rdieCMjkvtcsPqBwgUl1Iiw==}
    engines: {node: '>= 0.4'}

  array-includes@3.1.8:
    resolution: {integrity: sha512-itaWrbYbqpGXkGhZPGUulwnhVf5Hpy1xiCFsGqyIGglbBxmG5vSjxQen3/WGOjPpNEv1RtBLKxbmVXm8HpJStQ==}
    engines: {node: '>= 0.4'}

  array-union@2.1.0:
    resolution: {integrity: sha512-HGyxoOTYUyCM6stUe6EJgnd4EoewAI7zMdfqO+kGjnlZmBDz/cR5pf8r/cR4Wq60sL/p0IkcjUEEPwS3GFrIyw==}
    engines: {node: '>=8'}

  array.prototype.findlast@1.2.5:
    resolution: {integrity: sha512-CVvd6FHg1Z3POpBLxO6E6zr+rSKEQ9L6rZHAaY7lLfhKsWYUBBOuMs0e9o24oopj6H+geRCX0YJ+TJLBK2eHyQ==}
    engines: {node: '>= 0.4'}

  array.prototype.findlastindex@1.2.5:
    resolution: {integrity: sha512-zfETvRFA8o7EiNn++N5f/kaCw221hrpGsDmcpndVupkPzEc1Wuf3VgC0qby1BbHs7f5DVYjgtEU2LLh5bqeGfQ==}
    engines: {node: '>= 0.4'}

  array.prototype.flat@1.3.3:
    resolution: {integrity: sha512-rwG/ja1neyLqCuGZ5YYrznA62D4mZXg0i1cIskIUKSiqF3Cje9/wXAls9B9s1Wa2fomMsIv8czB8jZcPmxCXFg==}
    engines: {node: '>= 0.4'}

  array.prototype.flatmap@1.3.3:
    resolution: {integrity: sha512-Y7Wt51eKJSyi80hFrJCePGGNo5ktJCslFuboqJsbf57CCPcm5zztluPlc4/aD8sWsKvlwatezpV4U1efk8kpjg==}
    engines: {node: '>= 0.4'}

  array.prototype.tosorted@1.1.4:
    resolution: {integrity: sha512-p6Fx8B7b7ZhL/gmUsAy0D15WhvDccw3mnGNbZpi3pmeJdxtWsj2jEaI4Y6oo3XiHfzuSgPwKc04MYt6KgvC/wA==}
    engines: {node: '>= 0.4'}

  arraybuffer.prototype.slice@1.0.4:
    resolution: {integrity: sha512-BNoCY6SXXPQ7gF2opIP4GBE+Xw7U+pHMYKuzjgCN3GwiaIR09UUeKfheyIry77QtrCBlC0KK0q5/TER/tYh3PQ==}
    engines: {node: '>= 0.4'}

  ast-types-flow@0.0.8:
    resolution: {integrity: sha512-OH/2E5Fg20h2aPrbe+QL8JZQFko0YZaF+j4mnQ7BGhfavO7OpSLa8a0y9sBwomHdSbkhTS8TQNayBfnW5DwbvQ==}

  async-function@1.0.0:
    resolution: {integrity: sha512-hsU18Ae8CDTR6Kgu9DYf0EbCr/a5iGL0rytQDobUcdpYOKokk8LEjVphnXkDkgpi0wYVsqrXuP0bZxJaTqdgoA==}
    engines: {node: '>= 0.4'}

  asynckit@0.4.0:
    resolution: {integrity: sha512-Oei9OH4tRh0YqU3GxhX79dM/mwVgvbZJaSNaRk+bshkj0S5cfHcgYakreBjrHwatXKbz+IoIdYLxrKim2MjW0Q==}

  autoprefixer@10.4.20:
    resolution: {integrity: sha512-XY25y5xSv/wEoqzDyXXME4AFfkZI0P23z6Fs3YgymDnKJkCGOnkL0iTxCa85UTqaSgfcqyf3UA6+c7wUvx/16g==}
    engines: {node: ^10 || ^12 || >=14}
    hasBin: true
    peerDependencies:
      postcss: ^8.1.0

  available-typed-arrays@1.0.7:
    resolution: {integrity: sha512-wvUjBtSGN7+7SjNpq/9M2Tg350UZD3q62IFZLbRAR1bSMlCo1ZaeW+BJ+D090e4hIIZLBcTDWe4Mh4jvUDajzQ==}
    engines: {node: '>= 0.4'}

  axe-core@4.10.2:
    resolution: {integrity: sha512-RE3mdQ7P3FRSe7eqCWoeQ/Z9QXrtniSjp1wUjt5nRC3WIpz5rSCve6o3fsZ2aCpJtrZjSZgjwXAoTO5k4tEI0w==}
    engines: {node: '>=4'}

  axobject-query@4.1.0:
    resolution: {integrity: sha512-qIj0G9wZbMGNLjLmg1PT6v2mE9AH2zlnADJD/2tC6E00hgmhUOfEB6greHPAfLRSufHqROIUTkw6E+M3lH0PTQ==}
    engines: {node: '>= 0.4'}

  balanced-match@1.0.2:
    resolution: {integrity: sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==}

  base64-js@1.5.1:
    resolution: {integrity: sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==}

  base64id@2.0.0:
    resolution: {integrity: sha512-lGe34o6EHj9y3Kts9R4ZYs/Gr+6N7MCaMlIFA3F1R2O5/m7K06AxfSeO5530PEERE6/WyEg3lsuyw4GHlPZHog==}
    engines: {node: ^4.5.0 || >= 5.9}

  binary-extensions@2.3.0:
    resolution: {integrity: sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==}
    engines: {node: '>=8'}

  bl@6.0.19:
    resolution: {integrity: sha512-4Ay3A3oDfGg3GGirhl4s62ebtnk0pJZA5mLp672MPKOQXsWvXjEF4dqdXySjJIs7b9OVr/O8aOo0Lm+xdjo2JA==}

  body-parser@2.1.0:
    resolution: {integrity: sha512-/hPxh61E+ll0Ujp24Ilm64cykicul1ypfwjVttduAiEdtnJFvLePSrIPk+HMImtNv5270wOGCb1Tns2rybMkoQ==}
    engines: {node: '>=18'}

  boolbase@1.0.0:
    resolution: {integrity: sha512-JZOSA7Mo9sNGB8+UjSgzdLtokWAky1zbztM3WRLCbZ70/3cTANmQmOdR7y2g+J0e2WXywy1yS468tY+IruqEww==}

  brace-expansion@1.1.11:
    resolution: {integrity: sha512-iCuPHDFgrHX7H2vEI/5xpz07zSHB00TpugqhmYtVmMO6518mCuRMoOYFldEBl0g187ufozdaHgWKcYFb61qGiA==}

  brace-expansion@2.0.1:
    resolution: {integrity: sha512-XnAIvQ8eM+kC6aULx6wuQiwVsnzsi9d3WxzV3FpWTGA19F621kwdbsAcFKXgKUHZWsy+mY6iL1sHTxWEFCytDA==}

  braces@3.0.3:
    resolution: {integrity: sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==}
    engines: {node: '>=8'}

  browserslist@4.24.4:
    resolution: {integrity: sha512-KDi1Ny1gSePi1vm0q4oxSF8b4DR44GF4BbmS2YdhPLOEqd8pDviZOGH/GsmRwoWJ2+5Lr085X7naowMwKHDG1A==}
    engines: {node: ^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7}
    hasBin: true

  buffer-from@1.1.2:
    resolution: {integrity: sha512-E+XQCRwSbaaiChtv6k6Dwgc+bx+Bs6vuKJHHl5kox/BaKbhiXzqQOwK4cO22yElGp2OCmjwVhT3HmxgyPGnJfQ==}

  buffer-more-ints@1.0.0:
    resolution: {integrity: sha512-EMetuGFz5SLsT0QTnXzINh4Ksr+oo4i+UGTXEshiGCQWnsgSs7ZhJ8fzlwQ+OzEMs0MpDAMr1hxnblp5a4vcHg==}

  buffer@6.0.3:
    resolution: {integrity: sha512-FTiCpNxtwiZZHEZbcbTIcZjERVICn9yq/pDFkTl95/AxzD1naBctN7YO68riM/gLSDY7sdrMby8hofADYuuqOA==}

  busboy@1.6.0:
    resolution: {integrity: sha512-8SFQbg/0hQ9xy3UNTB0YEnsNBbWfhf7RtnzpL7TkBiTBRfrQ9Fxcnz7VJsleJpyp6rVLvXiuORqjlHi5q+PYuA==}
    engines: {node: '>=10.16.0'}

  bytes@3.1.2:
    resolution: {integrity: sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==}
    engines: {node: '>= 0.8'}

  call-bind-apply-helpers@1.0.2:
    resolution: {integrity: sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==}
    engines: {node: '>= 0.4'}

  call-bind@1.0.8:
    resolution: {integrity: sha512-oKlSFMcMwpUg2ednkhQ454wfWiU/ul3CkJe/PEHcTKuiX6RpbehUiFMXu13HalGZxfUwCQzZG747YXBn1im9ww==}
    engines: {node: '>= 0.4'}

  call-bound@1.0.3:
    resolution: {integrity: sha512-YTd+6wGlNlPxSuri7Y6X8tY2dmm12UMH66RpKMhiX6rsk5wXXnYgbUcOt8kiS31/AjfoTOvCsE+w8nZQLQnzHA==}
    engines: {node: '>= 0.4'}

  callsites@3.1.0:
    resolution: {integrity: sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==}
    engines: {node: '>=6'}

  camelcase-css@2.0.1:
    resolution: {integrity: sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA==}
    engines: {node: '>= 6'}

  camelcase@6.3.0:
    resolution: {integrity: sha512-Gmy6FhYlCY7uOElZUSbxo2UCDH8owEk996gkbrpsgGtrJLM3J7jGxl9Ic7Qwwj4ivOE5AWZWRMecDdF7hqGjFA==}
    engines: {node: '>=10'}

  caniuse-lite@1.0.30001699:
    resolution: {integrity: sha512-b+uH5BakXZ9Do9iK+CkDmctUSEqZl+SP056vc5usa0PL+ev5OHw003rZXcnjNDv3L8P5j6rwT6C0BPKSikW08w==}

  chalk@1.1.3:
    resolution: {integrity: sha512-U3lRVLMSlsCfjqYPbLyVv11M9CPW4I728d6TCKMAOJueEeB9/8o+eSsMnxPJD+Q+K909sdESg7C+tIkoH6on1A==}
    engines: {node: '>=0.10.0'}

  chalk@4.1.2:
    resolution: {integrity: sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==}
    engines: {node: '>=10'}

  chart.js@4.4.7:
    resolution: {integrity: sha512-pwkcKfdzTMAU/+jNosKhNL2bHtJc/sSmYgVbuGTEDhzkrhmyihmP7vUc/5ZK9WopidMDHNe3Wm7jOd/WhuHWuw==}
    engines: {pnpm: '>=8'}

  chartjs-plugin-annotation@3.1.0:
    resolution: {integrity: sha512-EkAed6/ycXD/7n0ShrlT1T2Hm3acnbFhgkIEJLa0X+M6S16x0zwj1Fv4suv/2bwayCT3jGPdAtI9uLcAMToaQQ==}
    peerDependencies:
      chart.js: '>=4.0.0'

  cheerio-select@2.1.0:
    resolution: {integrity: sha512-9v9kG0LvzrlcungtnJtpGNxY+fzECQKhK4EGJX2vByejiMX84MFNQw4UxPJl3bFbTMw+Dfs37XaIkCwTZfLh4g==}

  cheerio@1.0.0:
    resolution: {integrity: sha512-quS9HgjQpdaXOvsZz82Oz7uxtXiy6UIsIQcpBj7HRw2M63Skasm9qlDocAM7jNuaxdhpPU7c4kJN+gA5MCu4ww==}
    engines: {node: '>=18.17'}

  chokidar@3.6.0:
    resolution: {integrity: sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==}
    engines: {node: '>= 8.10.0'}

  class-transformer@0.5.1:
    resolution: {integrity: sha512-SQa1Ws6hUbfC98vKGxZH3KFY0Y1lm5Zm0SY8XX9zbK7FJCyVEac3ATW0RIpwzW+oOfmHE5PMPufDG9hCfoEOMw==}

  class-validator@0.14.1:
    resolution: {integrity: sha512-2VEG9JICxIqTpoK1eMzZqaV+u/EiwEJkMGzTrZf6sU/fwsnOITVgYJ8yojSy6CaXtO9V0Cc6ZQZ8h8m4UBuLwQ==}

  class-variance-authority@0.7.1:
    resolution: {integrity: sha512-Ka+9Trutv7G8M6WT6SeiRWz792K5qEqIGEGzXKhAE6xOWAY6pPH8U+9IY3oCMv6kqTmLsv7Xh/2w2RigkePMsg==}

  client-only@0.0.1:
    resolution: {integrity: sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA==}

  cliui@8.0.1:
    resolution: {integrity: sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==}
    engines: {node: '>=12'}

  clsx@2.1.1:
    resolution: {integrity: sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA==}
    engines: {node: '>=6'}

  cluster-key-slot@1.1.2:
    resolution: {integrity: sha512-RMr0FhtfXemyinomL4hrWcYJxmX6deFdCxpJzhDttxgO1+bcCnkk+9drydLVDmAMG7NE6aN/fl4F7ucU/90gAA==}
    engines: {node: '>=0.10.0'}

  color-convert@2.0.1:
    resolution: {integrity: sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==}
    engines: {node: '>=7.0.0'}

  color-name@1.1.4:
    resolution: {integrity: sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==}

  color-string@1.9.1:
    resolution: {integrity: sha512-shrVawQFojnZv6xM40anx4CkoDP+fZsw/ZerEMsW/pyzsRbElpsL/DBVW7q3ExxwusdNXI3lXpuhEZkzs8p5Eg==}

  color@4.2.3:
    resolution: {integrity: sha512-1rXeuUUiGGrykh+CeBdu5Ie7OJwinCgQY0bc7GCRxy5xVHy+moaqkpL/jqQq0MtQOeYcrqEz4abc5f0KtU7W4A==}
    engines: {node: '>=12.5.0'}

  combined-stream@1.0.8:
    resolution: {integrity: sha512-FQN4MRfuJeHf7cBbBMJFXhKSDq+2kAArBlmRBvcvFE5BB1HZKXtSFASDhdlz9zOYwxh8lDdnvmMOe/+5cdoEdg==}
    engines: {node: '>= 0.8'}

  commander@4.1.1:
    resolution: {integrity: sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==}
    engines: {node: '>= 6'}

  commist@3.2.0:
    resolution: {integrity: sha512-4PIMoPniho+LqXmpS5d3NuGYncG6XWlkBSVGiWycL22dd42OYdUGil2CWuzklaJoNxyxUSpO4MKIBU94viWNAw==}

  common-tags@1.8.2:
    resolution: {integrity: sha512-gk/Z852D2Wtb//0I+kRFNKKE9dIIVirjoqPoA1wJU+XePVXZfGeBpk45+A1rKO4Q43prqWBNY/MiIeRLbPWUaA==}
    engines: {node: '>=4.0.0'}

  concat-map@0.0.1:
    resolution: {integrity: sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==}

  concat-stream@1.6.2:
    resolution: {integrity: sha512-27HBghJxjiZtIk3Ycvn/4kbJk/1uZuJFfuPEns6LaEvpvG1f0hTea8lilrouyo9mVc2GWdcEZ8OLoGmSADlrCw==}
    engines: {'0': node >= 0.8}

  concat-stream@2.0.0:
    resolution: {integrity: sha512-MWufYdFw53ccGjCA+Ol7XJYpAlW6/prSMzuPOTRnJGcGzuhLn4Scrz7qf6o8bROZ514ltazcIFJZevcfbo0x7A==}
    engines: {'0': node >= 6.0}

  consola@3.4.0:
    resolution: {integrity: sha512-EiPU8G6dQG0GFHNR8ljnZFki/8a+cQwEQ+7wpxdChl02Q8HXlwEZWD5lqAF8vC2sEC3Tehr8hy7vErz88LHyUA==}
    engines: {node: ^14.18.0 || >=16.10.0}

  console-table-printer@2.12.1:
    resolution: {integrity: sha512-wKGOQRRvdnd89pCeH96e2Fn4wkbenSP6LMHfjfyNLMbGuHEFbMqQNuxXqd0oXG9caIOQ1FTvc5Uijp9/4jujnQ==}

  content-disposition@1.0.0:
    resolution: {integrity: sha512-Au9nRL8VNUut/XSzbQA38+M78dzP4D+eqg3gfJHMIHHYa3bg067xj1KxMUWj+VULbiZMowKngFFbKczUrNJ1mg==}
    engines: {node: '>= 0.6'}

  content-type@1.0.5:
    resolution: {integrity: sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==}
    engines: {node: '>= 0.6'}

  cookie-signature@1.2.2:
    resolution: {integrity: sha512-D76uU73ulSXrD1UXF4KE2TMxVVwhsnCgfAyTg9k8P6KGZjlXKrOLe4dJQKI3Bxi5wjesZoFXJWElNWBjPZMbhg==}
    engines: {node: '>=6.6.0'}

  cookie@0.7.1:
    resolution: {integrity: sha512-6DnInpx7SJ2AK3+CTUE/ZM0vWTUboZCegxhC2xiIydHR9jNuTAASBrfEpHhiGOZw/nX51bHt6YQl8jsGo4y/0w==}
    engines: {node: '>= 0.6'}

  cookie@0.7.2:
    resolution: {integrity: sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==}
    engines: {node: '>= 0.6'}

  copy-anything@3.0.5:
    resolution: {integrity: sha512-yCEafptTtb4bk7GLEQoM8KVJpxAfdBJYaXyzQEgQQQgYrZiDp8SJmGKlYza6CYjEDNstAdNdKA3UuoULlEbS6w==}
    engines: {node: '>=12.13'}

  core-util-is@1.0.3:
    resolution: {integrity: sha512-ZQBvi1DcpJ4GDqanjucZ2Hj3wEO5pZDS89BWbkcrvdxksJorwUDDZamX9ldFkp9aw2lmBDLgkObEA4DWNJ9FYQ==}

  cors@2.8.5:
    resolution: {integrity: sha512-KIHbLJqu73RGr/hnbrO9uBeixNGuvSQjul/jdFvS/KFSIH1hWVd1ng7zOHx+YrEfInLG7q4n6GHQ9cDtxv/P6g==}
    engines: {node: '>= 0.10'}

  cross-spawn@7.0.6:
    resolution: {integrity: sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==}
    engines: {node: '>= 8'}

  crypto-js@4.2.0:
    resolution: {integrity: sha512-KALDyEYgpY+Rlob/iriUtjV6d5Eq+Y191A5g4UqLAi8CyGP9N1+FdVbkc1SxKc2r4YAYqG8JzO2KGL+AizD70Q==}

  css-select@5.1.0:
    resolution: {integrity: sha512-nwoRF1rvRRnnCqqY7updORDsuqKzqYJ28+oSMaJMMgOauh3fvwHqMS7EZpIPqK8GL+g9mKxF1vP/ZjSeNjEVHg==}

  css-what@6.1.0:
    resolution: {integrity: sha512-HTUrgRJ7r4dsZKU6GjmpfRK1O76h97Z8MfS1G0FozR+oF2kG6Vfe8JE6zwrkbxigziPHinCJ+gCPjA9EaBDtRw==}
    engines: {node: '>= 6'}

  cssesc@3.0.0:
    resolution: {integrity: sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg==}
    engines: {node: '>=4'}
    hasBin: true

  csstype@3.1.3:
    resolution: {integrity: sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw==}

  damerau-levenshtein@1.0.8:
    resolution: {integrity: sha512-sdQSFB7+llfUcQHUQO3+B8ERRj0Oa4w9POWMI/puGtuf7gFywGmkaLCElnudfTiKZV+NvHqL0ifzdrI8Ro7ESA==}

  data-view-buffer@1.0.2:
    resolution: {integrity: sha512-EmKO5V3OLXh1rtK2wgXRansaK1/mtVdTUEiEI0W8RkvgT05kfxaH29PliLnpLP73yYO6142Q72QNa8Wx/A5CqQ==}
    engines: {node: '>= 0.4'}

  data-view-byte-length@1.0.2:
    resolution: {integrity: sha512-tuhGbE6CfTM9+5ANGf+oQb72Ky/0+s3xKUpHvShfiz2RxMFgFPjsXuRLBVMtvMs15awe45SRb83D6wH4ew6wlQ==}
    engines: {node: '>= 0.4'}

  data-view-byte-offset@1.0.1:
    resolution: {integrity: sha512-BS8PfmtDGnrgYdOonGZQdLZslWIeCGFP9tpan0hi1Co2Zr2NKADsvGYA8XxuG/4UWgJ6Cjtv+YJnB6MM69QGlQ==}
    engines: {node: '>= 0.4'}

  debug@2.6.9:
    resolution: {integrity: sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@3.2.7:
    resolution: {integrity: sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@4.3.6:
    resolution: {integrity: sha512-O/09Bd4Z1fBrU4VzkhFqVgpPzaGbw6Sm9FEkBT1A/YBXQFGuuSxa1dN2nxgxS34JmKXqYx8CZAwEVoJFImUXIg==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@4.3.7:
    resolution: {integrity: sha512-Er2nc/H7RrMXZBFCEim6TCmMk02Z8vLC2Rbi1KEBggpo0fS6l0S1nnapwmIi3yW/+GOJap1Krg4w0Hg80oCqgQ==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@4.4.0:
    resolution: {integrity: sha512-6WTZ/IxCY/T6BALoZHaE4ctp9xm+Z5kY/pzYaCHRFeyVhojxlrm+46y68HA6hr0TcwEssoxNiDEUJQjfPZ/RYA==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  decamelize@1.2.0:
    resolution: {integrity: sha512-z2S+W9X73hAUUki+N+9Za2lBlun89zigOyGrsax+KUQ6wKW4ZoWpEYBkGhQjwAjjDCkWxhY0VKEhk8wzY7F5cA==}
    engines: {node: '>=0.10.0'}

  deep-is@0.1.4:
    resolution: {integrity: sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==}

  define-data-property@1.1.4:
    resolution: {integrity: sha512-rBMvIzlpA8v6E+SJZoo++HAYqsLrkg7MSfIinMPFhmkorw7X+dOXVJQs+QT69zGkzMyfDnIMN2Wid1+NbL3T+A==}
    engines: {node: '>= 0.4'}

  define-properties@1.2.1:
    resolution: {integrity: sha512-8QmQKqEASLd5nx0U1B1okLElbUuuttJ/AnYmRXbbbGDWh6uS208EjD4Xqq/I9wK7u0v6O08XhTWnt5XtEbR6Dg==}
    engines: {node: '>= 0.4'}

  delayed-stream@1.0.0:
    resolution: {integrity: sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ==}
    engines: {node: '>=0.4.0'}

  denque@2.1.0:
    resolution: {integrity: sha512-HVQE3AAb/pxF8fQAoiqpvg9i3evqug3hoiwakOyZAwJm+6vZehbkYXZ0l4JxS+I3QxM97v5aaRNhj8v5oBhekw==}
    engines: {node: '>=0.10'}

  depd@2.0.0:
    resolution: {integrity: sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==}
    engines: {node: '>= 0.8'}

  destroy@1.2.0:
    resolution: {integrity: sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==}
    engines: {node: '>= 0.8', npm: 1.2.8000 || >= 1.4.16}

  detect-libc@2.0.3:
    resolution: {integrity: sha512-bwy0MGW55bG41VqxxypOsdSdGqLwXPI/focwgTYCFMbdUiBAxLg9CFzG08sz2aqzknwiX7Hkl0bQENjg8iLByw==}
    engines: {node: '>=8'}

  detect-node-es@1.1.0:
    resolution: {integrity: sha512-ypdmJU/TbBby2Dxibuv7ZLW3Bs1QEmM7nHjEANfohJLvE0XVujisn1qPJcZxg+qDucsr+bP6fLD1rPS3AhJ7EQ==}

  didyoumean@1.2.2:
    resolution: {integrity: sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw==}

  dir-glob@3.0.1:
    resolution: {integrity: sha512-WkrWp9GR4KXfKGYzOLmTuGVi1UWFfws377n9cc55/tb6DuqyF6pcQ5AbiHEshaDpY9v6oaSr2XCDidGmMwdzIA==}
    engines: {node: '>=8'}

  dlv@1.1.3:
    resolution: {integrity: sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA==}

  doctrine@2.1.0:
    resolution: {integrity: sha512-35mSku4ZXK0vfCuHEDAwt55dg2jNajHZ1odvF+8SSr82EsZY4QmXfuWso8oEd8zRhVObSN18aM0CjSdoBX7zIw==}
    engines: {node: '>=0.10.0'}

  doctrine@3.0.0:
    resolution: {integrity: sha512-yS+Q5i3hBf7GBkd4KG8a7eBNNWNGLTaEwwYWUijIYM7zrlYDM0BFXHjjPWlWZ1Rg7UaddZeIDmi9jF3HmqiQ2w==}
    engines: {node: '>=6.0.0'}

  dom-serializer@2.0.0:
    resolution: {integrity: sha512-wIkAryiqt/nV5EQKqQpo3SToSOV9J0DnbJqwK7Wv/Trc92zIAYZ4FlMu+JPFW1DfGFt81ZTCGgDEabffXeLyJg==}

  domelementtype@2.3.0:
    resolution: {integrity: sha512-OLETBj6w0OsagBwdXnPdN0cnMfF9opN69co+7ZrbfPGrdpPVNBUj02spi6B1N7wChLQiPn4CSH/zJvXw56gmHw==}

  domhandler@5.0.3:
    resolution: {integrity: sha512-cgwlv/1iFQiFnU96XXgROh8xTeetsnJiDsTc7TYCLFd9+/WNkIqPTxiM/8pSd8VIrhXGTf1Ny1q1hquVqDJB5w==}
    engines: {node: '>= 4'}

  domutils@3.2.2:
    resolution: {integrity: sha512-6kZKyUajlDuqlHKVX1w7gyslj9MPIXzIFiz/rGu35uC1wMi+kMhQwGhl4lt9unC9Vb9INnY9Z3/ZA3+FhASLaw==}

  drizzle-kit@0.24.2:
    resolution: {integrity: sha512-nXOaTSFiuIaTMhS8WJC2d4EBeIcN9OSt2A2cyFbQYBAZbi7lRsVGJNqDpEwPqYfJz38yxbY/UtbvBBahBfnExQ==}
    hasBin: true

  drizzle-orm@0.33.0:
    resolution: {integrity: sha512-SHy72R2Rdkz0LEq0PSG/IdvnT3nGiWuRk+2tXZQ90GVq/XQhpCzu/EFT3V2rox+w8MlkBQxifF8pCStNYnERfA==}
    peerDependencies:
      '@aws-sdk/client-rds-data': '>=3'
      '@cloudflare/workers-types': '>=3'
      '@electric-sql/pglite': '>=0.1.1'
      '@libsql/client': '*'
      '@neondatabase/serverless': '>=0.1'
      '@op-engineering/op-sqlite': '>=2'
      '@opentelemetry/api': ^1.4.1
      '@planetscale/database': '>=1'
      '@prisma/client': '*'
      '@tidbcloud/serverless': '*'
      '@types/better-sqlite3': '*'
      '@types/pg': '*'
      '@types/react': '>=18'
      '@types/sql.js': '*'
      '@vercel/postgres': '>=0.8.0'
      '@xata.io/client': '*'
      better-sqlite3: '>=7'
      bun-types: '*'
      expo-sqlite: '>=13.2.0'
      knex: '*'
      kysely: '*'
      mysql2: '>=2'
      pg: '>=8'
      postgres: '>=3'
      prisma: '*'
      react: '>=18'
      sql.js: '>=1'
      sqlite3: '>=5'
    peerDependenciesMeta:
      '@aws-sdk/client-rds-data':
        optional: true
      '@cloudflare/workers-types':
        optional: true
      '@electric-sql/pglite':
        optional: true
      '@libsql/client':
        optional: true
      '@neondatabase/serverless':
        optional: true
      '@op-engineering/op-sqlite':
        optional: true
      '@opentelemetry/api':
        optional: true
      '@planetscale/database':
        optional: true
      '@prisma/client':
        optional: true
      '@tidbcloud/serverless':
        optional: true
      '@types/better-sqlite3':
        optional: true
      '@types/pg':
        optional: true
      '@types/react':
        optional: true
      '@types/sql.js':
        optional: true
      '@vercel/postgres':
        optional: true
      '@xata.io/client':
        optional: true
      better-sqlite3:
        optional: true
      bun-types:
        optional: true
      expo-sqlite:
        optional: true
      knex:
        optional: true
      kysely:
        optional: true
      mysql2:
        optional: true
      pg:
        optional: true
      postgres:
        optional: true
      prisma:
        optional: true
      react:
        optional: true
      sql.js:
        optional: true
      sqlite3:
        optional: true

  dunder-proto@1.0.1:
    resolution: {integrity: sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==}
    engines: {node: '>= 0.4'}

  eastasianwidth@0.2.0:
    resolution: {integrity: sha512-I88TYZWc9XiYHRQ4/3c5rjjfgkjhLyW2luGIheGERbNQ6OY7yTybanSpDXZa8y7VUP9YmDcYa+eyq4ca7iLqWA==}

  ee-first@1.1.1:
    resolution: {integrity: sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==}

  electron-to-chromium@1.5.97:
    resolution: {integrity: sha512-HKLtaH02augM7ZOdYRuO19rWDeY+QSJ1VxnXFa/XDFLf07HvM90pALIJFgrO+UVaajI3+aJMMpojoUTLZyQ7JQ==}

  emoji-regex@8.0.0:
    resolution: {integrity: sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==}

  emoji-regex@9.2.2:
    resolution: {integrity: sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==}

  encodeurl@1.0.2:
    resolution: {integrity: sha512-TPJXq8JqFaVYm2CWmPvnP2Iyo4ZSM7/QKcSmuMLDObfpH5fi7RUGmd/rTDf+rut/saiDiQEeVTNgAmJEdAOx0w==}
    engines: {node: '>= 0.8'}

  encodeurl@2.0.0:
    resolution: {integrity: sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==}
    engines: {node: '>= 0.8'}

  encoding-sniffer@0.2.0:
    resolution: {integrity: sha512-ju7Wq1kg04I3HtiYIOrUrdfdDvkyO9s5XM8QAj/bN61Yo/Vb4vgJxy5vi4Yxk01gWHbrofpPtpxM8bKger9jhg==}

  engine.io-parser@5.2.3:
    resolution: {integrity: sha512-HqD3yTBfnBxIrbnM1DoD6Pcq8NECnh8d4As1Qgh0z5Gg3jRRIqijury0CL3ghu/edArpUYiYqQiDUQBIs4np3Q==}
    engines: {node: '>=10.0.0'}

  engine.io@6.6.4:
    resolution: {integrity: sha512-ZCkIjSYNDyGn0R6ewHDtXgns/Zre/NT6Agvq1/WobF7JXgFff4SeDroKiCO3fNJreU9YG429Sc81o4w5ok/W5g==}
    engines: {node: '>=10.2.0'}

  enhanced-resolve@5.18.1:
    resolution: {integrity: sha512-ZSW3ma5GkcQBIpwZTSRAI8N71Uuwgs93IezB7mf7R60tC8ZbJideoDNKjHn2O9KIlx6rkGTTEk1xUCK2E1Y2Yg==}
    engines: {node: '>=10.13.0'}

  entities@4.5.0:
    resolution: {integrity: sha512-V0hjH4dGPh9Ao5p0MoRY6BVqtwCjhz6vI5LT8AJ55H+4g9/4vbHx1I54fS0XuclLhDHArPQCiMjDxjaL8fPxhw==}
    engines: {node: '>=0.12'}

  es-abstract@1.23.9:
    resolution: {integrity: sha512-py07lI0wjxAC/DcfK1S6G7iANonniZwTISvdPzk9hzeH0IZIshbuuFxLIU96OyF89Yb9hiqWn8M/bY83KY5vzA==}
    engines: {node: '>= 0.4'}

  es-define-property@1.0.1:
    resolution: {integrity: sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==}
    engines: {node: '>= 0.4'}

  es-errors@1.3.0:
    resolution: {integrity: sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==}
    engines: {node: '>= 0.4'}

  es-iterator-helpers@1.2.1:
    resolution: {integrity: sha512-uDn+FE1yrDzyC0pCo961B2IHbdM8y/ACZsKD4dG6WqrjV53BADjwa7D+1aom2rsNVfLyDgU/eigvlJGJ08OQ4w==}
    engines: {node: '>= 0.4'}

  es-object-atoms@1.1.1:
    resolution: {integrity: sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==}
    engines: {node: '>= 0.4'}

  es-set-tostringtag@2.1.0:
    resolution: {integrity: sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==}
    engines: {node: '>= 0.4'}

  es-shim-unscopables@1.1.0:
    resolution: {integrity: sha512-d9T8ucsEhh8Bi1woXCf+TIKDIROLG5WCkxg8geBCbvk22kzwC5G2OnXVMO6FUsvQlgUUXQ2itephWDLqDzbeCw==}
    engines: {node: '>= 0.4'}

  es-to-primitive@1.3.0:
    resolution: {integrity: sha512-w+5mJ3GuFL+NjVtJlvydShqE1eN3h3PbI7/5LAsYJP/2qtuMXjfL2LpHSRqo4b4eSF5K/DH1JXKUAHSB2UW50g==}
    engines: {node: '>= 0.4'}

  esbuild-register@3.6.0:
    resolution: {integrity: sha512-H2/S7Pm8a9CL1uhp9OvjwrBh5Pvx0H8qVOxNu8Wed9Y7qv56MPtq+GGM8RJpq6glYJn9Wspr8uw7l55uyinNeg==}
    peerDependencies:
      esbuild: '>=0.12 <1'

  esbuild@0.18.20:
    resolution: {integrity: sha512-ceqxoedUrcayh7Y7ZX6NdbbDzGROiyVBgC4PriJThBKSVPWnnFHZAkfI1lJT8QFkOwH4qOS2SJkS4wvpGl8BpA==}
    engines: {node: '>=12'}
    hasBin: true

  esbuild@0.19.12:
    resolution: {integrity: sha512-aARqgq8roFBj054KvQr5f1sFu0D65G+miZRCuJyJ0G13Zwx7vRar5Zhn2tkQNzIXcBrNVsv/8stehpj+GAjgbg==}
    engines: {node: '>=12'}
    hasBin: true

  escalade@3.2.0:
    resolution: {integrity: sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==}
    engines: {node: '>=6'}

  escape-html@1.0.3:
    resolution: {integrity: sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==}

  escape-string-regexp@1.0.5:
    resolution: {integrity: sha512-vbRorB5FUQWvla16U8R/qgaFIya2qGzwDrNmCZuYKrbdSUMG6I1ZCGQRefkRVhuOkIGVne7BQ35DSfo1qvJqFg==}
    engines: {node: '>=0.8.0'}

  escape-string-regexp@4.0.0:
    resolution: {integrity: sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==}
    engines: {node: '>=10'}

  eslint-config-next@15.1.7:
    resolution: {integrity: sha512-zXoMnYUIy3XHaAoOhrcYkT9UQWvXqWju2K7NNsmb5wd/7XESDwof61eUdW4QhERr3eJ9Ko/vnXqIrj8kk/drYw==}
    peerDependencies:
      eslint: ^7.23.0 || ^8.0.0 || ^9.0.0
      typescript: '>=3.3.1'
    peerDependenciesMeta:
      typescript:
        optional: true

  eslint-config-prettier@10.0.1:
    resolution: {integrity: sha512-lZBts941cyJyeaooiKxAtzoPHTN+GbQTJFAIdQbRhA4/8whaAraEh47Whw/ZFfrjNSnlAxqfm9i0XVAEkULjCw==}
    hasBin: true
    peerDependencies:
      eslint: '>=7.0.0'

  eslint-import-resolver-node@0.3.9:
    resolution: {integrity: sha512-WFj2isz22JahUv+B788TlO3N6zL3nNJGU8CcZbPZvVEkBPaJdCV4vy5wyghty5ROFbCRnm132v8BScu5/1BQ8g==}

  eslint-import-resolver-typescript@3.7.0:
    resolution: {integrity: sha512-Vrwyi8HHxY97K5ebydMtffsWAn1SCR9eol49eCd5fJS4O1WV7PaAjbcjmbfJJSMz/t4Mal212Uz/fQZrOB8mow==}
    engines: {node: ^14.18.0 || >=16.0.0}
    peerDependencies:
      eslint: '*'
      eslint-plugin-import: '*'
      eslint-plugin-import-x: '*'
    peerDependenciesMeta:
      eslint-plugin-import:
        optional: true
      eslint-plugin-import-x:
        optional: true

  eslint-module-utils@2.12.0:
    resolution: {integrity: sha512-wALZ0HFoytlyh/1+4wuZ9FJCD/leWHQzzrxJ8+rebyReSLk7LApMyd3WJaLVoN+D5+WIdJyDK1c6JnE65V4Zyg==}
    engines: {node: '>=4'}
    peerDependencies:
      '@typescript-eslint/parser': '*'
      eslint: '*'
      eslint-import-resolver-node: '*'
      eslint-import-resolver-typescript: '*'
      eslint-import-resolver-webpack: '*'
    peerDependenciesMeta:
      '@typescript-eslint/parser':
        optional: true
      eslint:
        optional: true
      eslint-import-resolver-node:
        optional: true
      eslint-import-resolver-typescript:
        optional: true
      eslint-import-resolver-webpack:
        optional: true

  eslint-plugin-drizzle@0.2.3:
    resolution: {integrity: sha512-BO+ymHo33IUNoJlC0rbd7HP9EwwpW4VIp49R/tWQF/d2E1K2kgTf0tCXT0v9MSiBr6gGR1LtPwMLapTKEWSg9A==}
    peerDependencies:
      eslint: '>=8.0.0'

  eslint-plugin-import@2.31.0:
    resolution: {integrity: sha512-ixmkI62Rbc2/w8Vfxyh1jQRTdRTF52VxwRVHl/ykPAmqG+Nb7/kNn+byLP0LxPgI7zWA16Jt82SybJInmMia3A==}
    engines: {node: '>=4'}
    peerDependencies:
      '@typescript-eslint/parser': '*'
      eslint: ^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9
    peerDependenciesMeta:
      '@typescript-eslint/parser':
        optional: true

  eslint-plugin-jsx-a11y@6.10.2:
    resolution: {integrity: sha512-scB3nz4WmG75pV8+3eRUQOHZlNSUhFNq37xnpgRkCCELU3XMvXAxLk1eqWWyE22Ki4Q01Fnsw9BA3cJHDPgn2Q==}
    engines: {node: '>=4.0'}
    peerDependencies:
      eslint: ^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9

  eslint-plugin-prettier@5.2.3:
    resolution: {integrity: sha512-qJ+y0FfCp/mQYQ/vWQ3s7eUlFEL4PyKfAJxsnYTJ4YT73nsJBWqmEpFryxV9OeUiqmsTsYJ5Y+KDNaeP31wrRw==}
    engines: {node: ^14.18.0 || >=16.0.0}
    peerDependencies:
      '@types/eslint': '>=8.0.0'
      eslint: '>=8.0.0'
      eslint-config-prettier: '*'
      prettier: '>=3.0.0'
    peerDependenciesMeta:
      '@types/eslint':
        optional: true
      eslint-config-prettier:
        optional: true

  eslint-plugin-react-hooks@5.1.0:
    resolution: {integrity: sha512-mpJRtPgHN2tNAvZ35AMfqeB3Xqeo273QxrHJsbBEPWODRM4r0yB6jfoROqKEYrOn27UtRPpcpHc2UqyBSuUNTw==}
    engines: {node: '>=10'}
    peerDependencies:
      eslint: ^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0

  eslint-plugin-react@7.37.4:
    resolution: {integrity: sha512-BGP0jRmfYyvOyvMoRX/uoUeW+GqNj9y16bPQzqAHf3AYII/tDs+jMN0dBVkl88/OZwNGwrVFxE7riHsXVfy/LQ==}
    engines: {node: '>=4'}
    peerDependencies:
      eslint: ^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7

  eslint-scope@7.2.2:
    resolution: {integrity: sha512-dOt21O7lTMhDM+X9mB4GX+DZrZtCUJPL/wlcTqxyrx5IvO0IYtILdtrQGQp+8n5S0gwSVmOf9NQrjMOgfQZlIg==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}

  eslint-visitor-keys@3.4.3:
    resolution: {integrity: sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}

  eslint-visitor-keys@4.2.0:
    resolution: {integrity: sha512-UyLnSehNt62FFhSwjZlHmeokpRK59rcz29j+F1/aDgbkbRTk7wIc9XzdoasMUbRNKDM0qQt/+BJ4BrpFeABemw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  eslint@8.57.1:
    resolution: {integrity: sha512-ypowyDxpVSYpkXr9WPv2PAZCtNip1Mv5KTW0SCurXv/9iOpcrH9PaqUElksqEB6pChqHGDRCFTyrZlGhnLNGiA==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
    deprecated: This version is no longer supported. Please see https://eslint.org/version-support for other options.
    hasBin: true

  espree@9.6.1:
    resolution: {integrity: sha512-oruZaFkjorTpF32kDSI5/75ViwGeZginGGy2NoOSg3Q9bnwlnmDm4HLnkl0RE3n+njDXR037aY1+x58Z/zFdwQ==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}

  esquery@1.6.0:
    resolution: {integrity: sha512-ca9pw9fomFcKPvFLXhBKUK90ZvGibiGOvRJNbjljY7s7uq/5YO4BOzcYtJqExdx99rF6aAcnRxHmcUHcz6sQsg==}
    engines: {node: '>=0.10'}

  esrecurse@4.3.0:
    resolution: {integrity: sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==}
    engines: {node: '>=4.0'}

  estraverse@5.3.0:
    resolution: {integrity: sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==}
    engines: {node: '>=4.0'}

  esutils@2.0.3:
    resolution: {integrity: sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==}
    engines: {node: '>=0.10.0'}

  etag@1.8.1:
    resolution: {integrity: sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==}
    engines: {node: '>= 0.6'}

  event-target-shim@5.0.1:
    resolution: {integrity: sha512-i/2XbnSz/uxRCU6+NdVJgKWDTM427+MqYbkQzD321DuCQJUqOuJKIA0IM2+W2xtYHdKOmZ4dR6fExsd4SXL+WQ==}
    engines: {node: '>=6'}

  eventemitter3@4.0.7:
    resolution: {integrity: sha512-8guHBZCwKnFhYdHr2ysuRWErTwhoN2X8XELRlrRwpmfeY2jjuUN4taQMsULKUVo1K4DvZl+0pgfyoysHxvmvEw==}

  events@3.3.0:
    resolution: {integrity: sha512-mQw+2fkQbALzQ7V0MY0IqdnXNOeTtP4r0lN9z7AAawCXgqea7bDii20AYrIBrFd/Hx0M2Ocz6S111CaFkUcb0Q==}
    engines: {node: '>=0.8.x'}

  express@5.0.1:
    resolution: {integrity: sha512-ORF7g6qGnD+YtUG9yx4DFoqCShNMmUKiXuT5oWMHiOvt/4WFbHC6yCwQMTSBMno7AqntNCAzzcnnjowRkTL9eQ==}
    engines: {node: '>= 18'}

  fast-deep-equal@3.1.3:
    resolution: {integrity: sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==}

  fast-diff@1.3.0:
    resolution: {integrity: sha512-VxPP4NqbUjj6MaAOafWeUn2cXWLcCtljklUtZf0Ind4XQ+QPtmA0b18zZy0jIQx+ExRVCR/ZQpBmik5lXshNsw==}

  fast-glob@3.3.1:
    resolution: {integrity: sha512-kNFPyjhh5cKjrUltxs+wFx+ZkbRaxxmZ+X0ZU31SOsxCEtP9VPgtq2teZw1DebupL5GmDaNQ6yKMMVcM41iqDg==}
    engines: {node: '>=8.6.0'}

  fast-glob@3.3.3:
    resolution: {integrity: sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg==}
    engines: {node: '>=8.6.0'}

  fast-json-stable-stringify@2.1.0:
    resolution: {integrity: sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==}

  fast-levenshtein@2.0.6:
    resolution: {integrity: sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==}

  fast-safe-stringify@2.1.1:
    resolution: {integrity: sha512-W+KJc2dmILlPplD/H4K9l9LcAHAfPtP6BY84uVLXQ6Evcz9Lcg33Y2z1IVblT6xdY54PXYVHEv+0Wpq8Io6zkA==}

  fast-unique-numbers@8.0.13:
    resolution: {integrity: sha512-7OnTFAVPefgw2eBJ1xj2PGGR9FwYzSUso9decayHgCDX4sJkHLdcsYTytTg+tYv+wKF3U8gJuSBz2jJpQV4u/g==}
    engines: {node: '>=16.1.0'}

  fastq@1.19.0:
    resolution: {integrity: sha512-7SFSRCNjBQIZH/xZR3iy5iQYR8aGBE0h3VG6/cwlbrpdciNYBMotQav8c1XI3HjHH+NikUpP53nPdlZSdWmFzA==}

  file-entry-cache@6.0.1:
    resolution: {integrity: sha512-7Gps/XWymbLk2QLYK4NzpMOrYjMhdIxXuIvy2QBsLE6ljuodKvdkWs/cpyJJ3CVIVpH0Oi1Hvg1ovbMzLdFBBg==}
    engines: {node: ^10.12.0 || >=12.0.0}

  fill-range@7.1.1:
    resolution: {integrity: sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==}
    engines: {node: '>=8'}

  finalhandler@2.0.0:
    resolution: {integrity: sha512-MX6Zo2adDViYh+GcxxB1dpO43eypOGUOL12rLCOTMQv/DfIbpSJUy4oQIIZhVZkH9e+bZWKMon0XHFEju16tkQ==}
    engines: {node: '>= 0.8'}

  find-up@5.0.0:
    resolution: {integrity: sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==}
    engines: {node: '>=10'}

  flat-cache@3.2.0:
    resolution: {integrity: sha512-CYcENa+FtcUKLmhhqyctpclsq7QF38pKjZHsGNiSQF5r4FtoKDWabFDl3hzaEQMvT1LHEysw5twgLvpYYb4vbw==}
    engines: {node: ^10.12.0 || >=12.0.0}

  flatted@3.3.2:
    resolution: {integrity: sha512-AiwGJM8YcNOaobumgtng+6NHuOqC3A7MixFeDafM3X9cIUM+xUXoS5Vfgf+OihAYe20fxqNM9yPBXJzRtZ/4eA==}

  for-each@0.3.5:
    resolution: {integrity: sha512-dKx12eRCVIzqCxFGplyFKJMPvLEWgmNtUrpTiJIR5u97zEhRG8ySrtboPHZXx7daLxQVrl643cTzbab2tkQjxg==}
    engines: {node: '>= 0.4'}

  foreground-child@3.3.0:
    resolution: {integrity: sha512-Ld2g8rrAyMYFXBhEqMz8ZAHBi4J4uS1i/CxGMDnjyFWddMXLVcDp051DZfu+t7+ab7Wv6SMqpWmyFIj5UbfFvg==}
    engines: {node: '>=14'}

  form-data-encoder@1.7.2:
    resolution: {integrity: sha512-qfqtYan3rxrnCk1VYaA4H+Ms9xdpPqvLZa6xmMgFvhO32x7/3J/ExcTd6qpxM0vH2GdMI+poehyBZvqfMTto8A==}

  form-data@4.0.1:
    resolution: {integrity: sha512-tzN8e4TX8+kkxGPK8D5u0FNmjPUjw3lwC9lSLxxoB/+GtsJG91CO8bSWy73APlgAZzZbXEYZJuxjkHH2w+Ezhw==}
    engines: {node: '>= 6'}

  formdata-node@4.4.1:
    resolution: {integrity: sha512-0iirZp3uVDjVGt9p49aTaqjk84TrglENEDuqfdlZQ1roC9CWlPk6Avf8EEnZNcAqPonwkG35x4n3ww/1THYAeQ==}
    engines: {node: '>= 12.20'}

  forwarded@0.2.0:
    resolution: {integrity: sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==}
    engines: {node: '>= 0.6'}

  fraction.js@4.3.7:
    resolution: {integrity: sha512-ZsDfxO51wGAXREY55a7la9LScWpwv9RxIrYABrlvOFBlH/ShPnrtsXeuUIfXKKOVicNxQ+o8JTbJvjS4M89yew==}

  fresh@0.5.2:
    resolution: {integrity: sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==}
    engines: {node: '>= 0.6'}

  fresh@2.0.0:
    resolution: {integrity: sha512-Rx/WycZ60HOaqLKAi6cHRKKI7zxWbJ31MhntmtwMoaTeF7XFH9hhBp8vITaMidfljRQ6eYWCKkaTK+ykVJHP2A==}
    engines: {node: '>= 0.8'}

  fs.realpath@1.0.0:
    resolution: {integrity: sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw==}

  fsevents@2.3.3:
    resolution: {integrity: sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==}
    engines: {node: ^8.16.0 || ^10.6.0 || >=11.0.0}
    os: [darwin]

  function-bind@1.1.2:
    resolution: {integrity: sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==}

  function.prototype.name@1.1.8:
    resolution: {integrity: sha512-e5iwyodOHhbMr/yNrc7fDYG4qlbIvI5gajyzPnb5TCwyhjApznQh1BMFou9b30SevY43gCJKXycoCBjMbsuW0Q==}
    engines: {node: '>= 0.4'}

  functions-have-names@1.2.3:
    resolution: {integrity: sha512-xckBUXyTIqT97tq2x2AMb+g163b5JFysYk0x4qxNFwbfQkmNZoiRHb6sPzI9/QV33WeuvVYBUIiD4NzNIyqaRQ==}

  geist@1.3.1:
    resolution: {integrity: sha512-Q4gC1pBVPN+D579pBaz0TRRnGA4p9UK6elDY/xizXdFk/g4EKR5g0I+4p/Kj6gM0SajDBZ/0FvDV9ey9ud7BWw==}
    peerDependencies:
      next: '>=13.2.0'

  get-caller-file@2.0.5:
    resolution: {integrity: sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==}
    engines: {node: 6.* || 8.* || >= 10.*}

  get-intrinsic@1.2.7:
    resolution: {integrity: sha512-VW6Pxhsrk0KAOqs3WEd0klDiF/+V7gQOpAvY1jVU/LHmaD/kQO4523aiJuikX/QAKYiW6x8Jh+RJej1almdtCA==}
    engines: {node: '>= 0.4'}

  get-nonce@1.0.1:
    resolution: {integrity: sha512-FJhYRoDaiatfEkUK8HKlicmu/3SGFD51q3itKDGoSTysQJBnfOcxU5GxnhE1E6soB76MbT0MBtnKJuXyAx+96Q==}
    engines: {node: '>=6'}

  get-proto@1.0.1:
    resolution: {integrity: sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==}
    engines: {node: '>= 0.4'}

  get-symbol-description@1.1.0:
    resolution: {integrity: sha512-w9UMqWwJxHNOvoNzSJ2oPF5wvYcvP7jUvYzhp67yEhTi17ZDBBC1z9pTdGuzjD+EFIqLSYRweZjqfiPzQ06Ebg==}
    engines: {node: '>= 0.4'}

  get-tsconfig@4.10.0:
    resolution: {integrity: sha512-kGzZ3LWWQcGIAmg6iWvXn0ei6WDtV26wzHRMwDSzmAbcXrTEXxHy6IehI6/4eT6VRKyMP1eF1VqwrVUmE/LR7A==}

  glob-parent@5.1.2:
    resolution: {integrity: sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==}
    engines: {node: '>= 6'}

  glob-parent@6.0.2:
    resolution: {integrity: sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==}
    engines: {node: '>=10.13.0'}

  glob@10.4.5:
    resolution: {integrity: sha512-7Bv8RF0k6xjo7d4A/PxYLbUCfb6c+Vpd2/mB2yRDlew7Jb5hEXiCD9ibfO7wpk8i4sevK6DFny9h7EYbM3/sHg==}
    hasBin: true

  glob@7.2.3:
    resolution: {integrity: sha512-nFR0zLpU2YCaRxwoCJvL6UvCH2JFyFVIvwTLsIf21AuHlMskA1hhTdk+LlYJtOlYt9v6dvszD2BGRqBL+iQK9Q==}
    deprecated: Glob versions prior to v9 are no longer supported

  globals@13.24.0:
    resolution: {integrity: sha512-AhO5QUcj8llrbG09iWhPU2B204J1xnPeL8kQmVorSsy+Sjj1sk8gIyh6cUocGmH4L0UuhAJy+hJMRA4mgA4mFQ==}
    engines: {node: '>=8'}

  globalthis@1.0.4:
    resolution: {integrity: sha512-DpLKbNU4WylpxJykQujfCcwYWiV/Jhm50Goo0wrVILAv5jOr9d+H+UR3PhSCD2rCCEIg0uc+G+muBTwD54JhDQ==}
    engines: {node: '>= 0.4'}

  globby@11.1.0:
    resolution: {integrity: sha512-jhIXaOzy1sb8IyocaruWSn1TjmnBVs8Ayhcy83rmxNJ8q2uWKCAj3CnJY+KpGSXCueAPc0i05kVvVKtP1t9S3g==}
    engines: {node: '>=10'}

  gopd@1.2.0:
    resolution: {integrity: sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==}
    engines: {node: '>= 0.4'}

  graceful-fs@4.2.11:
    resolution: {integrity: sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==}

  graphemer@1.4.0:
    resolution: {integrity: sha512-EtKwoO6kxCL9WO5xipiHTZlSzBm7WLT627TqC/uVRd0HKmq8NXyebnNYxDoBi7wt8eTWrUrKXCOVaFq9x1kgag==}

  groq-sdk@0.5.0:
    resolution: {integrity: sha512-RVmhW7qZ+XZoy5fIuSdx/LGQJONpL8MHgZEW7dFwTdgkzStub2XQx6OKv28CHogijdwH41J+Npj/z2jBPu3vmw==}

  has-ansi@2.0.0:
    resolution: {integrity: sha512-C8vBJ8DwUCx19vhm7urhTuUsr4/IyP6l4VzNQDv+ryHQObW3TTTp9yB68WpYgRe2bbaGuZ/se74IqFeVnMnLZg==}
    engines: {node: '>=0.10.0'}

  has-bigints@1.1.0:
    resolution: {integrity: sha512-R3pbpkcIqv2Pm3dUwgjclDRVmWpTJW2DcMzcIhEXEx1oh/CEMObMm3KLmRJOdvhM7o4uQBnwr8pzRK2sJWIqfg==}
    engines: {node: '>= 0.4'}

  has-flag@4.0.0:
    resolution: {integrity: sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==}
    engines: {node: '>=8'}

  has-property-descriptors@1.0.2:
    resolution: {integrity: sha512-55JNKuIW+vq4Ke1BjOTjM2YctQIvCT7GFzHwmfZPGo5wnrgkid0YQtnAleFSqumZm4az3n2BS+erby5ipJdgrg==}

  has-proto@1.2.0:
    resolution: {integrity: sha512-KIL7eQPfHQRC8+XluaIw7BHUwwqL19bQn4hzNgdr+1wXoU0KKj6rufu47lhY7KbJR2C6T6+PfyN0Ea7wkSS+qQ==}
    engines: {node: '>= 0.4'}

  has-symbols@1.1.0:
    resolution: {integrity: sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==}
    engines: {node: '>= 0.4'}

  has-tostringtag@1.0.2:
    resolution: {integrity: sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==}
    engines: {node: '>= 0.4'}

  hasown@2.0.2:
    resolution: {integrity: sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==}
    engines: {node: '>= 0.4'}

  help-me@5.0.0:
    resolution: {integrity: sha512-7xgomUX6ADmcYzFik0HzAxh/73YlKR9bmFzf51CZwR+b6YtzU2m0u49hQCqV6SvlqIqsaxovfwdvbnsw3b/zpg==}

  htmlparser2@9.1.0:
    resolution: {integrity: sha512-5zfg6mHUoaer/97TxnGpxmbR7zJtPwIYFMZ/H5ucTlPZhKvtum05yiPK3Mgai3a0DyVxv7qYqoweaEd2nrYQzQ==}

  http-errors@2.0.0:
    resolution: {integrity: sha512-FtwrG/euBzaEjYeRqOgly7G0qviiXoJWnvEH2Z1plBdXgbyjv34pHTSb9zoeHMyDy33+DWy5Wt9Wo+TURtOYSQ==}
    engines: {node: '>= 0.8'}

  humanize-ms@1.2.1:
    resolution: {integrity: sha512-Fl70vYtsAFb/C06PTS9dZBo7ihau+Tu/DNCk/OyHhea07S+aeMWpFFkUaXRa8fI+ScZbEI8dfSxwY7gxZ9SAVQ==}

  iconv-lite@0.5.2:
    resolution: {integrity: sha512-kERHXvpSaB4aU3eANwidg79K8FlrN77m8G9V+0vOR3HYaRifrlwMEpT7ZBJqLSEIHnEgJTHcWK82wwLwwKwtag==}
    engines: {node: '>=0.10.0'}

  iconv-lite@0.6.3:
    resolution: {integrity: sha512-4fCk79wshMdzMp2rH06qWrJE4iolqLhCUH+OiuIgU++RB0+94NlDL81atO7GX55uUKueo0txHNtvEyI6D7WdMw==}
    engines: {node: '>=0.10.0'}

  ieee754@1.2.1:
    resolution: {integrity: sha512-dcyqhDvX1C46lXZcVqCpK+FtMRQVdIMN6/Df5js2zouUsqG7I6sFxitIC+7KYK29KdXOLHdu9zL4sFnoVQnqaA==}

  ignore@5.3.2:
    resolution: {integrity: sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==}
    engines: {node: '>= 4'}

  import-fresh@3.3.1:
    resolution: {integrity: sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==}
    engines: {node: '>=6'}

  imurmurhash@0.1.4:
    resolution: {integrity: sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==}
    engines: {node: '>=0.8.19'}

  indent-string@4.0.0:
    resolution: {integrity: sha512-EdDDZu4A2OyIK7Lr/2zG+w5jmbuk1DVBnEwREQvBzspBJkCEbRa8GxU1lghYcaGJCnRWibjDXlq779X1/y5xwg==}
    engines: {node: '>=8'}

  inflight@1.0.6:
    resolution: {integrity: sha512-k92I/b08q4wvFscXCLvqfsHCrjrF7yiXsQuIVvVE7N82W3+aqpzuUdBbfhWcy/FZR3/4IgflMgKLOsvPDrGCJA==}
    deprecated: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.

  inherits@2.0.4:
    resolution: {integrity: sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==}

  internal-slot@1.1.0:
    resolution: {integrity: sha512-4gd7VpWNQNB4UKKCFFVcp1AVv+FMOgs9NKzjHKusc8jTMhd5eL1NqQqOpE0KzMds804/yHlglp3uxgluOqAPLw==}
    engines: {node: '>= 0.4'}

  ioredis@5.5.0:
    resolution: {integrity: sha512-7CutT89g23FfSa8MDoIFs2GYYa0PaNiW/OrT+nRyjRXHDZd17HmIgy+reOQ/yhh72NznNjGuS8kbCAcA4Ro4mw==}
    engines: {node: '>=12.22.0'}

  ipaddr.js@1.9.1:
    resolution: {integrity: sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==}
    engines: {node: '>= 0.10'}

  is-array-buffer@3.0.5:
    resolution: {integrity: sha512-DDfANUiiG2wC1qawP66qlTugJeL5HyzMpfr8lLK+jMQirGzNod0B12cFB/9q838Ru27sBwfw78/rdoU7RERz6A==}
    engines: {node: '>= 0.4'}

  is-arrayish@0.3.2:
    resolution: {integrity: sha512-eVRqCvVlZbuw3GrM63ovNSNAeA1K16kaR/LRY/92w0zxQ5/1YzwblUX652i4Xs9RwAGjW9d9y6X88t8OaAJfWQ==}

  is-async-function@2.1.1:
    resolution: {integrity: sha512-9dgM/cZBnNvjzaMYHVoxxfPj2QXt22Ev7SuuPrs+xav0ukGB0S6d4ydZdEiM48kLx5kDV+QBPrpVnFyefL8kkQ==}
    engines: {node: '>= 0.4'}

  is-bigint@1.1.0:
    resolution: {integrity: sha512-n4ZT37wG78iz03xPRKJrHTdZbe3IicyucEtdRsV5yglwc3GyUfbAfpSeD0FJ41NbUNSt5wbhqfp1fS+BgnvDFQ==}
    engines: {node: '>= 0.4'}

  is-binary-path@2.1.0:
    resolution: {integrity: sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==}
    engines: {node: '>=8'}

  is-boolean-object@1.2.2:
    resolution: {integrity: sha512-wa56o2/ElJMYqjCjGkXri7it5FbebW5usLw/nPmCMs5DeZ7eziSYZhSmPRn0txqeW4LnAmQQU7FgqLpsEFKM4A==}
    engines: {node: '>= 0.4'}

  is-bun-module@1.3.0:
    resolution: {integrity: sha512-DgXeu5UWI0IsMQundYb5UAOzm6G2eVnarJ0byP6Tm55iZNKceD59LNPA2L4VvsScTtHcw0yEkVwSf7PC+QoLSA==}

  is-callable@1.2.7:
    resolution: {integrity: sha512-1BC0BVFhS/p0qtw6enp8e+8OD0UrK0oFLztSjNzhcKA3WDuJxxAPXzPuPtKkjEY9UUoEWlX/8fgKeu2S8i9JTA==}
    engines: {node: '>= 0.4'}

  is-core-module@2.16.1:
    resolution: {integrity: sha512-UfoeMA6fIJ8wTYFEUjelnaGI67v6+N7qXJEvQuIGa99l4xsCruSYOVSQ0uPANn4dAzm8lkYPaKLrrijLq7x23w==}
    engines: {node: '>= 0.4'}

  is-data-view@1.0.2:
    resolution: {integrity: sha512-RKtWF8pGmS87i2D6gqQu/l7EYRlVdfzemCJN/P3UOs//x1QE7mfhvzHIApBTRf7axvT6DMGwSwBXYCT0nfB9xw==}
    engines: {node: '>= 0.4'}

  is-date-object@1.1.0:
    resolution: {integrity: sha512-PwwhEakHVKTdRNVOw+/Gyh0+MzlCl4R6qKvkhuvLtPMggI1WAHt9sOwZxQLSGpUaDnrdyDsomoRgNnCfKNSXXg==}
    engines: {node: '>= 0.4'}

  is-extglob@2.1.1:
    resolution: {integrity: sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==}
    engines: {node: '>=0.10.0'}

  is-finalizationregistry@1.1.1:
    resolution: {integrity: sha512-1pC6N8qWJbWoPtEjgcL2xyhQOP491EQjeUo3qTKcmV8YSDDJrOepfG8pcC7h/QgnQHYSv0mJ3Z/ZWxmatVrysg==}
    engines: {node: '>= 0.4'}

  is-fullwidth-code-point@3.0.0:
    resolution: {integrity: sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==}
    engines: {node: '>=8'}

  is-generator-function@1.1.0:
    resolution: {integrity: sha512-nPUB5km40q9e8UfN/Zc24eLlzdSf9OfKByBw9CIdw4H1giPMeA0OIJvbchsCu4npfI2QcMVBsGEBHKZ7wLTWmQ==}
    engines: {node: '>= 0.4'}

  is-glob@4.0.3:
    resolution: {integrity: sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==}
    engines: {node: '>=0.10.0'}

  is-map@2.0.3:
    resolution: {integrity: sha512-1Qed0/Hr2m+YqxnM09CjA2d/i6YZNfF6R2oRAOj36eUdS6qIV/huPJNSEpKbupewFs+ZsJlxsjjPbc0/afW6Lw==}
    engines: {node: '>= 0.4'}

  is-number-object@1.1.1:
    resolution: {integrity: sha512-lZhclumE1G6VYD8VHe35wFaIif+CTy5SJIi5+3y4psDgWu4wPDoBhF8NxUOinEc7pHgiTsT6MaBb92rKhhD+Xw==}
    engines: {node: '>= 0.4'}

  is-number@7.0.0:
    resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}
    engines: {node: '>=0.12.0'}

  is-path-inside@3.0.3:
    resolution: {integrity: sha512-Fd4gABb+ycGAmKou8eMftCupSir5lRxqf4aD/vd0cD2qc4HL07OjCeuHMr8Ro4CoMaeCKDB0/ECBOVWjTwUvPQ==}
    engines: {node: '>=8'}

  is-promise@4.0.0:
    resolution: {integrity: sha512-hvpoI6korhJMnej285dSg6nu1+e6uxs7zG3BYAm5byqDsgJNWwxzM6z6iZiAgQR4TJ30JmBTOwqZUw3WlyH3AQ==}

  is-regex@1.2.1:
    resolution: {integrity: sha512-MjYsKHO5O7mCsmRGxWcLWheFqN9DJ/2TmngvjKXihe6efViPqc274+Fx/4fYj/r03+ESvBdTXK0V6tA3rgez1g==}
    engines: {node: '>= 0.4'}

  is-set@2.0.3:
    resolution: {integrity: sha512-iPAjerrse27/ygGLxw+EBR9agv9Y6uLeYVJMu+QNCoouJ1/1ri0mGrcWpfCqFZuzzx3WjtwxG098X+n4OuRkPg==}
    engines: {node: '>= 0.4'}

  is-shared-array-buffer@1.0.4:
    resolution: {integrity: sha512-ISWac8drv4ZGfwKl5slpHG9OwPNty4jOWPRIhBpxOoD+hqITiwuipOQ2bNthAzwA3B4fIjO4Nln74N0S9byq8A==}
    engines: {node: '>= 0.4'}

  is-string@1.1.1:
    resolution: {integrity: sha512-BtEeSsoaQjlSPBemMQIrY1MY0uM6vnS1g5fmufYOtnxLGUZM2178PKbhsk7Ffv58IX+ZtcvoGwccYsh0PglkAA==}
    engines: {node: '>= 0.4'}

  is-symbol@1.1.1:
    resolution: {integrity: sha512-9gGx6GTtCQM73BgmHQXfDmLtfjjTUDSyoxTCbp5WtoixAhfgsDirWIcVQ/IHpvI5Vgd5i/J5F7B9cN/WlVbC/w==}
    engines: {node: '>= 0.4'}

  is-typed-array@1.1.15:
    resolution: {integrity: sha512-p3EcsicXjit7SaskXHs1hA91QxgTw46Fv6EFKKGS5DRFLD8yKnohjF3hxoju94b/OcMZoQukzpPpBE9uLVKzgQ==}
    engines: {node: '>= 0.4'}

  is-weakmap@2.0.2:
    resolution: {integrity: sha512-K5pXYOm9wqY1RgjpL3YTkF39tni1XajUIkawTLUo9EZEVUFga5gSQJF8nNS7ZwJQ02y+1YCNYcMh+HIf1ZqE+w==}
    engines: {node: '>= 0.4'}

  is-weakref@1.1.1:
    resolution: {integrity: sha512-6i9mGWSlqzNMEqpCp93KwRS1uUOodk2OJ6b+sq7ZPDSy2WuI5NFIxp/254TytR8ftefexkWn5xNiHUNpPOfSew==}
    engines: {node: '>= 0.4'}

  is-weakset@2.0.4:
    resolution: {integrity: sha512-mfcwb6IzQyOKTs84CQMrOwW4gQcaTOAWJ0zzJCl2WSPDrWk/OzDaImWFH3djXhb24g4eudZfLRozAvPGw4d9hQ==}
    engines: {node: '>= 0.4'}

  is-what@4.1.16:
    resolution: {integrity: sha512-ZhMwEosbFJkA0YhFnNDgTM4ZxDRsS6HqTo7qsZM08fehyRYIYa0yHu5R6mgo1n/8MgaPBXiPimPD77baVFYg+A==}
    engines: {node: '>=12.13'}

  isarray@1.0.0:
    resolution: {integrity: sha512-VLghIWNM6ELQzo7zwmcg0NmTVyWKYjvIeM83yjp0wRDTmUnrM678fQbcKBo6n2CJEF0szoG//ytg+TKla89ALQ==}

  isarray@2.0.5:
    resolution: {integrity: sha512-xHjhDr3cNBK0BzdUJSPXZntQUx/mwMS5Rw4A7lPJ90XGAO6ISP/ePDNuo0vhqOZU+UD5JoodwCAAoZQd3FeAKw==}

  isexe@2.0.0:
    resolution: {integrity: sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==}

  iterare@1.2.1:
    resolution: {integrity: sha512-RKYVTCjAnRthyJes037NX/IiqeidgN1xc3j1RjFfECFp28A1GVwK9nA+i0rJPaHqSZwygLzRnFlzUuHFoWWy+Q==}
    engines: {node: '>=6'}

  iterator.prototype@1.1.5:
    resolution: {integrity: sha512-H0dkQoCa3b2VEeKQBOxFph+JAbcrQdE7KC0UkqwpLmv2EC4P41QXP+rqo9wYodACiG5/WM5s9oDApTU8utwj9g==}
    engines: {node: '>= 0.4'}

  jackspeak@3.4.3:
    resolution: {integrity: sha512-OGlZQpz2yfahA/Rd1Y8Cd9SIEsqvXkLVoSw/cgwhnhFMDbsQFeZYoJJ7bIZBS9BcamUW96asq/npPWugM+RQBw==}

  jiti@1.21.7:
    resolution: {integrity: sha512-/imKNG4EbWNrVjoNC/1H5/9GFy+tqjGBHCaSsN+P2RnPqjsLmv6UD3Ej+Kj8nBWaRAwyk7kK5ZUc+OEatnTR3A==}
    hasBin: true

  jose@5.9.6:
    resolution: {integrity: sha512-AMlnetc9+CV9asI19zHmrgS/WYsWUwCn2R7RzlbJWD7F9eWYUTGyBmU9o6PxngtLGOiDGPRu+Uc4fhKzbpteZQ==}

  js-sdsl@4.3.0:
    resolution: {integrity: sha512-mifzlm2+5nZ+lEcLJMoBK0/IH/bDg8XnJfd/Wq6IP+xoCjLZsTOnV2QpxlVbX9bMnkl5PdEjNtBJ9Cj1NjifhQ==}

  js-tiktoken@1.0.18:
    resolution: {integrity: sha512-hFYx4xYf6URgcttcGvGuOBJhTxPYZ2R5eIesqCaNRJmYH8sNmsfTeWg4yu//7u1VD/qIUkgKJTpGom9oHXmB4g==}

  js-tokens@4.0.0:
    resolution: {integrity: sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==}

  js-yaml@4.1.0:
    resolution: {integrity: sha512-wpxZs9NoxZaJESJGIZTyDEaYpl0FKSA+FB9aJiyemKhMwkxQg63h4T1KJgUGHpTqPDNRcmmYLugrRjJlBtWvRA==}
    hasBin: true

  json-buffer@3.0.1:
    resolution: {integrity: sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==}

  json-schema-traverse@0.4.1:
    resolution: {integrity: sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==}

  json-stable-stringify-without-jsonify@1.0.1:
    resolution: {integrity: sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==}

  json5@1.0.2:
    resolution: {integrity: sha512-g1MWMLBiz8FKi1e4w0UyVL3w+iJceWAFBAaBnnGKOpNa5f8TLktkbre1+s6oICydWAm+HRUGTmI+//xv2hvXYA==}
    hasBin: true

  jsonpointer@5.0.1:
    resolution: {integrity: sha512-p/nXbhSEcu3pZRdkW1OfJhpsVtW1gd4Wa1fnQc9YLiTfAjn0312eMKimbdIQzuZl9aa9xUGaRlP9T/CJE/ditQ==}
    engines: {node: '>=0.10.0'}

  jsx-ast-utils@3.3.5:
    resolution: {integrity: sha512-ZZow9HBI5O6EPgSJLUb8n2NKgmVWTwCvHGwFuJlMjvLFqlGG6pjirPhtdsseaLZjSibD8eegzmYpUZwoIlj2cQ==}
    engines: {node: '>=4.0'}

  kafkajs@2.2.4:
    resolution: {integrity: sha512-j/YeapB1vfPT2iOIUn/vxdyKEuhuY2PxMBvf5JWux6iSaukAccrMtXEY/Lb7OvavDhOWME589bpLrEdnVHjfjA==}
    engines: {node: '>=14.0.0'}

  keyv@4.5.4:
    resolution: {integrity: sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==}

  langchain@0.3.15:
    resolution: {integrity: sha512-+DQ4I2iy4b5sErkxo6jAkgmumvhgqLwLB2fmiGl3yDt8+VVZdB1MUULZMzf+6ubarNc7Mwn/sxHUqK4GhEndhg==}
    engines: {node: '>=18'}
    peerDependencies:
      '@langchain/anthropic': '*'
      '@langchain/aws': '*'
      '@langchain/cerebras': '*'
      '@langchain/cohere': '*'
      '@langchain/core': '>=0.2.21 <0.4.0'
      '@langchain/deepseek': '*'
      '@langchain/google-genai': '*'
      '@langchain/google-vertexai': '*'
      '@langchain/google-vertexai-web': '*'
      '@langchain/groq': '*'
      '@langchain/mistralai': '*'
      '@langchain/ollama': '*'
      axios: '*'
      cheerio: '*'
      handlebars: ^4.7.8
      peggy: ^3.0.2
      typeorm: '*'
    peerDependenciesMeta:
      '@langchain/anthropic':
        optional: true
      '@langchain/aws':
        optional: true
      '@langchain/cerebras':
        optional: true
      '@langchain/cohere':
        optional: true
      '@langchain/deepseek':
        optional: true
      '@langchain/google-genai':
        optional: true
      '@langchain/google-vertexai':
        optional: true
      '@langchain/google-vertexai-web':
        optional: true
      '@langchain/groq':
        optional: true
      '@langchain/mistralai':
        optional: true
      '@langchain/ollama':
        optional: true
      axios:
        optional: true
      cheerio:
        optional: true
      handlebars:
        optional: true
      peggy:
        optional: true
      typeorm:
        optional: true

  langsmith@0.3.7:
    resolution: {integrity: sha512-wakN1hxGkm1JR2PpAV7fiT7oC99LKcgxiuUrYGZWPbuj7Y8EPF19F7VNr4B+hA219bfaeWTa4Lxy2YrtPSKnQA==}
    peerDependencies:
      openai: '*'
    peerDependenciesMeta:
      openai:
        optional: true

  language-subtag-registry@0.3.23:
    resolution: {integrity: sha512-0K65Lea881pHotoGEa5gDlMxt3pctLi2RplBb7Ezh4rRdLEOtgi7n4EwK9lamnUCkKBqaeKRVebTq6BAxSkpXQ==}

  language-tags@1.0.9:
    resolution: {integrity: sha512-MbjN408fEndfiQXbFQ1vnd+1NoLDsnQW41410oQBXiyXDMYH5z505juWa4KUE1LqxRC7DgOgZDbKLxHIwm27hA==}
    engines: {node: '>=0.10'}

  levn@0.4.1:
    resolution: {integrity: sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==}
    engines: {node: '>= 0.8.0'}

  libphonenumber-js@1.11.19:
    resolution: {integrity: sha512-bW/Yp/9dod6fmyR+XqSUL1N5JE7QRxQ3KrBIbYS1FTv32e5i3SEtQVX+71CYNv8maWNSOgnlCoNp9X78f/cKiA==}

  lilconfig@3.1.3:
    resolution: {integrity: sha512-/vlFKAoH5Cgt3Ie+JLhRbwOsCQePABiU3tJ1egGvyQ+33R/vcwM2Zl2QR/LzjsBeItPt3oSVXapn+m4nQDvpzw==}
    engines: {node: '>=14'}

  lines-and-columns@1.2.4:
    resolution: {integrity: sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==}

  locate-path@6.0.0:
    resolution: {integrity: sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==}
    engines: {node: '>=10'}

  lodash.camelcase@4.3.0:
    resolution: {integrity: sha512-TwuEnCnxbc3rAvhf/LbG7tJUDzhqXyFnv3dtzLOPgCG/hODL7WFnsbwktkD7yUV0RrreP/l1PALq/YSg6VvjlA==}

  lodash.defaults@4.2.0:
    resolution: {integrity: sha512-qjxPLHd3r5DnsdGacqOMU6pb/avJzdh9tFX2ymgoZE27BmjXrNy/y4LoaiTeAb+O3gL8AfpJGtqfX/ae2leYYQ==}

  lodash.isarguments@3.1.0:
    resolution: {integrity: sha512-chi4NHZlZqZD18a0imDHnZPrDeBbTtVN7GXMwuGdRH9qotxAjYs3aVLKc7zNOG9eddR5Ksd8rvFEBc9SsggPpg==}

  lodash.merge@4.6.2:
    resolution: {integrity: sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==}

  lodash@4.17.21:
    resolution: {integrity: sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==}

  loglevel-colored-level-prefix@1.0.0:
    resolution: {integrity: sha512-u45Wcxxc+SdAlh4yeF/uKlC1SPUPCy0gullSNKXod5I4bmifzk+Q4lSLExNEVn19tGaJipbZ4V4jbFn79/6mVA==}

  loglevel@1.9.2:
    resolution: {integrity: sha512-HgMmCqIJSAKqo68l0rS2AanEWfkxaZ5wNiEFb5ggm08lDs9Xl2KxBlX3PTcaD2chBM1gXAYf491/M2Rv8Jwayg==}
    engines: {node: '>= 0.6.0'}

  long@5.3.0:
    resolution: {integrity: sha512-5vvY5yF1zF/kXk+L94FRiTDa1Znom46UjPCH6/XbSvS8zBKMFBHTJk8KDMqJ+2J6QezQFi7k1k8v21ClJYHPaw==}

  loose-envify@1.4.0:
    resolution: {integrity: sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==}
    hasBin: true

  lru-cache@10.4.3:
    resolution: {integrity: sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==}

  lucide-react@0.244.0:
    resolution: {integrity: sha512-PeDVbx5PlIRrVvdxiuSxPfBo7sK5qrL3LbvvRoGVNiHYRAkBm/48lKqoioxcmp0bgsyJs9lMw7CdtGFvnMJbVg==}
    peerDependencies:
      react: ^16.5.1 || ^17.0.0 || ^18.0.0

  math-intrinsics@1.1.0:
    resolution: {integrity: sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==}
    engines: {node: '>= 0.4'}

  media-typer@0.3.0:
    resolution: {integrity: sha512-dq+qelQ9akHpcOl/gUVRTxVIOkAJ1wR3QAvb4RsVjS8oVoFjDGTc679wJYmUmknUF5HwMLOgb5O+a3KxfWapPQ==}
    engines: {node: '>= 0.6'}

  media-typer@1.1.0:
    resolution: {integrity: sha512-aisnrDP4GNe06UcKFnV5bfMNPBUw4jsLGaWwWfnH3v02GnBuXX2MCVn5RbrWo0j3pczUilYblq7fQ7Nw2t5XKw==}
    engines: {node: '>= 0.8'}

  merge-descriptors@2.0.0:
    resolution: {integrity: sha512-Snk314V5ayFLhp3fkUREub6WtjBfPdCPY1Ln8/8munuLuiYhsABgBVWsozAG+MWMbVEvcdcpbi9R7ww22l9Q3g==}
    engines: {node: '>=18'}

  merge2@1.4.1:
    resolution: {integrity: sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==}
    engines: {node: '>= 8'}

  methods@1.1.2:
    resolution: {integrity: sha512-iclAHeNqNm68zFtnZ0e+1L2yUIdvzNoauKU4WBA3VvH/vPFieF7qfRlwUZU+DA9P9bPXIS90ulxoUoCH23sV2w==}
    engines: {node: '>= 0.6'}

  micromatch@4.0.8:
    resolution: {integrity: sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==}
    engines: {node: '>=8.6'}

  mime-db@1.52.0:
    resolution: {integrity: sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==}
    engines: {node: '>= 0.6'}

  mime-db@1.53.0:
    resolution: {integrity: sha512-oHlN/w+3MQ3rba9rqFr6V/ypF10LSkdwUysQL7GkXoTgIWeV+tcXGA852TBxH+gsh8UWoyhR1hKcoMJTuWflpg==}
    engines: {node: '>= 0.6'}

  mime-types@2.1.35:
    resolution: {integrity: sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==}
    engines: {node: '>= 0.6'}

  mime-types@3.0.0:
    resolution: {integrity: sha512-XqoSHeCGjVClAmoGFG3lVFqQFRIrTVw2OH3axRqAcfaw+gHWIfnASS92AV+Rl/mk0MupgZTRHQOjxY6YVnzK5w==}
    engines: {node: '>= 0.6'}

  minimatch@3.1.2:
    resolution: {integrity: sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==}

  minimatch@9.0.3:
    resolution: {integrity: sha512-RHiac9mvaRw0x3AYRgDC1CxAP7HTcNrrECeA8YYJeWnpo+2Q5CegtZjaotWTWxDG3UeGA1coE05iH1mPjT/2mg==}
    engines: {node: '>=16 || 14 >=14.17'}

  minimatch@9.0.5:
    resolution: {integrity: sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow==}
    engines: {node: '>=16 || 14 >=14.17'}

  minimist@1.2.8:
    resolution: {integrity: sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==}

  minipass@7.1.2:
    resolution: {integrity: sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw==}
    engines: {node: '>=16 || 14 >=14.17'}

  mkdirp@0.5.6:
    resolution: {integrity: sha512-FP+p8RB8OWpF3YZBCrP5gtADmtXApB5AMLn+vdyA+PyxCjrCs00mjyUozssO33cwDeT3wNGdLxJ5M//YqtHAJw==}
    hasBin: true

  mqtt-packet@9.0.1:
    resolution: {integrity: sha512-koZF1V/X2RZUI6uD9wN5OK1JxxcG1ofAR4H3LjCw1FkeKzruZQ26aAA6v2m1lZyWONZIR5wMMJFrZJDRNzbiQw==}

  mqtt@5.10.3:
    resolution: {integrity: sha512-hA/6YrUS4fywhBGCjH/XXUuLeueJiPqruVVWjK2A24Ma4KcWfZ/x8x07aoesBV+HXDWBC08tbT4IWfSXNW0Jtw==}
    engines: {node: '>=16.0.0'}
    hasBin: true

  ms@2.0.0:
    resolution: {integrity: sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==}

  ms@2.1.2:
    resolution: {integrity: sha512-sGkPx+VjMtmA6MX27oA4FBFELFCZZ4S4XqeGOXCv68tT+jb3vk/RyaKWP0PTKyWtmLSM0b+adUTEvbs1PEaH2w==}

  ms@2.1.3:
    resolution: {integrity: sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==}

  multer@1.4.5-lts.1:
    resolution: {integrity: sha512-ywPWvcDMeH+z9gQq5qYHCCy+ethsk4goepZ45GLD63fOu0YcNecQxi64nDs3qluZB+murG3/D4dJ7+dGctcCQQ==}
    engines: {node: '>= 6.0.0'}

  mustache@4.2.0:
    resolution: {integrity: sha512-71ippSywq5Yb7/tVYyGbkBggbU8H3u5Rz56fH60jGFgr8uHwxs+aSKeqmluIVzM0m0kB7xQjKS6qPfd0b2ZoqQ==}
    hasBin: true

  mz@2.7.0:
    resolution: {integrity: sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q==}

  nanoid@3.3.8:
    resolution: {integrity: sha512-WNLf5Sd8oZxOm+TzppcYk8gVOgP+l58xNy58D0nbUnOxOWRWvlcCV4kUF7ltmI6PsrLl/BgKEyS4mqsGChFN0w==}
    engines: {node: ^10 || ^12 || ^13.7 || ^14 || >=15.0.1}
    hasBin: true

  nats@2.29.1:
    resolution: {integrity: sha512-OHVsxrQCITTdMKG3So0jhtnBd5jS2u1xpS91UCws7VklsaCbctwg5vT/8lYpVldPW0x3aHGF8uuAoMfCoJy7Sg==}
    engines: {node: '>= 14.0.0'}

  natural-compare@1.4.0:
    resolution: {integrity: sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==}

  negotiator@0.6.3:
    resolution: {integrity: sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==}
    engines: {node: '>= 0.6'}

  negotiator@1.0.0:
    resolution: {integrity: sha512-8Ofs/AUQh8MaEcrlq5xOX0CQ9ypTF5dl78mjlMNfOK08fzpgTHQRQPBxcPlEtIw0yRpws+Zo/3r+5WRby7u3Gg==}
    engines: {node: '>= 0.6'}

  next-auth@5.0.0-beta.25:
    resolution: {integrity: sha512-2dJJw1sHQl2qxCrRk+KTQbeH+izFbGFPuJj5eGgBZFYyiYYtvlrBeUw1E/OJJxTRjuxbSYGnCTkUIRsIIW0bog==}
    peerDependencies:
      '@simplewebauthn/browser': ^9.0.1
      '@simplewebauthn/server': ^9.0.2
      next: ^14.0.0-0 || ^15.0.0-0
      nodemailer: ^6.6.5
      react: ^18.2.0 || ^19.0.0-0
    peerDependenciesMeta:
      '@simplewebauthn/browser':
        optional: true
      '@simplewebauthn/server':
        optional: true
      nodemailer:
        optional: true

  next-themes@0.2.1:
    resolution: {integrity: sha512-B+AKNfYNIzh0vqQQKqQItTS8evEouKD7H5Hj3kmuPERwddR2TxvDSFZuTj6T7Jfn1oyeUyJMydPl1Bkxkh0W7A==}
    peerDependencies:
      next: '*'
      react: '*'
      react-dom: '*'

  next@15.1.7:
    resolution: {integrity: sha512-GNeINPGS9c6OZKCvKypbL8GTsT5GhWPp4DM0fzkXJuXMilOO2EeFxuAY6JZbtk6XIl6Ws10ag3xRINDjSO5+wg==}
    engines: {node: ^18.18.0 || ^19.8.0 || >= 20.0.0}
    hasBin: true
    peerDependencies:
      '@opentelemetry/api': ^1.1.0
      '@playwright/test': ^1.41.2
      babel-plugin-react-compiler: '*'
      react: ^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0
      react-dom: ^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0
      sass: ^1.3.0
    peerDependenciesMeta:
      '@opentelemetry/api':
        optional: true
      '@playwright/test':
        optional: true
      babel-plugin-react-compiler:
        optional: true
      sass:
        optional: true

  nkeys.js@1.1.0:
    resolution: {integrity: sha512-tB/a0shZL5UZWSwsoeyqfTszONTt4k2YS0tuQioMOD180+MbombYVgzDUYHlx+gejYK6rgf08n/2Df99WY0Sxg==}
    engines: {node: '>=10.0.0'}

  node-domexception@1.0.0:
    resolution: {integrity: sha512-/jKZoMpw0F8GRwl4/eLROPA3cfcXtLApP0QzLmUT/HuPCZWyB7IY9ZrMeKw2O/nFIqPQB3PVM9aYm0F312AXDQ==}
    engines: {node: '>=10.5.0'}

  node-fetch@2.7.0:
    resolution: {integrity: sha512-c4FRfUm/dbcWZ7U+1Wq0AwCyFL+3nt2bEw05wfxSz+DWpWsitgmSgYmy2dQdWyKC1694ELPqMs/YzUSNozLt8A==}
    engines: {node: 4.x || >=6.0.0}
    peerDependencies:
      encoding: ^0.1.0
    peerDependenciesMeta:
      encoding:
        optional: true

  node-releases@2.0.19:
    resolution: {integrity: sha512-xxOWJsBKtzAq7DY0J+DTzuz58K8e7sJbdgwkbMWQe8UYB6ekmsQ45q0M/tJDsGaZmbC+l7n57UV8Hl5tHxO9uw==}

  normalize-path@3.0.0:
    resolution: {integrity: sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==}
    engines: {node: '>=0.10.0'}

  normalize-range@0.1.2:
    resolution: {integrity: sha512-bdok/XvKII3nUpklnV6P2hxtMNrCboOjAcyBuQnWEhO665FwrSNRxU+AqpsyvO6LgGYPspN+lu5CLtw4jPRKNA==}
    engines: {node: '>=0.10.0'}

  nth-check@2.1.1:
    resolution: {integrity: sha512-lqjrjmaOoAnWfMmBPL+XNnynZh2+swxiX3WUE0s4yEHI6m+AwrK2UZOimIRl3X/4QctVqS8AiZjFqyOGrMXb/w==}

  number-allocator@1.0.14:
    resolution: {integrity: sha512-OrL44UTVAvkKdOdRQZIJpLkAdjXGTRda052sN4sO77bKEzYYqWKMBjQvrJFzqygI99gL6Z4u2xctPW1tB8ErvA==}

  oauth4webapi@3.1.4:
    resolution: {integrity: sha512-eVfN3nZNbok2s/ROifO0UAc5G8nRoLSbrcKJ09OqmucgnhXEfdIQOR4gq1eJH1rN3gV7rNw62bDEgftsgFtBEg==}

  object-assign@4.1.1:
    resolution: {integrity: sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==}
    engines: {node: '>=0.10.0'}

  object-hash@3.0.0:
    resolution: {integrity: sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw==}
    engines: {node: '>= 6'}

  object-inspect@1.13.4:
    resolution: {integrity: sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==}
    engines: {node: '>= 0.4'}

  object-keys@1.1.1:
    resolution: {integrity: sha512-NuAESUOUMrlIXOfHKzD6bpPu3tYt3xvjNdRIQ+FeT0lNb4K8WR70CaDxhuNguS2XG+GjkyMwOzsN5ZktImfhLA==}
    engines: {node: '>= 0.4'}

  object.assign@4.1.7:
    resolution: {integrity: sha512-nK28WOo+QIjBkDduTINE4JkF/UJJKyf2EJxvJKfblDpyg0Q+pkOHNTL0Qwy6NP6FhE/EnzV73BxxqcJaXY9anw==}
    engines: {node: '>= 0.4'}

  object.entries@1.1.8:
    resolution: {integrity: sha512-cmopxi8VwRIAw/fkijJohSfpef5PdN0pMQJN6VC/ZKvn0LIknWD8KtgY6KlQdEc4tIjcQ3HxSMmnvtzIscdaYQ==}
    engines: {node: '>= 0.4'}

  object.fromentries@2.0.8:
    resolution: {integrity: sha512-k6E21FzySsSK5a21KRADBd/NGneRegFO5pLHfdQLpRDETUNJueLXs3WCzyQ3tFRDYgbq3KHGXfTbi2bs8WQ6rQ==}
    engines: {node: '>= 0.4'}

  object.groupby@1.0.3:
    resolution: {integrity: sha512-+Lhy3TQTuzXI5hevh8sBGqbmurHbbIjAi0Z4S63nthVLmLxfbj4T54a4CfZrXIrt9iP4mVAPYMo/v99taj3wjQ==}
    engines: {node: '>= 0.4'}

  object.values@1.2.1:
    resolution: {integrity: sha512-gXah6aZrcUxjWg2zR2MwouP2eHlCBzdV4pygudehaKXSGW4v2AsRQUK+lwwXhii6KFZcunEnmSUoYp5CXibxtA==}
    engines: {node: '>= 0.4'}

  on-finished@2.4.1:
    resolution: {integrity: sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==}
    engines: {node: '>= 0.8'}

  once@1.4.0:
    resolution: {integrity: sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==}

  openai@4.84.0:
    resolution: {integrity: sha512-Smu45QjqWcPXkTHAI7GSeW+sI9ZOqB9VW4wiuhBvWLGHYC9dn/3rIpG8PUysbCT+ciVyDdEdsx0zkgKQDoOx9Q==}
    hasBin: true
    peerDependencies:
      ws: ^8.18.0
      zod: ^3.23.8
    peerDependenciesMeta:
      ws:
        optional: true
      zod:
        optional: true

  openapi-types@12.1.3:
    resolution: {integrity: sha512-N4YtSYJqghVu4iek2ZUvcN/0aqH1kRDuNqzcycDxhOUpg7GdvLa2F3DgS6yBNhInhv2r/6I0Flkn7CqL8+nIcw==}

  optionator@0.9.4:
    resolution: {integrity: sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==}
    engines: {node: '>= 0.8.0'}

  own-keys@1.0.1:
    resolution: {integrity: sha512-qFOyK5PjiWZd+QQIh+1jhdb9LpxTF0qs7Pm8o5QHYZ0M3vKqSqzsZaEB6oWlxZ+q2sJBMI/Ktgd2N5ZwQoRHfg==}
    engines: {node: '>= 0.4'}

  p-finally@1.0.0:
    resolution: {integrity: sha512-LICb2p9CB7FS+0eR1oqWnHhp0FljGLZCWBE9aix0Uye9W8LTQPwMTYVGWQWIw9RdQiDg4+epXQODwIYJtSJaow==}
    engines: {node: '>=4'}

  p-limit@3.1.0:
    resolution: {integrity: sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==}
    engines: {node: '>=10'}

  p-locate@5.0.0:
    resolution: {integrity: sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==}
    engines: {node: '>=10'}

  p-queue@6.6.2:
    resolution: {integrity: sha512-RwFpb72c/BhQLEXIZ5K2e+AhgNVmIejGlTgiB9MzZ0e93GRvqZ7uSi0dvRF7/XIXDeNkra2fNHBxTyPDGySpjQ==}
    engines: {node: '>=8'}

  p-retry@4.6.2:
    resolution: {integrity: sha512-312Id396EbJdvRONlngUx0NydfrIQ5lsYu0znKVUzVvArzEIt08V1qhtyESbGVd1FGX7UKtiFp5uwKZdM8wIuQ==}
    engines: {node: '>=8'}

  p-timeout@3.2.0:
    resolution: {integrity: sha512-rhIwUycgwwKcP9yTOOFK/AKsAopjjCakVqLHePO3CC6Mir1Z99xT+R63jZxAT5lFZLa2inS5h+ZS2GvR99/FBg==}
    engines: {node: '>=8'}

  package-json-from-dist@1.0.1:
    resolution: {integrity: sha512-UEZIS3/by4OC8vL3P2dTXRETpebLI2NiI5vIrjaD/5UtrkFX/tNbwjTSRAGC/+7CAo2pIcBaRgWmcBBHcsaCIw==}

  parent-module@1.0.1:
    resolution: {integrity: sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==}
    engines: {node: '>=6'}

  parse5-htmlparser2-tree-adapter@7.1.0:
    resolution: {integrity: sha512-ruw5xyKs6lrpo9x9rCZqZZnIUntICjQAd0Wsmp396Ul9lN/h+ifgVV1x1gZHi8euej6wTfpqX8j+BFQxF0NS/g==}

  parse5-parser-stream@7.1.2:
    resolution: {integrity: sha512-JyeQc9iwFLn5TbvvqACIF/VXG6abODeB3Fwmv/TGdLk2LfbWkaySGY72at4+Ty7EkPZj854u4CrICqNk2qIbow==}

  parse5@7.2.1:
    resolution: {integrity: sha512-BuBYQYlv1ckiPdQi/ohiivi9Sagc9JG+Ozs0r7b/0iK3sKmrb0b9FdWdBbOdx6hBCM/F9Ir82ofnBhtZOjCRPQ==}

  parseurl@1.3.3:
    resolution: {integrity: sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==}
    engines: {node: '>= 0.8'}

  path-exists@4.0.0:
    resolution: {integrity: sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==}
    engines: {node: '>=8'}

  path-is-absolute@1.0.1:
    resolution: {integrity: sha512-AVbw3UJ2e9bq64vSaS9Am0fje1Pa8pbGqTTsmXfaIiMpnr5DlDhfJOuLj9Sf95ZPVDAUerDfEk88MPmPe7UCQg==}
    engines: {node: '>=0.10.0'}

  path-key@3.1.1:
    resolution: {integrity: sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==}
    engines: {node: '>=8'}

  path-parse@1.0.7:
    resolution: {integrity: sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==}

  path-scurry@1.11.1:
    resolution: {integrity: sha512-Xa4Nw17FS9ApQFJ9umLiJS4orGjm7ZzwUrwamcGQuHSzDyth9boKDaycYdDcZDuqYATXw4HFXgaqWTctW/v1HA==}
    engines: {node: '>=16 || 14 >=14.18'}

  path-to-regexp@8.2.0:
    resolution: {integrity: sha512-TdrF7fW9Rphjq4RjrW0Kp2AW0Ahwu9sRGTkS6bvDi0SCwZlEZYmcfDbEsTz8RVk0EHIS/Vd1bv3JhG+1xZuAyQ==}
    engines: {node: '>=16'}

  path-type@4.0.0:
    resolution: {integrity: sha512-gDKb8aZMDeD/tZWs9P6+q0J9Mwkdl6xMV8TjnGP3qJVJ06bdMgkbBlLU8IdfOsIsFz2BW1rNVT3XuNEl8zPAvw==}
    engines: {node: '>=8'}

  picocolors@1.1.1:
    resolution: {integrity: sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==}

  picomatch@2.3.1:
    resolution: {integrity: sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==}
    engines: {node: '>=8.6'}

  pify@2.3.0:
    resolution: {integrity: sha512-udgsAY+fTnvv7kI7aaxbqwWNb0AHiB0qBO89PZKPkoTmGOgdbrHDKD+0B2X4uTfJ/FT1R09r9gTsjUjNJotuog==}
    engines: {node: '>=0.10.0'}

  pirates@4.0.6:
    resolution: {integrity: sha512-saLsH7WeYYPiD25LDuLRRY/i+6HaPYr6G1OUlN39otzkSTxKnubR9RTxS3/Kk50s1g2JTgFwWQDQyplC5/SHZg==}
    engines: {node: '>= 6'}

  possible-typed-array-names@1.1.0:
    resolution: {integrity: sha512-/+5VFTchJDoVj3bhoqi6UeymcD00DAwb1nJwamzPvHEszJ4FpF6SNNbUbOS8yI56qHzdV8eK0qEfOSiodkTdxg==}
    engines: {node: '>= 0.4'}

  postcss-import@15.1.0:
    resolution: {integrity: sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew==}
    engines: {node: '>=14.0.0'}
    peerDependencies:
      postcss: ^8.0.0

  postcss-js@4.0.1:
    resolution: {integrity: sha512-dDLF8pEO191hJMtlHFPRa8xsizHaM82MLfNkUHdUtVEV3tgTp5oj+8qbEqYM57SLfc74KSbw//4SeJma2LRVIw==}
    engines: {node: ^12 || ^14 || >= 16}
    peerDependencies:
      postcss: ^8.4.21

  postcss-load-config@4.0.2:
    resolution: {integrity: sha512-bSVhyJGL00wMVoPUzAVAnbEoWyqRxkjv64tUl427SKnPrENtq6hJwUojroMz2VB+Q1edmi4IfrAPpami5VVgMQ==}
    engines: {node: '>= 14'}
    peerDependencies:
      postcss: '>=8.0.9'
      ts-node: '>=9.0.0'
    peerDependenciesMeta:
      postcss:
        optional: true
      ts-node:
        optional: true

  postcss-nested@6.2.0:
    resolution: {integrity: sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ==}
    engines: {node: '>=12.0'}
    peerDependencies:
      postcss: ^8.2.14

  postcss-selector-parser@6.1.2:
    resolution: {integrity: sha512-Q8qQfPiZ+THO/3ZrOrO0cJJKfpYCagtMUkXbnEfmgUjwXg6z/WBeOyS9APBBPCTSiDV+s4SwQGu8yFsiMRIudg==}
    engines: {node: '>=4'}

  postcss-value-parser@4.2.0:
    resolution: {integrity: sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==}

  postcss@8.4.31:
    resolution: {integrity: sha512-PS08Iboia9mts/2ygV3eLpY5ghnUcfLV/EXTOW1E2qYxJKGGBUtNjN76FYHnMs36RmARn41bC0AZmn+rR0OVpQ==}
    engines: {node: ^10 || ^12 || >=14}

  postcss@8.5.2:
    resolution: {integrity: sha512-MjOadfU3Ys9KYoX0AdkBlFEF1Vx37uCCeN4ZHnmwm9FfpbsGWMZeBLMmmpY+6Ocqod7mkdZ0DT31OlbsFrLlkA==}
    engines: {node: ^10 || ^12 || >=14}

  postgres@3.4.5:
    resolution: {integrity: sha512-cDWgoah1Gez9rN3H4165peY9qfpEo+SA61oQv65O3cRUE1pOEoJWwddwcqKE8XZYjbblOJlYDlLV4h67HrEVDg==}
    engines: {node: '>=12'}

  preact-render-to-string@5.2.3:
    resolution: {integrity: sha512-aPDxUn5o3GhWdtJtW0svRC2SS/l8D9MAgo2+AWml+BhDImb27ALf04Q2d+AHqUUOc6RdSXFIBVa2gxzgMKgtZA==}
    peerDependencies:
      preact: '>=10'

  preact-render-to-string@6.5.11:
    resolution: {integrity: sha512-ubnauqoGczeGISiOh6RjX0/cdaF8v/oDXIjO85XALCQjwQP+SB4RDXXtvZ6yTYSjG+PC1QRP2AhPgCEsM2EvUw==}
    peerDependencies:
      preact: '>=10'

  preact@10.11.3:
    resolution: {integrity: sha512-eY93IVpod/zG3uMF22Unl8h9KkrcKIRs2EGar8hwLZZDU1lkjph303V9HZBwufh2s736U6VXuhD109LYqPoffg==}

  preact@10.24.3:
    resolution: {integrity: sha512-Z2dPnBnMUfyQfSQ+GBdsGa16hz35YmLmtTLhM169uW944hYL6xzTYkJjC07j+Wosz733pMWx0fgON3JNw1jJQA==}

  prelude-ls@1.2.1:
    resolution: {integrity: sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==}
    engines: {node: '>= 0.8.0'}

  prettier-eslint@16.3.0:
    resolution: {integrity: sha512-Lh102TIFCr11PJKUMQ2kwNmxGhTsv/KzUg9QYF2Gkw259g/kPgndZDWavk7/ycbRvj2oz4BPZ1gCU8bhfZH/Xg==}
    engines: {node: '>=16.10.0'}
    peerDependencies:
      prettier-plugin-svelte: ^3.0.0
      svelte-eslint-parser: '*'
    peerDependenciesMeta:
      prettier-plugin-svelte:
        optional: true
      svelte-eslint-parser:
        optional: true

  prettier-linter-helpers@1.0.0:
    resolution: {integrity: sha512-GbK2cP9nraSSUF9N2XwUwqfzlAFlMNYYl+ShE/V+H8a9uNl/oUqB1w2EL54Jh0OlyRSd8RfWYJ3coVS4TROP2w==}
    engines: {node: '>=6.0.0'}

  prettier-plugin-tailwindcss@0.6.11:
    resolution: {integrity: sha512-YxaYSIvZPAqhrrEpRtonnrXdghZg1irNg4qrjboCXrpybLWVs55cW2N3juhspVJiO0JBvYJT8SYsJpc8OQSnsA==}
    engines: {node: '>=14.21.3'}
    peerDependencies:
      '@ianvs/prettier-plugin-sort-imports': '*'
      '@prettier/plugin-pug': '*'
      '@shopify/prettier-plugin-liquid': '*'
      '@trivago/prettier-plugin-sort-imports': '*'
      '@zackad/prettier-plugin-twig': '*'
      prettier: ^3.0
      prettier-plugin-astro: '*'
      prettier-plugin-css-order: '*'
      prettier-plugin-import-sort: '*'
      prettier-plugin-jsdoc: '*'
      prettier-plugin-marko: '*'
      prettier-plugin-multiline-arrays: '*'
      prettier-plugin-organize-attributes: '*'
      prettier-plugin-organize-imports: '*'
      prettier-plugin-sort-imports: '*'
      prettier-plugin-style-order: '*'
      prettier-plugin-svelte: '*'
    peerDependenciesMeta:
      '@ianvs/prettier-plugin-sort-imports':
        optional: true
      '@prettier/plugin-pug':
        optional: true
      '@shopify/prettier-plugin-liquid':
        optional: true
      '@trivago/prettier-plugin-sort-imports':
        optional: true
      '@zackad/prettier-plugin-twig':
        optional: true
      prettier-plugin-astro:
        optional: true
      prettier-plugin-css-order:
        optional: true
      prettier-plugin-import-sort:
        optional: true
      prettier-plugin-jsdoc:
        optional: true
      prettier-plugin-marko:
        optional: true
      prettier-plugin-multiline-arrays:
        optional: true
      prettier-plugin-organize-attributes:
        optional: true
      prettier-plugin-organize-imports:
        optional: true
      prettier-plugin-sort-imports:
        optional: true
      prettier-plugin-style-order:
        optional: true
      prettier-plugin-svelte:
        optional: true

  prettier@3.5.0:
    resolution: {integrity: sha512-quyMrVt6svPS7CjQ9gKb3GLEX/rl3BCL2oa/QkNcXv4YNVBC9olt3s+H7ukto06q7B1Qz46PbrKLO34PR6vXcA==}
    engines: {node: '>=14'}
    hasBin: true

  pretty-format@29.7.0:
    resolution: {integrity: sha512-Pdlw/oPxN+aXdmM9R00JVC9WVFoCLTKJvDVLgmJ+qAffBMxsV85l/Lu7sNx4zSzPyoL2euImuEwHhOXdEgNFZQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  pretty-format@3.8.0:
    resolution: {integrity: sha512-WuxUnVtlWL1OfZFQFuqvnvs6MiAGk9UNsBostyBOB0Is9wb5uRESevA6rnl/rkksXaGX3GzZhPup5d6Vp1nFew==}

  process-nextick-args@2.0.1:
    resolution: {integrity: sha512-3ouUOpQhtgrbOa17J7+uxOTpITYWaGP7/AhoR3+A+/1e9skrzelGi/dXzEYyvbxubEF6Wn2ypscTKiKJFFn1ag==}

  process@0.11.10:
    resolution: {integrity: sha512-cdGef/drWFoydD1JsMzuFf8100nZl+GT+yacc2bEced5f9Rjk4z+WtFUTBu9PhOi9j/jfmBPu0mMEY4wIdAF8A==}
    engines: {node: '>= 0.6.0'}

  promise-breaker@6.0.0:
    resolution: {integrity: sha512-BthzO9yTPswGf7etOBiHCVuugs2N01/Q/94dIPls48z2zCmrnDptUUZzfIb+41xq0MnYZ/BzmOd6ikDR4ibNZA==}

  prop-types@15.8.1:
    resolution: {integrity: sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg==}

  protobufjs@7.4.0:
    resolution: {integrity: sha512-mRUWCc3KUU4w1jU8sGxICXH/gNS94DvI1gxqDvBzhj1JpcsimQkYiOJfwsPUykUI5ZaspFbSgmBLER8IrQ3tqw==}
    engines: {node: '>=12.0.0'}

  proxy-addr@2.0.7:
    resolution: {integrity: sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==}
    engines: {node: '>= 0.10'}

  punycode@2.3.1:
    resolution: {integrity: sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==}
    engines: {node: '>=6'}

  qs@6.13.0:
    resolution: {integrity: sha512-+38qI9SOr8tfZ4QmJNplMUxqjbe7LKvvZgWdExBOmd+egZTtjLB67Gu0HRX3u/XOq7UU2Nx6nsjvS16Z9uwfpg==}
    engines: {node: '>=0.6'}

  qs@6.14.0:
    resolution: {integrity: sha512-YWWTjgABSKcvs/nWBi9PycY/JiPJqOD4JA6o9Sej2AtvSGarXxKC3OQSk4pAarbdQlKAh5D4FCQkJNkW+GAn3w==}
    engines: {node: '>=0.6'}

  querystringify@2.2.0:
    resolution: {integrity: sha512-FIqgj2EUvTa7R50u0rGsyTftzjYmv/a3hO345bZNrqabNqjtgiDMgmo4mkUjd+nzU5oF3dClKqFIPUKybUyqoQ==}

  queue-microtask@1.2.3:
    resolution: {integrity: sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==}

  range-parser@1.2.1:
    resolution: {integrity: sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==}
    engines: {node: '>= 0.6'}

  raw-body@3.0.0:
    resolution: {integrity: sha512-RmkhL8CAyCRPXCE28MMH0z2PNWQBNk2Q09ZdxM9IOOXwxwZbN+qbWaatPkdkWIKL2ZVDImrN/pK5HTRz2PcS4g==}
    engines: {node: '>= 0.8'}

  react-chartjs-2@5.3.0:
    resolution: {integrity: sha512-UfZZFnDsERI3c3CZGxzvNJd02SHjaSJ8kgW1djn65H1KK8rehwTjyrRKOG3VTMG8wtHZ5rgAO5oTHtHi9GCCmw==}
    peerDependencies:
      chart.js: ^4.1.1
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0

  react-dom@18.3.1:
    resolution: {integrity: sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw==}
    peerDependencies:
      react: ^18.3.1

  react-hook-form@7.54.2:
    resolution: {integrity: sha512-eHpAUgUjWbZocoQYUHposymRb4ZP6d0uwUnooL2uOybA9/3tPUvoAKqEWK1WaSiTxxOfTpffNZP7QwlnM3/gEg==}
    engines: {node: '>=18.0.0'}
    peerDependencies:
      react: ^16.8.0 || ^17 || ^18 || ^19

  react-is@16.13.1:
    resolution: {integrity: sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==}

  react-is@18.3.1:
    resolution: {integrity: sha512-/LLMVyas0ljjAtoYiPqYiL8VWXzUUdThrmU5+n20DZv+a+ClRoevUzw5JxU+Ieh5/c87ytoTBV9G1FiKfNJdmg==}

  react-remove-scroll-bar@2.3.8:
    resolution: {integrity: sha512-9r+yi9+mgU33AKcj6IbT9oRCO78WriSj6t/cF8DWBZJ9aOGPOTEDvdUDz1FwKim7QXWwmHqtdHnRJfhAxEG46Q==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react-remove-scroll@2.6.3:
    resolution: {integrity: sha512-pnAi91oOk8g8ABQKGF5/M9qxmmOPxaAnopyTHYfqYEwJhyFrbbBtHuSgtKEoH0jpcxx5o3hXqH1mNd9/Oi+8iQ==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react-style-singleton@2.2.3:
    resolution: {integrity: sha512-b6jSvxvVnyptAiLjbkWLE/lOnR4lfTtDAl+eUC7RZy+QQWc6wRzIV2CE6xBuMmDxc2qIihtDCZD5NPOFl7fRBQ==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  react@18.3.1:
    resolution: {integrity: sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ==}
    engines: {node: '>=0.10.0'}

  read-cache@1.0.0:
    resolution: {integrity: sha512-Owdv/Ft7IjOgm/i0xvNDZ1LrRANRfew4b2prF3OWMQLxLfu3bS8FVhCsrSCMK4lR56Y9ya+AThoTpDCTxCmpRA==}

  readable-stream@2.3.8:
    resolution: {integrity: sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==}

  readable-stream@3.6.2:
    resolution: {integrity: sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==}
    engines: {node: '>= 6'}

  readable-stream@4.7.0:
    resolution: {integrity: sha512-oIGGmcpTLwPga8Bn6/Z75SVaH1z5dUut2ibSyAMVhmUggWpmDn2dapB0n7f8nwaSiRtepAsfJyfXIO5DCVAODg==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}

  readdirp@3.6.0:
    resolution: {integrity: sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==}
    engines: {node: '>=8.10.0'}

  redis-errors@1.2.0:
    resolution: {integrity: sha512-1qny3OExCf0UvUV/5wpYKf2YwPcOqXzkwKKSmKHiE6ZMQs5heeE/c8eXK+PNllPvmjgAbfnsbpkGZWy8cBpn9w==}
    engines: {node: '>=4'}

  redis-parser@3.0.0:
    resolution: {integrity: sha512-DJnGAeenTdpMEH6uAJRK/uiyEIH9WVsUmoLwzudwGJUwZPp80PDBWPHXSAGNPwNvIXAbe7MSUB1zQFugFml66A==}
    engines: {node: '>=4'}

  reflect-metadata@0.2.2:
    resolution: {integrity: sha512-urBwgfrvVP/eAyXx4hluJivBKzuEbSQs9rKWCrCkbSxNv8mxPcUZKeuoF3Uy4mJl3Lwprp6yy5/39VWigZ4K6Q==}

  reflect.getprototypeof@1.0.10:
    resolution: {integrity: sha512-00o4I+DVrefhv+nX0ulyi3biSHCPDe+yLv5o/p6d/UVlirijB8E16FtfwSAi4g3tcqrQ4lRAqQSoFEZJehYEcw==}
    engines: {node: '>= 0.4'}

  regenerator-runtime@0.14.1:
    resolution: {integrity: sha512-dYnhHh0nJoMfnkZs6GmmhFknAGRrLznOu5nc9ML+EJxGvrx6H7teuevqVqCuPcPK//3eDrrjQhehXVx9cnkGdw==}

  regexp.prototype.flags@1.5.4:
    resolution: {integrity: sha512-dYqgNSZbDwkaJ2ceRd9ojCGjBq+mOm9LmtXnAnEGyHhN/5R7iDW2TRw3h+o/jCFxus3P2LfWIIiwowAjANm7IA==}
    engines: {node: '>= 0.4'}

  reinterval@1.1.0:
    resolution: {integrity: sha512-QIRet3SYrGp0HUHO88jVskiG6seqUGC5iAG7AwI/BV4ypGcuqk9Du6YQBUOUqm9c8pw1eyLoIaONifRua1lsEQ==}

  require-directory@2.1.1:
    resolution: {integrity: sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==}
    engines: {node: '>=0.10.0'}

  require-relative@0.8.7:
    resolution: {integrity: sha512-AKGr4qvHiryxRb19m3PsLRGuKVAbJLUD7E6eOaHkfKhwc+vSgVOCY5xNvm9EkolBKTOf0GrQAZKLimOCz81Khg==}

  requires-port@1.0.0:
    resolution: {integrity: sha512-KigOCHcocU3XODJxsu8i/j8T9tzT4adHiecwORRQ0ZZFcp7ahwXuRU1m+yuO90C5ZUyGeGfocHDI14M3L3yDAQ==}

  resolve-from@4.0.0:
    resolution: {integrity: sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==}
    engines: {node: '>=4'}

  resolve-pkg-maps@1.0.0:
    resolution: {integrity: sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==}

  resolve@1.22.10:
    resolution: {integrity: sha512-NPRy+/ncIMeDlTAsuqwKIiferiawhefFJtkNSW0qZJEqMEb+qBt/77B/jGeeek+F0uOeN05CDa6HXbbIgtVX4w==}
    engines: {node: '>= 0.4'}
    hasBin: true

  resolve@2.0.0-next.5:
    resolution: {integrity: sha512-U7WjGVG9sH8tvjW5SmGbQuui75FiyjAX72HX15DwBBwF9dNiQZRQAg9nnPhYy+TUnE0+VcrttuvNI8oSxZcocA==}
    hasBin: true

  retry@0.13.1:
    resolution: {integrity: sha512-XQBQ3I8W1Cge0Seh+6gjj03LbmRFWuoszgK9ooCpwYIrhhoO80pfq4cUkU5DkknwfOfFteRwlZ56PYOGYyFWdg==}
    engines: {node: '>= 4'}

  reusify@1.0.4:
    resolution: {integrity: sha512-U9nH88a3fc/ekCF1l0/UP1IosiuIjyTh7hBvXVMHYgVcfGvt897Xguj2UOLDeI5BG2m7/uwyaLVT6fbtCwTyzw==}
    engines: {iojs: '>=1.0.0', node: '>=0.10.0'}

  rfdc@1.4.1:
    resolution: {integrity: sha512-q1b3N5QkRUWUl7iyylaaj3kOpIT0N2i9MqIEQXP73GVsN9cw3fdx8X63cEmWhJGi2PPCF23Ijp7ktmd39rawIA==}

  rimraf@3.0.2:
    resolution: {integrity: sha512-JZkJMZkAGFFPP2YqXZXPbMlMBgsxzE8ILs4lMIX/2o0L9UBw9O/Y3o6wFw/i9YLapcUJWwqbi3kdxIPdC62TIA==}
    deprecated: Rimraf versions prior to v4 are no longer supported
    hasBin: true

  router@2.1.0:
    resolution: {integrity: sha512-/m/NSLxeYEgWNtyC+WtNHCF7jbGxOibVWKnn+1Psff4dJGOfoXP+MuC/f2CwSmyiHdOIzYnYFp4W6GxWfekaLA==}
    engines: {node: '>= 18'}

  run-parallel@1.2.0:
    resolution: {integrity: sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==}

  rxjs@7.8.1:
    resolution: {integrity: sha512-AA3TVj+0A2iuIoQkWEK/tqFjBq2j+6PO6Y0zJcvzLAFhEFIO3HL0vls9hWLncZbAAbK0mar7oZ4V079I/qPMxg==}

  safe-array-concat@1.1.3:
    resolution: {integrity: sha512-AURm5f0jYEOydBj7VQlVvDrjeFgthDdEF5H1dP+6mNpoXOMo1quQqJ4wvJDyRZ9+pO3kGWoOdmV08cSv2aJV6Q==}
    engines: {node: '>=0.4'}

  safe-buffer@5.1.2:
    resolution: {integrity: sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==}

  safe-buffer@5.2.1:
    resolution: {integrity: sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==}

  safe-push-apply@1.0.0:
    resolution: {integrity: sha512-iKE9w/Z7xCzUMIZqdBsp6pEQvwuEebH4vdpjcDWnyzaI6yl6O9FHvVpmGelvEHNsoY6wGblkxR6Zty/h00WiSA==}
    engines: {node: '>= 0.4'}

  safe-regex-test@1.1.0:
    resolution: {integrity: sha512-x/+Cz4YrimQxQccJf5mKEbIa1NzeCRNI5Ecl/ekmlYaampdNLPalVyIcCZNNH3MvmqBugV5TMYZXv0ljslUlaw==}
    engines: {node: '>= 0.4'}

  safer-buffer@2.1.2:
    resolution: {integrity: sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==}

  scheduler@0.23.2:
    resolution: {integrity: sha512-UOShsPwz7NrMUqhR6t0hWjFduvOzbtv7toDH1/hIrfRNIDBnnBWd0CwJTGvTpngVlmwGCdP9/Zl/tVrDqcuYzQ==}

  semver@6.3.1:
    resolution: {integrity: sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==}
    hasBin: true

  semver@7.7.1:
    resolution: {integrity: sha512-hlq8tAfn0m/61p4BVRcPzIGr6LKiMwo4VM6dGi6pt4qcRkmNzTcWq6eCEjEh+qXjkMDvPlOFFSGwQjoEa6gyMA==}
    engines: {node: '>=10'}
    hasBin: true

  send@1.1.0:
    resolution: {integrity: sha512-v67WcEouB5GxbTWL/4NeToqcZiAWEq90N888fczVArY8A79J0L4FD7vj5hm3eUMua5EpoQ59wa/oovY6TLvRUA==}
    engines: {node: '>= 18'}

  serve-static@2.1.0:
    resolution: {integrity: sha512-A3We5UfEjG8Z7VkDv6uItWw6HY2bBSBJT1KtVESn6EOoOr2jAxNhxWCLY3jDE2WcuHXByWju74ck3ZgLwL8xmA==}
    engines: {node: '>= 18'}

  server-only@0.0.1:
    resolution: {integrity: sha512-qepMx2JxAa5jjfzxG79yPPq+8BuFToHd1hm7kI+Z4zAq1ftQiP7HcxMhDDItrbtwVeLg/cY2JnKnrcFkmiswNA==}

  set-function-length@1.2.2:
    resolution: {integrity: sha512-pgRc4hJ4/sNjWCSS9AmnS40x3bNMDTknHgL5UaMBTMyJnU90EgWh1Rz+MC9eFu4BuN/UwZjKQuY/1v3rM7HMfg==}
    engines: {node: '>= 0.4'}

  set-function-name@2.0.2:
    resolution: {integrity: sha512-7PGFlmtwsEADb0WYyvCMa1t+yke6daIG4Wirafur5kcf+MhUnPms1UeR0CKQdTZD81yESwMHbtn+TR+dMviakQ==}
    engines: {node: '>= 0.4'}

  set-proto@1.0.0:
    resolution: {integrity: sha512-RJRdvCo6IAnPdsvP/7m6bsQqNnn1FCBX5ZNtFL98MmFF/4xAIJTIg1YbHW5DC2W5SKZanrC6i4HsJqlajw/dZw==}
    engines: {node: '>= 0.4'}

  setprototypeof@1.2.0:
    resolution: {integrity: sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==}

  sharp@0.33.5:
    resolution: {integrity: sha512-haPVm1EkS9pgvHrQ/F3Xy+hgcuMV0Wm9vfIBSiwZ05k+xgb0PkBQpGsAA/oWdDobNaZTH5ppvHtzCFbnSEwHVw==}
    engines: {node: ^18.17.0 || ^20.3.0 || >=21.0.0}

  shebang-command@2.0.0:
    resolution: {integrity: sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==}
    engines: {node: '>=8'}

  shebang-regex@3.0.0:
    resolution: {integrity: sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==}
    engines: {node: '>=8'}

  side-channel-list@1.0.0:
    resolution: {integrity: sha512-FCLHtRD/gnpCiCHEiJLOwdmFP+wzCmDEkc9y7NsYxeF4u7Btsn1ZuwgwJGxImImHicJArLP4R0yX4c2KCrMrTA==}
    engines: {node: '>= 0.4'}

  side-channel-map@1.0.1:
    resolution: {integrity: sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==}
    engines: {node: '>= 0.4'}

  side-channel-weakmap@1.0.2:
    resolution: {integrity: sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==}
    engines: {node: '>= 0.4'}

  side-channel@1.1.0:
    resolution: {integrity: sha512-ZX99e6tRweoUXqR+VBrslhda51Nh5MTQwou5tnUDgbtyM0dBgmhEDtWGP/xbKn6hqfPRHujUNwz5fy/wbbhnpw==}
    engines: {node: '>= 0.4'}

  signal-exit@4.1.0:
    resolution: {integrity: sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw==}
    engines: {node: '>=14'}

  simple-swizzle@0.2.2:
    resolution: {integrity: sha512-JA//kQgZtbuY83m+xT+tXJkmJncGMTFT+C+g2h2R9uxkYIrE2yy9sgmcLhCnw57/WSD+Eh3J97FPEDFnbXnDUg==}

  simple-wcswidth@1.0.1:
    resolution: {integrity: sha512-xMO/8eNREtaROt7tJvWJqHBDTMFN4eiQ5I4JRMuilwfnFcV5W9u7RUkueNkdw0jPqGMX36iCywelS5yilTuOxg==}

  slash@3.0.0:
    resolution: {integrity: sha512-g9Q1haeby36OSStwb4ntCGGGaKsaVSjQ68fBxoQcutl5fS1vuY18H3wSt3jFyFtrkx+Kz0V1G85A4MyAdDMi2Q==}
    engines: {node: '>=8'}

  socket.io-adapter@2.5.5:
    resolution: {integrity: sha512-eLDQas5dzPgOWCk9GuuJC2lBqItuhKI4uxGgo9aIV7MYbk2h9Q6uULEh8WBzThoI7l+qU9Ast9fVUmkqPP9wYg==}

  socket.io-parser@4.2.4:
    resolution: {integrity: sha512-/GbIKmo8ioc+NIWIhwdecY0ge+qVBSMdgxGygevmdHj24bsfgtCmcUUcQ5ZzcylGFHsN3k4HB4Cgkl96KVnuew==}
    engines: {node: '>=10.0.0'}

  socket.io@4.8.1:
    resolution: {integrity: sha512-oZ7iUCxph8WYRHHcjBEc9unw3adt5CmSNlppj/5Q4k2RIrhl8Z5yY2Xr4j9zj0+wzVZ0bxmYoGSzKJnRl6A4yg==}
    engines: {node: '>=10.2.0'}

  sonner@1.7.4:
    resolution: {integrity: sha512-DIS8z4PfJRbIyfVFDVnK9rO3eYDtse4Omcm6bt0oEr5/jtLgysmjuBl1frJ9E/EQZrFmKx2A8m/s5s9CRXIzhw==}
    peerDependencies:
      react: ^18.0.0 || ^19.0.0 || ^19.0.0-rc
      react-dom: ^18.0.0 || ^19.0.0 || ^19.0.0-rc

  source-map-js@1.2.1:
    resolution: {integrity: sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==}
    engines: {node: '>=0.10.0'}

  source-map-support@0.5.21:
    resolution: {integrity: sha512-uBHU3L3czsIyYXKX88fdrGovxdSCoTGDRZ6SYXtSRxLZUzHg5P/66Ht6uoUlHu9EZod+inXhKo3qQgwXUT/y1w==}

  source-map@0.6.1:
    resolution: {integrity: sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==}
    engines: {node: '>=0.10.0'}

  split2@4.2.0:
    resolution: {integrity: sha512-UcjcJOWknrNkF6PLX83qcHM6KHgVKNkV62Y8a5uYDVv9ydGQVwAHMKqHdJje1VTWpljG0WYpCDhrCdAOYH4TWg==}
    engines: {node: '>= 10.x'}

  stable-hash@0.0.4:
    resolution: {integrity: sha512-LjdcbuBeLcdETCrPn9i8AYAZ1eCtu4ECAWtP7UleOiZ9LzVxRzzUZEoZ8zB24nhkQnDWyET0I+3sWokSDS3E7g==}

  standard-as-callback@2.1.0:
    resolution: {integrity: sha512-qoRRSyROncaz1z0mvYqIE4lCd9p2R90i6GxW3uZv5ucSu8tU7B5HXUP1gG8pVZsYNVaXjk8ClXHPttLyxAL48A==}

  statuses@2.0.1:
    resolution: {integrity: sha512-RwNA9Z/7PrK06rYLIzFMlaF+l73iwpzsqRIFgbMLbTcLD6cOao82TaWefPXQvB2fOC4AjuYSEndS7N/mTCbkdQ==}
    engines: {node: '>= 0.8'}

  streamsearch@1.1.0:
    resolution: {integrity: sha512-Mcc5wHehp9aXz1ax6bZUyY5afg9u2rv5cqQI3mRrYkGC8rW2hM02jWuwjtL++LS5qinSyhj2QfLyNsuc+VsExg==}
    engines: {node: '>=10.0.0'}

  string-width@4.2.3:
    resolution: {integrity: sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==}
    engines: {node: '>=8'}

  string-width@5.1.2:
    resolution: {integrity: sha512-HnLOCR3vjcY8beoNLtcjZ5/nxn2afmME6lhrDrebokqMap+XbeW8n9TXpPDOqdGK5qcI3oT0GKTW6wC7EMiVqA==}
    engines: {node: '>=12'}

  string.prototype.includes@2.0.1:
    resolution: {integrity: sha512-o7+c9bW6zpAdJHTtujeePODAhkuicdAryFsfVKwA+wGw89wJ4GTY484WTucM9hLtDEOpOvI+aHnzqnC5lHp4Rg==}
    engines: {node: '>= 0.4'}

  string.prototype.matchall@4.0.12:
    resolution: {integrity: sha512-6CC9uyBL+/48dYizRf7H7VAYCMCNTBeM78x/VTUe9bFEaxBepPJDa1Ow99LqI/1yF7kuy7Q3cQsYMrcjGUcskA==}
    engines: {node: '>= 0.4'}

  string.prototype.repeat@1.0.0:
    resolution: {integrity: sha512-0u/TldDbKD8bFCQ/4f5+mNRrXwZ8hg2w7ZR8wa16e8z9XpePWl3eGEcUD0OXpEH/VJH/2G3gjUtR3ZOiBe2S/w==}

  string.prototype.trim@1.2.10:
    resolution: {integrity: sha512-Rs66F0P/1kedk5lyYyH9uBzuiI/kNRmwJAR9quK6VOtIpZ2G+hMZd+HQbbv25MgCA6gEffoMZYxlTod4WcdrKA==}
    engines: {node: '>= 0.4'}

  string.prototype.trimend@1.0.9:
    resolution: {integrity: sha512-G7Ok5C6E/j4SGfyLCloXTrngQIQU3PWtXGst3yM7Bea9FRURf1S42ZHlZZtsNque2FN2PoUhfZXYLNWwEr4dLQ==}
    engines: {node: '>= 0.4'}

  string.prototype.trimstart@1.0.8:
    resolution: {integrity: sha512-UXSH262CSZY1tfu3G3Secr6uGLCFVPMhIqHjlgCUtCCcgihYc/xKs9djMTMUOb2j1mVSeU8EU6NWc/iQKU6Gfg==}
    engines: {node: '>= 0.4'}

  string_decoder@1.1.1:
    resolution: {integrity: sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==}

  string_decoder@1.3.0:
    resolution: {integrity: sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==}

  strip-ansi@3.0.1:
    resolution: {integrity: sha512-VhumSSbBqDTP8p2ZLKj40UjBCV4+v8bUSEpUb4KjRgWk9pbqGF4REFj6KEagidb2f/M6AzC0EmFyDNGaw9OCzg==}
    engines: {node: '>=0.10.0'}

  strip-ansi@6.0.1:
    resolution: {integrity: sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==}
    engines: {node: '>=8'}

  strip-ansi@7.1.0:
    resolution: {integrity: sha512-iq6eVVI64nQQTRYq2KtEg2d2uU7LElhTJwsH4YzIHZshxlgZms/wIc4VoDQTlG/IvVIrBKG06CrZnp0qv7hkcQ==}
    engines: {node: '>=12'}

  strip-bom@3.0.0:
    resolution: {integrity: sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA==}
    engines: {node: '>=4'}

  strip-json-comments@3.1.1:
    resolution: {integrity: sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==}
    engines: {node: '>=8'}

  styled-jsx@5.1.6:
    resolution: {integrity: sha512-qSVyDTeMotdvQYoHWLNGwRFJHC+i+ZvdBRYosOFgC+Wg1vx4frN2/RG/NA7SYqqvKNLf39P2LSRA2pu6n0XYZA==}
    engines: {node: '>= 12.0.0'}
    peerDependencies:
      '@babel/core': '*'
      babel-plugin-macros: '*'
      react: '>= 16.8.0 || 17.x.x || ^18.0.0-0 || ^19.0.0-0'
    peerDependenciesMeta:
      '@babel/core':
        optional: true
      babel-plugin-macros:
        optional: true

  sucrase@3.35.0:
    resolution: {integrity: sha512-8EbVDiu9iN/nESwxeSxDKe0dunta1GOlHufmSSXxMD2z2/tMZpDMpvXQGsc+ajGo8y2uYUmixaSRUc/QPoQ0GA==}
    engines: {node: '>=16 || 14 >=14.17'}
    hasBin: true

  superjson@2.2.2:
    resolution: {integrity: sha512-5JRxVqC8I8NuOUjzBbvVJAKNM8qoVuH0O77h4WInc/qC2q5IreqKxYwgkga3PfA22OayK2ikceb/B26dztPl+Q==}
    engines: {node: '>=16'}

  supports-color@2.0.0:
    resolution: {integrity: sha512-KKNVtd6pCYgPIKU4cp2733HWYCpplQhddZLBUryaAHou723x+FRzQ5Df824Fj+IyyuiQTRoub4SnIFfIcrp70g==}
    engines: {node: '>=0.8.0'}

  supports-color@7.2.0:
    resolution: {integrity: sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==}
    engines: {node: '>=8'}

  supports-preserve-symlinks-flag@1.0.0:
    resolution: {integrity: sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==}
    engines: {node: '>= 0.4'}

  synckit@0.9.2:
    resolution: {integrity: sha512-vrozgXDQwYO72vHjUb/HnFbQx1exDjoKzqx23aXEg2a9VIg2TSFZ8FmeZpTjUCFMYw7mpX4BE2SFu8wI7asYsw==}
    engines: {node: ^14.18.0 || >=16.0.0}

  tailwind-merge@3.0.1:
    resolution: {integrity: sha512-AvzE8FmSoXC7nC+oU5GlQJbip2UO7tmOhOfQyOmPhrStOGXHU08j8mZEHZ4BmCqY5dWTCo4ClWkNyRNx1wpT0g==}

  tailwindcss-animate@1.0.7:
    resolution: {integrity: sha512-bl6mpH3T7I3UFxuvDEXLxy/VuFxBk5bbzplh7tXI68mwMokNYd1t9qPBHlnyTwfa4JGC4zP516I1hYYtQ/vspA==}
    peerDependencies:
      tailwindcss: '>=3.0.0 || insiders'

  tailwindcss@3.4.17:
    resolution: {integrity: sha512-w33E2aCvSDP0tW9RZuNXadXlkHXqFzSkQew/aIa2i/Sj8fThxwovwlXHSPXTbAHwEIhBFXAedUhP2tueAKP8Og==}
    engines: {node: '>=14.0.0'}
    hasBin: true

  tapable@2.2.1:
    resolution: {integrity: sha512-GNzQvQTOIP6RyTfE2Qxb8ZVlNmw0n88vp1szwWRimP02mnTsx3Wtn5qRdqY9w2XduFNUgvOwhNnQsjwCp+kqaQ==}
    engines: {node: '>=6'}

  text-table@0.2.0:
    resolution: {integrity: sha512-N+8UisAXDGk8PFXP4HAzVR9nbfmVJ3zYLAWiTIoqC5v5isinhr+r5uaO8+7r3BMfuNIufIsA7RdpVgacC2cSpw==}

  thenify-all@1.6.0:
    resolution: {integrity: sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA==}
    engines: {node: '>=0.8'}

  thenify@3.3.1:
    resolution: {integrity: sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw==}

  to-regex-range@5.0.1:
    resolution: {integrity: sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==}
    engines: {node: '>=8.0'}

  toidentifier@1.0.1:
    resolution: {integrity: sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==}
    engines: {node: '>=0.6'}

  tr46@0.0.3:
    resolution: {integrity: sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==}

  ts-api-utils@1.4.3:
    resolution: {integrity: sha512-i3eMG77UTMD0hZhgRS562pv83RC6ukSAC2GMNWc+9dieh/+jDM5u5YG+NHX6VNDRHQcHwmsTHctP9LhbC3WxVw==}
    engines: {node: '>=16'}
    peerDependencies:
      typescript: '>=4.2.0'

  ts-api-utils@2.0.1:
    resolution: {integrity: sha512-dnlgjFSVetynI8nzgJ+qF62efpglpWRk8isUEWZGWlJYySCTD6aKvbUDu+zbPeDakk3bg5H4XpitHukgfL1m9w==}
    engines: {node: '>=18.12'}
    peerDependencies:
      typescript: '>=4.8.4'

  ts-interface-checker@0.1.13:
    resolution: {integrity: sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA==}

  tsconfig-paths@3.15.0:
    resolution: {integrity: sha512-2Ac2RgzDe/cn48GvOe3M+o82pEFewD3UPbyoUHHdKasHwJKjds4fLXWf/Ux5kATBKN20oaFGu+jbElp1pos0mg==}

  tslib@2.8.1:
    resolution: {integrity: sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==}

  tweetnacl@1.0.3:
    resolution: {integrity: sha512-6rt+RN7aOi1nGMyC4Xa5DdYiukl2UWCbcJft7YhxReBGQD7OAM8Pbxw6YMo4r2diNEA8FEmu32YOn9rhaiE5yw==}

  type-check@0.4.0:
    resolution: {integrity: sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==}
    engines: {node: '>= 0.8.0'}

  type-fest@0.20.2:
    resolution: {integrity: sha512-Ne+eE4r0/iWnpAxD852z3A+N0Bt5RN//NjJwRd2VFHEmrywxf5vsZlh4R6lixl6B+wz/8d+maTSAkN1FIkI3LQ==}
    engines: {node: '>=10'}

  type-is@1.6.18:
    resolution: {integrity: sha512-TkRKr9sUTxEH8MdfuCSP7VizJyzRNMjj2J2do2Jr3Kym598JVdEksuzPQCnlFPW4ky9Q+iA+ma9BGm06XQBy8g==}
    engines: {node: '>= 0.6'}

  type-is@2.0.0:
    resolution: {integrity: sha512-gd0sGezQYCbWSbkZr75mln4YBidWUN60+devscpLF5mtRDUpiaTvKpBNrdaCvel1NdR2k6vclXybU5fBd2i+nw==}
    engines: {node: '>= 0.6'}

  typed-array-buffer@1.0.3:
    resolution: {integrity: sha512-nAYYwfY3qnzX30IkA6AQZjVbtK6duGontcQm1WSG1MD94YLqK0515GNApXkoxKOWMusVssAHWLh9SeaoefYFGw==}
    engines: {node: '>= 0.4'}

  typed-array-byte-length@1.0.3:
    resolution: {integrity: sha512-BaXgOuIxz8n8pIq3e7Atg/7s+DpiYrxn4vdot3w9KbnBhcRQq6o3xemQdIfynqSeXeDrF32x+WvfzmOjPiY9lg==}
    engines: {node: '>= 0.4'}

  typed-array-byte-offset@1.0.4:
    resolution: {integrity: sha512-bTlAFB/FBYMcuX81gbL4OcpH5PmlFHqlCCpAl8AlEzMz5k53oNDvN8p1PNOWLEmI2x4orp3raOFB51tv9X+MFQ==}
    engines: {node: '>= 0.4'}

  typed-array-length@1.0.7:
    resolution: {integrity: sha512-3KS2b+kL7fsuk/eJZ7EQdnEmQoaho/r6KUef7hxvltNA5DR8NAUM+8wJMbJyZ4G9/7i3v5zPBIMN5aybAh2/Jg==}
    engines: {node: '>= 0.4'}

  typedarray@0.0.6:
    resolution: {integrity: sha512-/aCDEGatGvZ2BIk+HmLf4ifCJFwvKFNb9/JeZPMulfgFracn9QFcAf5GO8B/mweUjSoblS5In0cWhqpfs/5PQA==}

  typescript@5.7.3:
    resolution: {integrity: sha512-84MVSjMEHP+FQRPy3pX9sTVV/INIex71s9TL2Gm5FG/WG1SqXeKyZ0k7/blY/4FdOzI12CBy1vGc4og/eus0fw==}
    engines: {node: '>=14.17'}
    hasBin: true

  uid@2.0.2:
    resolution: {integrity: sha512-u3xV3X7uzvi5b1MncmZo3i2Aw222Zk1keqLA1YkHldREkAhAqi65wuPfe7lHx8H/Wzy+8CE7S7uS3jekIM5s8g==}
    engines: {node: '>=8'}

  unbox-primitive@1.1.0:
    resolution: {integrity: sha512-nWJ91DjeOkej/TA8pXQ3myruKpKEYgqvpw9lz4OPHj/NWFNluYrjbz9j01CJ8yKQd2g4jFoOkINCTW2I5LEEyw==}
    engines: {node: '>= 0.4'}

  undici-types@5.26.5:
    resolution: {integrity: sha512-JlCMO+ehdEIKqlFxk6IfVoAUVmgz7cU7zD/h9XZ0qzeosSHmUJVOzSQvvYSYWXkFXC+IfLKSIffhv0sVZup6pA==}

  undici-types@6.19.8:
    resolution: {integrity: sha512-ve2KP6f/JnbPBFyobGHuerC9g1FYGn/F8n1LWTwNxCEzd6IfqTwUQcNXgEtmmQ6DlRrC1hrSrBnCZPokRrDHjw==}

  undici@6.21.1:
    resolution: {integrity: sha512-q/1rj5D0/zayJB2FraXdaWxbhWiNKDvu8naDT2dl1yTlvJp4BLtOcp2a5BvgGNQpYYJzau7tf1WgKv3b+7mqpQ==}
    engines: {node: '>=18.17'}

  unpipe@1.0.0:
    resolution: {integrity: sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==}
    engines: {node: '>= 0.8'}

  update-browserslist-db@1.1.2:
    resolution: {integrity: sha512-PPypAm5qvlD7XMZC3BujecnaOxwhrtoFR+Dqkk5Aa/6DssiH0ibKoketaj9w8LP7Bont1rYeoV5plxD7RTEPRg==}
    hasBin: true
    peerDependencies:
      browserslist: '>= 4.21.0'

  uri-js@4.4.1:
    resolution: {integrity: sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==}

  url-parse@1.5.10:
    resolution: {integrity: sha512-WypcfiRhfeUP9vvF0j6rw0J3hrWrw6iZv3+22h6iRMJ/8z1Tj6XfLP4DsUix5MhMPnXpiHDoKyoZ/bdCkwBCiQ==}

  use-callback-ref@1.3.3:
    resolution: {integrity: sha512-jQL3lRnocaFtu3V00JToYz/4QkNWswxijDaCVNZRiRTO3HQDLsdu1ZtmIUvV4yPp+rvWm5j0y0TG/S61cuijTg==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  use-sidecar@1.1.3:
    resolution: {integrity: sha512-Fedw0aZvkhynoPYlA5WXrMCAMm+nSWdZt6lzJQ7Ok8S6Q+VsHmHpRWndVRJ8Be0ZbkfPc5LRYH+5XrzXcEeLRQ==}
    engines: {node: '>=10'}
    peerDependencies:
      '@types/react': '*'
      react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0 || ^19.0.0-rc
    peerDependenciesMeta:
      '@types/react':
        optional: true

  util-deprecate@1.0.2:
    resolution: {integrity: sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==}

  utils-merge@1.0.1:
    resolution: {integrity: sha512-pMZTvIkT1d+TFGvDOqodOclx0QWkkgi6Tdoa8gC8ffGAAqz9pzPTZWAybbsHHoED/ztMtkv/VoYTYyShUn81hA==}
    engines: {node: '>= 0.4.0'}

  uuid@10.0.0:
    resolution: {integrity: sha512-8XkAphELsDnEGrDxUOHB3RGvXz6TeuYSGEZBOjtTtPm2lwhGBjLgOzLHB63IUWfBpNucQjND6d3AOudO+H3RWQ==}
    hasBin: true

  validator@13.12.0:
    resolution: {integrity: sha512-c1Q0mCiPlgdTVVVIJIrBuxNicYE+t/7oKeI9MWLj3fh/uq2Pxh/3eeWbVZ4OcGW1TUf53At0njHw5SMdA3tmMg==}
    engines: {node: '>= 0.10'}

  vary@1.1.2:
    resolution: {integrity: sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==}
    engines: {node: '>= 0.8'}

  vue-eslint-parser@9.4.3:
    resolution: {integrity: sha512-2rYRLWlIpaiN8xbPiDyXZXRgLGOtWxERV7ND5fFAv5qo1D2N9Fu9MNajBNc6o13lZ+24DAWCkQCvj4klgmcITg==}
    engines: {node: ^14.17.0 || >=16.0.0}
    peerDependencies:
      eslint: '>=6.0.0'

  web-streams-polyfill@3.3.3:
    resolution: {integrity: sha512-d2JWLCivmZYTSIoge9MsgFCZrt571BikcWGYkjC1khllbTeDlGqZ2D8vD8E/lJa8WGWbb7Plm8/XJYV7IJHZZw==}
    engines: {node: '>= 8'}

  web-streams-polyfill@4.0.0-beta.3:
    resolution: {integrity: sha512-QW95TCTaHmsYfHDybGMwO5IJIM93I/6vTRk+daHTWFPhwh+C8Cg7j7XyKrwrj8Ib6vYXe0ocYNrmzY4xAAN6ug==}
    engines: {node: '>= 14'}

  webidl-conversions@3.0.1:
    resolution: {integrity: sha512-2JAn3z8AR6rjK8Sm8orRC0h/bcl/DqL7tRPdGZ4I1CjdF+EaMLmYxBHyXuKL849eucPFhvBoxMsflfOb8kxaeQ==}

  whatwg-encoding@3.1.1:
    resolution: {integrity: sha512-6qN4hJdMwfYBtE3YBTTHhoeuUrDBPZmbQaxWAqSALV/MeEnR5z1xd8UKud2RAkFoPkmB+hli1TZSnyi84xz1vQ==}
    engines: {node: '>=18'}

  whatwg-mimetype@4.0.0:
    resolution: {integrity: sha512-QaKxh0eNIi2mE9p2vEdzfagOKHCcj1pJ56EEHGQOVxp8r9/iszLUUV7v89x9O1p/T+NlTM5W7jW6+cz4Fq1YVg==}
    engines: {node: '>=18'}

  whatwg-url@5.0.0:
    resolution: {integrity: sha512-saE57nupxk6v3HY35+jzBwYa0rKSy0XR8JSxZPwgLr7ys0IBzhGviA1/TUGJLmSVqs8pb9AnvICXEuOHLprYTw==}

  which-boxed-primitive@1.1.1:
    resolution: {integrity: sha512-TbX3mj8n0odCBFVlY8AxkqcHASw3L60jIuF8jFP78az3C2YhmGvqbHBpAjTRH2/xqYunrJ9g1jSyjCjpoWzIAA==}
    engines: {node: '>= 0.4'}

  which-builtin-type@1.2.1:
    resolution: {integrity: sha512-6iBczoX+kDQ7a3+YJBnh3T+KZRxM/iYNPXicqk66/Qfm1b93iu+yOImkg0zHbj5LNOcNv1TEADiZ0xa34B4q6Q==}
    engines: {node: '>= 0.4'}

  which-collection@1.0.2:
    resolution: {integrity: sha512-K4jVyjnBdgvc86Y6BkaLZEN933SwYOuBFkdmBu9ZfkcAbdVbpITnDmjvZ/aQjRXQrv5EPkTnD1s39GiiqbngCw==}
    engines: {node: '>= 0.4'}

  which-typed-array@1.1.18:
    resolution: {integrity: sha512-qEcY+KJYlWyLH9vNbsr6/5j59AXk5ni5aakf8ldzBvGde6Iz4sxZGkJyWSAueTG7QhOvNRYb1lDdFmL5Td0QKA==}
    engines: {node: '>= 0.4'}

  which@2.0.2:
    resolution: {integrity: sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==}
    engines: {node: '>= 8'}
    hasBin: true

  word-wrap@1.2.5:
    resolution: {integrity: sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==}
    engines: {node: '>=0.10.0'}

  worker-timers-broker@6.1.8:
    resolution: {integrity: sha512-FUCJu9jlK3A8WqLTKXM9E6kAmI/dR1vAJ8dHYLMisLNB/n3GuaFIjJ7pn16ZcD1zCOf7P6H62lWIEBi+yz/zQQ==}

  worker-timers-worker@7.0.71:
    resolution: {integrity: sha512-ks/5YKwZsto1c2vmljroppOKCivB/ma97g9y77MAAz2TBBjPPgpoOiS1qYQKIgvGTr2QYPT3XhJWIB6Rj2MVPQ==}

  worker-timers@7.1.8:
    resolution: {integrity: sha512-R54psRKYVLuzff7c1OTFcq/4Hue5Vlz4bFtNEIarpSiCYhpifHU3aIQI29S84o1j87ePCYqbmEJPqwBTf+3sfw==}

  wrap-ansi@7.0.0:
    resolution: {integrity: sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==}
    engines: {node: '>=10'}

  wrap-ansi@8.1.0:
    resolution: {integrity: sha512-si7QWI6zUMq56bESFvagtmzMdGOtoxfR+Sez11Mobfc7tm+VkUckk9bW2UeffTGVUbOksxmSw0AA2gs8g71NCQ==}
    engines: {node: '>=12'}

  wrappy@1.0.2:
    resolution: {integrity: sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==}

  ws@8.17.1:
    resolution: {integrity: sha512-6XQFvXTkbfUOZOKKILFG1PDK2NDQs4azKQl26T0YS5CxqWLgXajbPZ+h4gZekJyRqFU8pvnbAbbs/3TgRPy+GQ==}
    engines: {node: '>=10.0.0'}
    peerDependencies:
      bufferutil: ^4.0.1
      utf-8-validate: '>=5.0.2'
    peerDependenciesMeta:
      bufferutil:
        optional: true
      utf-8-validate:
        optional: true

  xtend@4.0.2:
    resolution: {integrity: sha512-LKYU1iAXJXUgAXn9URjiu+MWhyUXHsvfp7mcuYm9dSUKK0/CjtrUwFAxD82/mCWbtLsGjFIad0wIsod4zrTAEQ==}
    engines: {node: '>=0.4'}

  y18n@5.0.8:
    resolution: {integrity: sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==}
    engines: {node: '>=10'}

  yaml@2.7.0:
    resolution: {integrity: sha512-+hSoy/QHluxmC9kCIJyL/uyFmLmc+e5CFR5Wa+bpIhIj85LVb9ZH2nVnqrHoSvKogwODv0ClqZkmiSSaIH5LTA==}
    engines: {node: '>= 14'}
    hasBin: true

  yargs-parser@21.1.1:
    resolution: {integrity: sha512-tVpsJW7DdjecAiFpbIB1e3qxIQsE6NoPc5/eTdrbbIC4h0LVsWhnoa3g+m2HclBIujHzsxZ4VJVA+GUuc2/LBw==}
    engines: {node: '>=12'}

  yargs@17.7.2:
    resolution: {integrity: sha512-7dSzzRQ++CKnNI/krKnYRV7JKKPUXMEh61soaHKg9mrWEhzFWhFnxPxGl+69cD1Ou63C13NUPCnmIcrvqCuM6w==}
    engines: {node: '>=12'}

  yocto-queue@0.1.0:
    resolution: {integrity: sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==}
    engines: {node: '>=10'}

  zod-to-json-schema@3.24.1:
    resolution: {integrity: sha512-3h08nf3Vw3Wl3PK+q3ow/lIil81IT2Oa7YpQyUUDsEWbXveMesdfK1xBd2RhCkynwZndAxixji/7SYJJowr62w==}
    peerDependencies:
      zod: ^3.24.1

  zod@3.24.2:
    resolution: {integrity: sha512-lY7CDW43ECgW9u1TcT3IoXHflywfVqDYze4waEz812jR/bZ8FHDsl7pFQoSZTz5N+2NqRXs8GBwnAwo3ZNxqhQ==}

snapshots:

  '@acuminous/bitsyntax@0.1.2':
    dependencies:
      buffer-more-ints: 1.0.0
      debug: 4.4.0
      safe-buffer: 5.1.2
    transitivePeerDependencies:
      - supports-color

  '@alloc/quick-lru@5.2.0': {}

  '@auth/core@0.37.2':
    dependencies:
      '@panva/hkdf': 1.2.1
      '@types/cookie': 0.6.0
      cookie: 0.7.1
      jose: 5.9.6
      oauth4webapi: 3.1.4
      preact: 10.11.3
      preact-render-to-string: 5.2.3(preact@10.11.3)

  '@auth/core@0.37.4':
    dependencies:
      '@panva/hkdf': 1.2.1
      jose: 5.9.6
      oauth4webapi: 3.1.4
      preact: 10.24.3
      preact-render-to-string: 6.5.11(preact@10.24.3)

  '@auth/drizzle-adapter@1.7.4':
    dependencies:
      '@auth/core': 0.37.4
    transitivePeerDependencies:
      - '@simplewebauthn/browser'
      - '@simplewebauthn/server'
      - nodemailer

  '@babel/runtime@7.26.7':
    dependencies:
      regenerator-runtime: 0.14.1

  '@cfworker/json-schema@4.1.1': {}

  '@drizzle-team/brocli@0.10.2': {}

  '@emnapi/runtime@1.3.1':
    dependencies:
      tslib: 2.8.1
    optional: true

  '@esbuild-kit/core-utils@3.3.2':
    dependencies:
      esbuild: 0.18.20
      source-map-support: 0.5.21

  '@esbuild-kit/esm-loader@2.6.5':
    dependencies:
      '@esbuild-kit/core-utils': 3.3.2
      get-tsconfig: 4.10.0

  '@esbuild/aix-ppc64@0.19.12':
    optional: true

  '@esbuild/android-arm64@0.18.20':
    optional: true

  '@esbuild/android-arm64@0.19.12':
    optional: true

  '@esbuild/android-arm@0.18.20':
    optional: true

  '@esbuild/android-arm@0.19.12':
    optional: true

  '@esbuild/android-x64@0.18.20':
    optional: true

  '@esbuild/android-x64@0.19.12':
    optional: true

  '@esbuild/darwin-arm64@0.18.20':
    optional: true

  '@esbuild/darwin-arm64@0.19.12':
    optional: true

  '@esbuild/darwin-x64@0.18.20':
    optional: true

  '@esbuild/darwin-x64@0.19.12':
    optional: true

  '@esbuild/freebsd-arm64@0.18.20':
    optional: true

  '@esbuild/freebsd-arm64@0.19.12':
    optional: true

  '@esbuild/freebsd-x64@0.18.20':
    optional: true

  '@esbuild/freebsd-x64@0.19.12':
    optional: true

  '@esbuild/linux-arm64@0.18.20':
    optional: true

  '@esbuild/linux-arm64@0.19.12':
    optional: true

  '@esbuild/linux-arm@0.18.20':
    optional: true

  '@esbuild/linux-arm@0.19.12':
    optional: true

  '@esbuild/linux-ia32@0.18.20':
    optional: true

  '@esbuild/linux-ia32@0.19.12':
    optional: true

  '@esbuild/linux-loong64@0.18.20':
    optional: true

  '@esbuild/linux-loong64@0.19.12':
    optional: true

  '@esbuild/linux-mips64el@0.18.20':
    optional: true

  '@esbuild/linux-mips64el@0.19.12':
    optional: true

  '@esbuild/linux-ppc64@0.18.20':
    optional: true

  '@esbuild/linux-ppc64@0.19.12':
    optional: true

  '@esbuild/linux-riscv64@0.18.20':
    optional: true

  '@esbuild/linux-riscv64@0.19.12':
    optional: true

  '@esbuild/linux-s390x@0.18.20':
    optional: true

  '@esbuild/linux-s390x@0.19.12':
    optional: true

  '@esbuild/linux-x64@0.18.20':
    optional: true

  '@esbuild/linux-x64@0.19.12':
    optional: true

  '@esbuild/netbsd-x64@0.18.20':
    optional: true

  '@esbuild/netbsd-x64@0.19.12':
    optional: true

  '@esbuild/openbsd-x64@0.18.20':
    optional: true

  '@esbuild/openbsd-x64@0.19.12':
    optional: true

  '@esbuild/sunos-x64@0.18.20':
    optional: true

  '@esbuild/sunos-x64@0.19.12':
    optional: true

  '@esbuild/win32-arm64@0.18.20':
    optional: true

  '@esbuild/win32-arm64@0.19.12':
    optional: true

  '@esbuild/win32-ia32@0.18.20':
    optional: true

  '@esbuild/win32-ia32@0.19.12':
    optional: true

  '@esbuild/win32-x64@0.18.20':
    optional: true

  '@esbuild/win32-x64@0.19.12':
    optional: true

  '@eslint-community/eslint-utils@4.4.1(eslint@8.57.1)':
    dependencies:
      eslint: 8.57.1
      eslint-visitor-keys: 3.4.3

  '@eslint-community/regexpp@4.12.1': {}

  '@eslint/eslintrc@2.1.4':
    dependencies:
      ajv: 6.12.6
      debug: 4.4.0
      espree: 9.6.1
      globals: 13.24.0
      ignore: 5.3.2
      import-fresh: 3.3.1
      js-yaml: 4.1.0
      minimatch: 3.1.2
      strip-json-comments: 3.1.1
    transitivePeerDependencies:
      - supports-color

  '@eslint/js@8.57.1': {}

  '@floating-ui/core@1.6.9':
    dependencies:
      '@floating-ui/utils': 0.2.9

  '@floating-ui/dom@1.6.13':
    dependencies:
      '@floating-ui/core': 1.6.9
      '@floating-ui/utils': 0.2.9

  '@floating-ui/react-dom@2.1.2(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@floating-ui/dom': 1.6.13
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)

  '@floating-ui/utils@0.2.9': {}

  '@google/generative-ai@0.21.0':
    optional: true

  '@grpc/grpc-js@1.12.6':
    dependencies:
      '@grpc/proto-loader': 0.7.13
      '@js-sdsl/ordered-map': 4.4.2

  '@grpc/proto-loader@0.7.13':
    dependencies:
      lodash.camelcase: 4.3.0
      long: 5.3.0
      protobufjs: 7.4.0
      yargs: 17.7.2

  '@hookform/resolvers@3.10.0(react-hook-form@7.54.2(react@18.3.1))':
    dependencies:
      react-hook-form: 7.54.2(react@18.3.1)

  '@humanwhocodes/config-array@0.13.0':
    dependencies:
      '@humanwhocodes/object-schema': 2.0.3
      debug: 4.4.0
      minimatch: 3.1.2
    transitivePeerDependencies:
      - supports-color

  '@humanwhocodes/module-importer@1.0.1': {}

  '@humanwhocodes/object-schema@2.0.3': {}

  '@img/sharp-darwin-arm64@0.33.5':
    optionalDependencies:
      '@img/sharp-libvips-darwin-arm64': 1.0.4
    optional: true

  '@img/sharp-darwin-x64@0.33.5':
    optionalDependencies:
      '@img/sharp-libvips-darwin-x64': 1.0.4
    optional: true

  '@img/sharp-libvips-darwin-arm64@1.0.4':
    optional: true

  '@img/sharp-libvips-darwin-x64@1.0.4':
    optional: true

  '@img/sharp-libvips-linux-arm64@1.0.4':
    optional: true

  '@img/sharp-libvips-linux-arm@1.0.5':
    optional: true

  '@img/sharp-libvips-linux-s390x@1.0.4':
    optional: true

  '@img/sharp-libvips-linux-x64@1.0.4':
    optional: true

  '@img/sharp-libvips-linuxmusl-arm64@1.0.4':
    optional: true

  '@img/sharp-libvips-linuxmusl-x64@1.0.4':
    optional: true

  '@img/sharp-linux-arm64@0.33.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-arm64': 1.0.4
    optional: true

  '@img/sharp-linux-arm@0.33.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-arm': 1.0.5
    optional: true

  '@img/sharp-linux-s390x@0.33.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-s390x': 1.0.4
    optional: true

  '@img/sharp-linux-x64@0.33.5':
    optionalDependencies:
      '@img/sharp-libvips-linux-x64': 1.0.4
    optional: true

  '@img/sharp-linuxmusl-arm64@0.33.5':
    optionalDependencies:
      '@img/sharp-libvips-linuxmusl-arm64': 1.0.4
    optional: true

  '@img/sharp-linuxmusl-x64@0.33.5':
    optionalDependencies:
      '@img/sharp-libvips-linuxmusl-x64': 1.0.4
    optional: true

  '@img/sharp-wasm32@0.33.5':
    dependencies:
      '@emnapi/runtime': 1.3.1
    optional: true

  '@img/sharp-win32-ia32@0.33.5':
    optional: true

  '@img/sharp-win32-x64@0.33.5':
    optional: true

  '@ioredis/commands@1.2.0': {}

  '@isaacs/cliui@8.0.2':
    dependencies:
      string-width: 5.1.2
      string-width-cjs: string-width@4.2.3
      strip-ansi: 7.1.0
      strip-ansi-cjs: strip-ansi@6.0.1
      wrap-ansi: 8.1.0
      wrap-ansi-cjs: wrap-ansi@7.0.0

  '@jest/schemas@29.6.3':
    dependencies:
      '@sinclair/typebox': 0.27.8

  '@jridgewell/gen-mapping@0.3.8':
    dependencies:
      '@jridgewell/set-array': 1.2.1
      '@jridgewell/sourcemap-codec': 1.5.0
      '@jridgewell/trace-mapping': 0.3.25

  '@jridgewell/resolve-uri@3.1.2': {}

  '@jridgewell/set-array@1.2.1': {}

  '@jridgewell/sourcemap-codec@1.5.0': {}

  '@jridgewell/trace-mapping@0.3.25':
    dependencies:
      '@jridgewell/resolve-uri': 3.1.2
      '@jridgewell/sourcemap-codec': 1.5.0

  '@js-sdsl/ordered-map@4.4.2': {}

  '@kurkle/color@0.3.4': {}

  '@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2))':
    dependencies:
      '@cfworker/json-schema': 4.1.1
      ansi-styles: 5.2.0
      camelcase: 6.3.0
      decamelize: 1.2.0
      js-tiktoken: 1.0.18
      langsmith: 0.3.7(openai@4.84.0(zod@3.24.2))
      mustache: 4.2.0
      p-queue: 6.6.2
      p-retry: 4.6.2
      uuid: 10.0.0
      zod: 3.24.2
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    transitivePeerDependencies:
      - openai

  '@langchain/google-genai@0.1.8(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))(zod@3.24.2)':
    dependencies:
      '@google/generative-ai': 0.21.0
      '@langchain/core': 0.3.40(openai@4.84.0(zod@3.24.2))
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    transitivePeerDependencies:
      - zod
    optional: true

  '@langchain/groq@0.1.3(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))':
    dependencies:
      '@langchain/core': 0.3.40(openai@4.84.0(zod@3.24.2))
      '@langchain/openai': 0.3.17(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))
      groq-sdk: 0.5.0
      zod: 3.24.2
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    transitivePeerDependencies:
      - encoding
      - ws

  '@langchain/openai@0.3.17(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))':
    dependencies:
      '@langchain/core': 0.3.40(openai@4.84.0(zod@3.24.2))
      js-tiktoken: 1.0.18
      openai: 4.84.0(zod@3.24.2)
      zod: 3.24.2
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    transitivePeerDependencies:
      - encoding
      - ws

  '@langchain/openai@0.4.4(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))':
    dependencies:
      '@langchain/core': 0.3.40(openai@4.84.0(zod@3.24.2))
      js-tiktoken: 1.0.18
      openai: 4.84.0(zod@3.24.2)
      zod: 3.24.2
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    transitivePeerDependencies:
      - encoding
      - ws

  '@langchain/textsplitters@0.1.0(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))':
    dependencies:
      '@langchain/core': 0.3.40(openai@4.84.0(zod@3.24.2))
      js-tiktoken: 1.0.18

  '@lukeed/csprng@1.1.0': {}

  '@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)':
    dependencies:
      iterare: 1.2.1
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.8.1
      uid: 2.0.2
    optionalDependencies:
      class-transformer: 0.5.1
      class-validator: 0.14.1

  '@nestjs/core@11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)':
    dependencies:
      '@nestjs/common': 11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nuxt/opencollective': 0.4.1
      fast-safe-stringify: 2.1.1
      iterare: 1.2.1
      path-to-regexp: 8.2.0
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.8.1
      uid: 2.0.2
    optionalDependencies:
      '@nestjs/microservices': 11.0.9(@grpc/grpc-js@1.12.6)(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/websockets@11.0.9)(amqp-connection-manager@4.1.14(amqplib@0.10.5))(amqplib@0.10.5)(ioredis@5.5.0)(kafkajs@2.2.4)(mqtt@5.10.3)(nats@2.29.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/platform-express': 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)
      '@nestjs/websockets': 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/platform-socket.io@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)

  '@nestjs/microservices@11.0.9(@grpc/grpc-js@1.12.6)(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/websockets@11.0.9)(amqp-connection-manager@4.1.14(amqplib@0.10.5))(amqplib@0.10.5)(ioredis@5.5.0)(kafkajs@2.2.4)(mqtt@5.10.3)(nats@2.29.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)':
    dependencies:
      '@nestjs/common': 11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/core': 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      iterare: 1.2.1
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.8.1
    optionalDependencies:
      '@grpc/grpc-js': 1.12.6
      '@nestjs/websockets': 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/platform-socket.io@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      amqp-connection-manager: 4.1.14(amqplib@0.10.5)
      amqplib: 0.10.5
      ioredis: 5.5.0
      kafkajs: 2.2.4
      mqtt: 5.10.3
      nats: 2.29.1

  '@nestjs/platform-express@11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)':
    dependencies:
      '@nestjs/common': 11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/core': 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      cors: 2.8.5
      express: 5.0.1
      multer: 1.4.5-lts.1
      path-to-regexp: 8.2.0
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color

  '@nestjs/platform-socket.io@11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/websockets@11.0.9)(rxjs@7.8.1)':
    dependencies:
      '@nestjs/common': 11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/websockets': 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/platform-socket.io@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      rxjs: 7.8.1
      socket.io: 4.8.1
      tslib: 2.8.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  '@nestjs/websockets@11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/platform-socket.io@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)':
    dependencies:
      '@nestjs/common': 11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/core': 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      iterare: 1.2.1
      object-hash: 3.0.0
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.8.1
    optionalDependencies:
      '@nestjs/platform-socket.io': 11.0.9(@nestjs/common@11.0.9(class-transformer@0.5.1)(class-validator@0.14.1)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/websockets@11.0.9)(rxjs@7.8.1)

  '@next/env@15.1.7': {}

  '@next/eslint-plugin-next@15.1.7':
    dependencies:
      fast-glob: 3.3.1

  '@next/swc-darwin-arm64@15.1.7':
    optional: true

  '@next/swc-darwin-x64@15.1.7':
    optional: true

  '@next/swc-linux-arm64-gnu@15.1.7':
    optional: true

  '@next/swc-linux-arm64-musl@15.1.7':
    optional: true

  '@next/swc-linux-x64-gnu@15.1.7':
    optional: true

  '@next/swc-linux-x64-musl@15.1.7':
    optional: true

  '@next/swc-win32-arm64-msvc@15.1.7':
    optional: true

  '@next/swc-win32-x64-msvc@15.1.7':
    optional: true

  '@nodelib/fs.scandir@2.1.5':
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      run-parallel: 1.2.0

  '@nodelib/fs.stat@2.0.5': {}

  '@nodelib/fs.walk@1.2.8':
    dependencies:
      '@nodelib/fs.scandir': 2.1.5
      fastq: 1.19.0

  '@nolyfill/is-core-module@1.0.39': {}

  '@nuxt/opencollective@0.4.1':
    dependencies:
      consola: 3.4.0

  '@panva/hkdf@1.2.1': {}

  '@pkgjs/parseargs@0.11.0':
    optional: true

  '@pkgr/core@0.1.1': {}

  '@protobufjs/aspromise@1.1.2': {}

  '@protobufjs/base64@1.1.2': {}

  '@protobufjs/codegen@2.0.4': {}

  '@protobufjs/eventemitter@1.1.0': {}

  '@protobufjs/fetch@1.1.0':
    dependencies:
      '@protobufjs/aspromise': 1.1.2
      '@protobufjs/inquire': 1.1.0

  '@protobufjs/float@1.0.2': {}

  '@protobufjs/inquire@1.1.0': {}

  '@protobufjs/path@1.1.2': {}

  '@protobufjs/pool@1.1.0': {}

  '@protobufjs/utf8@1.1.0': {}

  '@radix-ui/number@1.1.0': {}

  '@radix-ui/primitive@1.1.1': {}

  '@radix-ui/react-arrow@1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-collection@1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-context': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-slot': 1.1.2(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-compose-refs@1.1.1(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-context@1.1.1(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-direction@1.1.0(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-dismissable-layer@1.1.5(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.1
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-escape-keydown': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-focus-guards@1.1.1(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-focus-scope@1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-id@1.1.0(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-label@2.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-popper@1.2.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@floating-ui/react-dom': 2.1.2(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-arrow': 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-context': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-rect': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-size': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/rect': 1.1.0
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-portal@1.1.4(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-presence@1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-primitive@2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/react-slot': 1.1.2(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-progress@1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/react-context': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-roving-focus@1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.1
      '@radix-ui/react-collection': 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-context': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-direction': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-id': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-select@2.1.6(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/number': 1.1.0
      '@radix-ui/primitive': 1.1.1
      '@radix-ui/react-collection': 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-context': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-direction': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-dismissable-layer': 1.1.5(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-focus-guards': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-focus-scope': 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-id': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-popper': 1.2.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-portal': 1.1.4(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-slot': 1.1.2(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-previous': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-visually-hidden': 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      aria-hidden: 1.2.4
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
      react-remove-scroll: 2.6.3(@types/react@18.3.18)(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-slot@1.1.2(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-switch@1.1.3(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.1
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-context': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-previous': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-size': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-tabs@1.1.3(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.1
      '@radix-ui/react-context': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-direction': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-id': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-presence': 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-roving-focus': 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-tooltip@1.1.8(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/primitive': 1.1.1
      '@radix-ui/react-compose-refs': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-context': 1.1.1(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-dismissable-layer': 1.1.5(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-id': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-popper': 1.2.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-portal': 1.1.4(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-presence': 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      '@radix-ui/react-slot': 1.1.2(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-use-controllable-state': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      '@radix-ui/react-visually-hidden': 1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/react-use-callback-ref@1.1.0(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-use-controllable-state@1.1.0(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-use-escape-keydown@1.1.0(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      '@radix-ui/react-use-callback-ref': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-use-layout-effect@1.1.0(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-use-previous@1.1.0(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-use-rect@1.1.0(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      '@radix-ui/rect': 1.1.0
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-use-size@1.1.0(@types/react@18.3.18)(react@18.3.1)':
    dependencies:
      '@radix-ui/react-use-layout-effect': 1.1.0(@types/react@18.3.18)(react@18.3.1)
      react: 18.3.1
    optionalDependencies:
      '@types/react': 18.3.18

  '@radix-ui/react-visually-hidden@1.1.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)':
    dependencies:
      '@radix-ui/react-primitive': 2.0.2(@types/react-dom@18.3.5(@types/react@18.3.18))(@types/react@18.3.18)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18
      '@types/react-dom': 18.3.5(@types/react@18.3.18)

  '@radix-ui/rect@1.1.0': {}

  '@rtsao/scc@1.1.0': {}

  '@rushstack/eslint-patch@1.10.5': {}

  '@sinclair/typebox@0.27.8': {}

  '@socket.io/component-emitter@3.1.2': {}

  '@swc/counter@0.1.3': {}

  '@swc/helpers@0.5.15':
    dependencies:
      tslib: 2.8.1

  '@t3-oss/env-core@0.10.1(typescript@5.7.3)(zod@3.24.2)':
    dependencies:
      zod: 3.24.2
    optionalDependencies:
      typescript: 5.7.3

  '@t3-oss/env-nextjs@0.10.1(typescript@5.7.3)(zod@3.24.2)':
    dependencies:
      '@t3-oss/env-core': 0.10.1(typescript@5.7.3)(zod@3.24.2)
      zod: 3.24.2
    optionalDependencies:
      typescript: 5.7.3

  '@tanstack/query-core@5.66.0': {}

  '@tanstack/react-query@5.66.0(react@18.3.1)':
    dependencies:
      '@tanstack/query-core': 5.66.0
      react: 18.3.1

  '@trpc/client@11.0.0-rc.764(@trpc/server@11.0.0-rc.764(typescript@5.7.3))(typescript@5.7.3)':
    dependencies:
      '@trpc/server': 11.0.0-rc.764(typescript@5.7.3)
      typescript: 5.7.3

  '@trpc/react-query@11.0.0-rc.764(@tanstack/react-query@5.66.0(react@18.3.1))(@trpc/client@11.0.0-rc.764(@trpc/server@11.0.0-rc.764(typescript@5.7.3))(typescript@5.7.3))(@trpc/server@11.0.0-rc.764(typescript@5.7.3))(react-dom@18.3.1(react@18.3.1))(react@18.3.1)(typescript@5.7.3)':
    dependencies:
      '@tanstack/react-query': 5.66.0(react@18.3.1)
      '@trpc/client': 11.0.0-rc.764(@trpc/server@11.0.0-rc.764(typescript@5.7.3))(typescript@5.7.3)
      '@trpc/server': 11.0.0-rc.764(typescript@5.7.3)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
      typescript: 5.7.3

  '@trpc/server@11.0.0-rc.764(typescript@5.7.3)':
    dependencies:
      typescript: 5.7.3

  '@types/cheerio@0.22.35':
    dependencies:
      '@types/node': 20.17.17

  '@types/cookie@0.6.0': {}

  '@types/cors@2.8.17':
    dependencies:
      '@types/node': 20.17.17

  '@types/eslint@8.56.12':
    dependencies:
      '@types/estree': 1.0.6
      '@types/json-schema': 7.0.15

  '@types/estree@1.0.6': {}

  '@types/json-schema@7.0.15': {}

  '@types/json5@0.0.29': {}

  '@types/node-fetch@2.6.12':
    dependencies:
      '@types/node': 20.17.17
      form-data: 4.0.1

  '@types/node@18.19.75':
    dependencies:
      undici-types: 5.26.5

  '@types/node@20.17.17':
    dependencies:
      undici-types: 6.19.8

  '@types/prop-types@15.7.14': {}

  '@types/react-dom@18.3.5(@types/react@18.3.18)':
    dependencies:
      '@types/react': 18.3.18

  '@types/react@18.3.18':
    dependencies:
      '@types/prop-types': 15.7.14
      csstype: 3.1.3

  '@types/readable-stream@4.0.18':
    dependencies:
      '@types/node': 20.17.17
      safe-buffer: 5.1.2

  '@types/retry@0.12.0': {}

  '@types/uuid@10.0.0': {}

  '@types/validator@13.12.2': {}

  '@types/ws@8.5.14':
    dependencies:
      '@types/node': 20.17.17

  '@typescript-eslint/eslint-plugin@8.24.0(@typescript-eslint/parser@8.24.0(eslint@8.57.1)(typescript@5.7.3))(eslint@8.57.1)(typescript@5.7.3)':
    dependencies:
      '@eslint-community/regexpp': 4.12.1
      '@typescript-eslint/parser': 8.24.0(eslint@8.57.1)(typescript@5.7.3)
      '@typescript-eslint/scope-manager': 8.24.0
      '@typescript-eslint/type-utils': 8.24.0(eslint@8.57.1)(typescript@5.7.3)
      '@typescript-eslint/utils': 8.24.0(eslint@8.57.1)(typescript@5.7.3)
      '@typescript-eslint/visitor-keys': 8.24.0
      eslint: 8.57.1
      graphemer: 1.4.0
      ignore: 5.3.2
      natural-compare: 1.4.0
      ts-api-utils: 2.0.1(typescript@5.7.3)
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/parser@6.21.0(eslint@8.57.1)(typescript@5.7.3)':
    dependencies:
      '@typescript-eslint/scope-manager': 6.21.0
      '@typescript-eslint/types': 6.21.0
      '@typescript-eslint/typescript-estree': 6.21.0(typescript@5.7.3)
      '@typescript-eslint/visitor-keys': 6.21.0
      debug: 4.4.0
      eslint: 8.57.1
    optionalDependencies:
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/parser@8.24.0(eslint@8.57.1)(typescript@5.7.3)':
    dependencies:
      '@typescript-eslint/scope-manager': 8.24.0
      '@typescript-eslint/types': 8.24.0
      '@typescript-eslint/typescript-estree': 8.24.0(typescript@5.7.3)
      '@typescript-eslint/visitor-keys': 8.24.0
      debug: 4.4.0
      eslint: 8.57.1
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/scope-manager@6.21.0':
    dependencies:
      '@typescript-eslint/types': 6.21.0
      '@typescript-eslint/visitor-keys': 6.21.0

  '@typescript-eslint/scope-manager@8.24.0':
    dependencies:
      '@typescript-eslint/types': 8.24.0
      '@typescript-eslint/visitor-keys': 8.24.0

  '@typescript-eslint/type-utils@8.24.0(eslint@8.57.1)(typescript@5.7.3)':
    dependencies:
      '@typescript-eslint/typescript-estree': 8.24.0(typescript@5.7.3)
      '@typescript-eslint/utils': 8.24.0(eslint@8.57.1)(typescript@5.7.3)
      debug: 4.4.0
      eslint: 8.57.1
      ts-api-utils: 2.0.1(typescript@5.7.3)
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/types@6.21.0': {}

  '@typescript-eslint/types@8.24.0': {}

  '@typescript-eslint/typescript-estree@6.21.0(typescript@5.7.3)':
    dependencies:
      '@typescript-eslint/types': 6.21.0
      '@typescript-eslint/visitor-keys': 6.21.0
      debug: 4.4.0
      globby: 11.1.0
      is-glob: 4.0.3
      minimatch: 9.0.3
      semver: 7.7.1
      ts-api-utils: 1.4.3(typescript@5.7.3)
    optionalDependencies:
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/typescript-estree@8.24.0(typescript@5.7.3)':
    dependencies:
      '@typescript-eslint/types': 8.24.0
      '@typescript-eslint/visitor-keys': 8.24.0
      debug: 4.4.0
      fast-glob: 3.3.3
      is-glob: 4.0.3
      minimatch: 9.0.5
      semver: 7.7.1
      ts-api-utils: 2.0.1(typescript@5.7.3)
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/utils@8.24.0(eslint@8.57.1)(typescript@5.7.3)':
    dependencies:
      '@eslint-community/eslint-utils': 4.4.1(eslint@8.57.1)
      '@typescript-eslint/scope-manager': 8.24.0
      '@typescript-eslint/types': 8.24.0
      '@typescript-eslint/typescript-estree': 8.24.0(typescript@5.7.3)
      eslint: 8.57.1
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/visitor-keys@6.21.0':
    dependencies:
      '@typescript-eslint/types': 6.21.0
      eslint-visitor-keys: 3.4.3

  '@typescript-eslint/visitor-keys@8.24.0':
    dependencies:
      '@typescript-eslint/types': 8.24.0
      eslint-visitor-keys: 4.2.0

  '@ungap/structured-clone@1.3.0': {}

  '@upstash/core-analytics@0.0.10':
    dependencies:
      '@upstash/redis': 1.34.4

  '@upstash/ratelimit@2.0.5(@upstash/redis@1.34.4)':
    dependencies:
      '@upstash/core-analytics': 0.0.10
      '@upstash/redis': 1.34.4

  '@upstash/redis@1.34.4':
    dependencies:
      crypto-js: 4.2.0

  abort-controller@3.0.0:
    dependencies:
      event-target-shim: 5.0.1

  accepts@1.3.8:
    dependencies:
      mime-types: 2.1.35
      negotiator: 0.6.3

  accepts@2.0.0:
    dependencies:
      mime-types: 3.0.0
      negotiator: 1.0.0

  acorn-jsx@5.3.2(acorn@8.14.0):
    dependencies:
      acorn: 8.14.0

  acorn@8.14.0: {}

  agentkeepalive@4.6.0:
    dependencies:
      humanize-ms: 1.2.1

  ajv@6.12.6:
    dependencies:
      fast-deep-equal: 3.1.3
      fast-json-stable-stringify: 2.1.0
      json-schema-traverse: 0.4.1
      uri-js: 4.4.1

  amqp-connection-manager@4.1.14(amqplib@0.10.5):
    dependencies:
      amqplib: 0.10.5
      promise-breaker: 6.0.0

  amqplib@0.10.5:
    dependencies:
      '@acuminous/bitsyntax': 0.1.2
      buffer-more-ints: 1.0.0
      url-parse: 1.5.10
    transitivePeerDependencies:
      - supports-color

  ansi-regex@2.1.1: {}

  ansi-regex@5.0.1: {}

  ansi-regex@6.1.0: {}

  ansi-styles@2.2.1: {}

  ansi-styles@4.3.0:
    dependencies:
      color-convert: 2.0.1

  ansi-styles@5.2.0: {}

  ansi-styles@6.2.1: {}

  any-promise@1.3.0: {}

  anymatch@3.1.3:
    dependencies:
      normalize-path: 3.0.0
      picomatch: 2.3.1

  append-field@1.0.0: {}

  arg@5.0.2: {}

  argparse@2.0.1: {}

  aria-hidden@1.2.4:
    dependencies:
      tslib: 2.8.1

  aria-query@5.3.2: {}

  array-buffer-byte-length@1.0.2:
    dependencies:
      call-bound: 1.0.3
      is-array-buffer: 3.0.5

  array-includes@3.1.8:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-object-atoms: 1.1.1
      get-intrinsic: 1.2.7
      is-string: 1.1.1

  array-union@2.1.0: {}

  array.prototype.findlast@1.2.5:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-errors: 1.3.0
      es-object-atoms: 1.1.1
      es-shim-unscopables: 1.1.0

  array.prototype.findlastindex@1.2.5:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-errors: 1.3.0
      es-object-atoms: 1.1.1
      es-shim-unscopables: 1.1.0

  array.prototype.flat@1.3.3:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-shim-unscopables: 1.1.0

  array.prototype.flatmap@1.3.3:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-shim-unscopables: 1.1.0

  array.prototype.tosorted@1.1.4:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-errors: 1.3.0
      es-shim-unscopables: 1.1.0

  arraybuffer.prototype.slice@1.0.4:
    dependencies:
      array-buffer-byte-length: 1.0.2
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-errors: 1.3.0
      get-intrinsic: 1.2.7
      is-array-buffer: 3.0.5

  ast-types-flow@0.0.8: {}

  async-function@1.0.0: {}

  asynckit@0.4.0: {}

  autoprefixer@10.4.20(postcss@8.5.2):
    dependencies:
      browserslist: 4.24.4
      caniuse-lite: 1.0.30001699
      fraction.js: 4.3.7
      normalize-range: 0.1.2
      picocolors: 1.1.1
      postcss: 8.5.2
      postcss-value-parser: 4.2.0

  available-typed-arrays@1.0.7:
    dependencies:
      possible-typed-array-names: 1.1.0

  axe-core@4.10.2: {}

  axobject-query@4.1.0: {}

  balanced-match@1.0.2: {}

  base64-js@1.5.1: {}

  base64id@2.0.0: {}

  binary-extensions@2.3.0: {}

  bl@6.0.19:
    dependencies:
      '@types/readable-stream': 4.0.18
      buffer: 6.0.3
      inherits: 2.0.4
      readable-stream: 4.7.0

  body-parser@2.1.0:
    dependencies:
      bytes: 3.1.2
      content-type: 1.0.5
      debug: 4.4.0
      http-errors: 2.0.0
      iconv-lite: 0.5.2
      on-finished: 2.4.1
      qs: 6.14.0
      raw-body: 3.0.0
      type-is: 2.0.0
    transitivePeerDependencies:
      - supports-color

  boolbase@1.0.0: {}

  brace-expansion@1.1.11:
    dependencies:
      balanced-match: 1.0.2
      concat-map: 0.0.1

  brace-expansion@2.0.1:
    dependencies:
      balanced-match: 1.0.2

  braces@3.0.3:
    dependencies:
      fill-range: 7.1.1

  browserslist@4.24.4:
    dependencies:
      caniuse-lite: 1.0.30001699
      electron-to-chromium: 1.5.97
      node-releases: 2.0.19
      update-browserslist-db: 1.1.2(browserslist@4.24.4)

  buffer-from@1.1.2: {}

  buffer-more-ints@1.0.0: {}

  buffer@6.0.3:
    dependencies:
      base64-js: 1.5.1
      ieee754: 1.2.1

  busboy@1.6.0:
    dependencies:
      streamsearch: 1.1.0

  bytes@3.1.2: {}

  call-bind-apply-helpers@1.0.2:
    dependencies:
      es-errors: 1.3.0
      function-bind: 1.1.2

  call-bind@1.0.8:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-define-property: 1.0.1
      get-intrinsic: 1.2.7
      set-function-length: 1.2.2

  call-bound@1.0.3:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      get-intrinsic: 1.2.7

  callsites@3.1.0: {}

  camelcase-css@2.0.1: {}

  camelcase@6.3.0: {}

  caniuse-lite@1.0.30001699: {}

  chalk@1.1.3:
    dependencies:
      ansi-styles: 2.2.1
      escape-string-regexp: 1.0.5
      has-ansi: 2.0.0
      strip-ansi: 3.0.1
      supports-color: 2.0.0

  chalk@4.1.2:
    dependencies:
      ansi-styles: 4.3.0
      supports-color: 7.2.0

  chart.js@4.4.7:
    dependencies:
      '@kurkle/color': 0.3.4

  chartjs-plugin-annotation@3.1.0(chart.js@4.4.7):
    dependencies:
      chart.js: 4.4.7

  cheerio-select@2.1.0:
    dependencies:
      boolbase: 1.0.0
      css-select: 5.1.0
      css-what: 6.1.0
      domelementtype: 2.3.0
      domhandler: 5.0.3
      domutils: 3.2.2

  cheerio@1.0.0:
    dependencies:
      cheerio-select: 2.1.0
      dom-serializer: 2.0.0
      domhandler: 5.0.3
      domutils: 3.2.2
      encoding-sniffer: 0.2.0
      htmlparser2: 9.1.0
      parse5: 7.2.1
      parse5-htmlparser2-tree-adapter: 7.1.0
      parse5-parser-stream: 7.1.2
      undici: 6.21.1
      whatwg-mimetype: 4.0.0

  chokidar@3.6.0:
    dependencies:
      anymatch: 3.1.3
      braces: 3.0.3
      glob-parent: 5.1.2
      is-binary-path: 2.1.0
      is-glob: 4.0.3
      normalize-path: 3.0.0
      readdirp: 3.6.0
    optionalDependencies:
      fsevents: 2.3.3

  class-transformer@0.5.1: {}

  class-validator@0.14.1:
    dependencies:
      '@types/validator': 13.12.2
      libphonenumber-js: 1.11.19
      validator: 13.12.0

  class-variance-authority@0.7.1:
    dependencies:
      clsx: 2.1.1

  client-only@0.0.1: {}

  cliui@8.0.1:
    dependencies:
      string-width: 4.2.3
      strip-ansi: 6.0.1
      wrap-ansi: 7.0.0

  clsx@2.1.1: {}

  cluster-key-slot@1.1.2: {}

  color-convert@2.0.1:
    dependencies:
      color-name: 1.1.4

  color-name@1.1.4: {}

  color-string@1.9.1:
    dependencies:
      color-name: 1.1.4
      simple-swizzle: 0.2.2
    optional: true

  color@4.2.3:
    dependencies:
      color-convert: 2.0.1
      color-string: 1.9.1
    optional: true

  combined-stream@1.0.8:
    dependencies:
      delayed-stream: 1.0.0

  commander@4.1.1: {}

  commist@3.2.0: {}

  common-tags@1.8.2: {}

  concat-map@0.0.1: {}

  concat-stream@1.6.2:
    dependencies:
      buffer-from: 1.1.2
      inherits: 2.0.4
      readable-stream: 2.3.8
      typedarray: 0.0.6

  concat-stream@2.0.0:
    dependencies:
      buffer-from: 1.1.2
      inherits: 2.0.4
      readable-stream: 3.6.2
      typedarray: 0.0.6

  consola@3.4.0: {}

  console-table-printer@2.12.1:
    dependencies:
      simple-wcswidth: 1.0.1

  content-disposition@1.0.0:
    dependencies:
      safe-buffer: 5.2.1

  content-type@1.0.5: {}

  cookie-signature@1.2.2: {}

  cookie@0.7.1: {}

  cookie@0.7.2: {}

  copy-anything@3.0.5:
    dependencies:
      is-what: 4.1.16

  core-util-is@1.0.3: {}

  cors@2.8.5:
    dependencies:
      object-assign: 4.1.1
      vary: 1.1.2

  cross-spawn@7.0.6:
    dependencies:
      path-key: 3.1.1
      shebang-command: 2.0.0
      which: 2.0.2

  crypto-js@4.2.0: {}

  css-select@5.1.0:
    dependencies:
      boolbase: 1.0.0
      css-what: 6.1.0
      domhandler: 5.0.3
      domutils: 3.2.2
      nth-check: 2.1.1

  css-what@6.1.0: {}

  cssesc@3.0.0: {}

  csstype@3.1.3: {}

  damerau-levenshtein@1.0.8: {}

  data-view-buffer@1.0.2:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      is-data-view: 1.0.2

  data-view-byte-length@1.0.2:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      is-data-view: 1.0.2

  data-view-byte-offset@1.0.1:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      is-data-view: 1.0.2

  debug@2.6.9:
    dependencies:
      ms: 2.0.0

  debug@3.2.7:
    dependencies:
      ms: 2.1.3

  debug@4.3.6:
    dependencies:
      ms: 2.1.2

  debug@4.3.7:
    dependencies:
      ms: 2.1.3

  debug@4.4.0:
    dependencies:
      ms: 2.1.3

  decamelize@1.2.0: {}

  deep-is@0.1.4: {}

  define-data-property@1.1.4:
    dependencies:
      es-define-property: 1.0.1
      es-errors: 1.3.0
      gopd: 1.2.0

  define-properties@1.2.1:
    dependencies:
      define-data-property: 1.1.4
      has-property-descriptors: 1.0.2
      object-keys: 1.1.1

  delayed-stream@1.0.0: {}

  denque@2.1.0: {}

  depd@2.0.0: {}

  destroy@1.2.0: {}

  detect-libc@2.0.3:
    optional: true

  detect-node-es@1.1.0: {}

  didyoumean@1.2.2: {}

  dir-glob@3.0.1:
    dependencies:
      path-type: 4.0.0

  dlv@1.1.3: {}

  doctrine@2.1.0:
    dependencies:
      esutils: 2.0.3

  doctrine@3.0.0:
    dependencies:
      esutils: 2.0.3

  dom-serializer@2.0.0:
    dependencies:
      domelementtype: 2.3.0
      domhandler: 5.0.3
      entities: 4.5.0

  domelementtype@2.3.0: {}

  domhandler@5.0.3:
    dependencies:
      domelementtype: 2.3.0

  domutils@3.2.2:
    dependencies:
      dom-serializer: 2.0.0
      domelementtype: 2.3.0
      domhandler: 5.0.3

  drizzle-kit@0.24.2:
    dependencies:
      '@drizzle-team/brocli': 0.10.2
      '@esbuild-kit/esm-loader': 2.6.5
      esbuild: 0.19.12
      esbuild-register: 3.6.0(esbuild@0.19.12)
    transitivePeerDependencies:
      - supports-color

  drizzle-orm@0.33.0(@types/react@18.3.18)(postgres@3.4.5)(react@18.3.1):
    optionalDependencies:
      '@types/react': 18.3.18
      postgres: 3.4.5
      react: 18.3.1

  dunder-proto@1.0.1:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-errors: 1.3.0
      gopd: 1.2.0

  eastasianwidth@0.2.0: {}

  ee-first@1.1.1: {}

  electron-to-chromium@1.5.97: {}

  emoji-regex@8.0.0: {}

  emoji-regex@9.2.2: {}

  encodeurl@1.0.2: {}

  encodeurl@2.0.0: {}

  encoding-sniffer@0.2.0:
    dependencies:
      iconv-lite: 0.6.3
      whatwg-encoding: 3.1.1

  engine.io-parser@5.2.3: {}

  engine.io@6.6.4:
    dependencies:
      '@types/cors': 2.8.17
      '@types/node': 20.17.17
      accepts: 1.3.8
      base64id: 2.0.0
      cookie: 0.7.2
      cors: 2.8.5
      debug: 4.3.7
      engine.io-parser: 5.2.3
      ws: 8.17.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  enhanced-resolve@5.18.1:
    dependencies:
      graceful-fs: 4.2.11
      tapable: 2.2.1

  entities@4.5.0: {}

  es-abstract@1.23.9:
    dependencies:
      array-buffer-byte-length: 1.0.2
      arraybuffer.prototype.slice: 1.0.4
      available-typed-arrays: 1.0.7
      call-bind: 1.0.8
      call-bound: 1.0.3
      data-view-buffer: 1.0.2
      data-view-byte-length: 1.0.2
      data-view-byte-offset: 1.0.1
      es-define-property: 1.0.1
      es-errors: 1.3.0
      es-object-atoms: 1.1.1
      es-set-tostringtag: 2.1.0
      es-to-primitive: 1.3.0
      function.prototype.name: 1.1.8
      get-intrinsic: 1.2.7
      get-proto: 1.0.1
      get-symbol-description: 1.1.0
      globalthis: 1.0.4
      gopd: 1.2.0
      has-property-descriptors: 1.0.2
      has-proto: 1.2.0
      has-symbols: 1.1.0
      hasown: 2.0.2
      internal-slot: 1.1.0
      is-array-buffer: 3.0.5
      is-callable: 1.2.7
      is-data-view: 1.0.2
      is-regex: 1.2.1
      is-shared-array-buffer: 1.0.4
      is-string: 1.1.1
      is-typed-array: 1.1.15
      is-weakref: 1.1.1
      math-intrinsics: 1.1.0
      object-inspect: 1.13.4
      object-keys: 1.1.1
      object.assign: 4.1.7
      own-keys: 1.0.1
      regexp.prototype.flags: 1.5.4
      safe-array-concat: 1.1.3
      safe-push-apply: 1.0.0
      safe-regex-test: 1.1.0
      set-proto: 1.0.0
      string.prototype.trim: 1.2.10
      string.prototype.trimend: 1.0.9
      string.prototype.trimstart: 1.0.8
      typed-array-buffer: 1.0.3
      typed-array-byte-length: 1.0.3
      typed-array-byte-offset: 1.0.4
      typed-array-length: 1.0.7
      unbox-primitive: 1.1.0
      which-typed-array: 1.1.18

  es-define-property@1.0.1: {}

  es-errors@1.3.0: {}

  es-iterator-helpers@1.2.1:
    dependencies:
      call-bind: 1.0.8
      call-bound: 1.0.3
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-errors: 1.3.0
      es-set-tostringtag: 2.1.0
      function-bind: 1.1.2
      get-intrinsic: 1.2.7
      globalthis: 1.0.4
      gopd: 1.2.0
      has-property-descriptors: 1.0.2
      has-proto: 1.2.0
      has-symbols: 1.1.0
      internal-slot: 1.1.0
      iterator.prototype: 1.1.5
      safe-array-concat: 1.1.3

  es-object-atoms@1.1.1:
    dependencies:
      es-errors: 1.3.0

  es-set-tostringtag@2.1.0:
    dependencies:
      es-errors: 1.3.0
      get-intrinsic: 1.2.7
      has-tostringtag: 1.0.2
      hasown: 2.0.2

  es-shim-unscopables@1.1.0:
    dependencies:
      hasown: 2.0.2

  es-to-primitive@1.3.0:
    dependencies:
      is-callable: 1.2.7
      is-date-object: 1.1.0
      is-symbol: 1.1.1

  esbuild-register@3.6.0(esbuild@0.19.12):
    dependencies:
      debug: 4.4.0
      esbuild: 0.19.12
    transitivePeerDependencies:
      - supports-color

  esbuild@0.18.20:
    optionalDependencies:
      '@esbuild/android-arm': 0.18.20
      '@esbuild/android-arm64': 0.18.20
      '@esbuild/android-x64': 0.18.20
      '@esbuild/darwin-arm64': 0.18.20
      '@esbuild/darwin-x64': 0.18.20
      '@esbuild/freebsd-arm64': 0.18.20
      '@esbuild/freebsd-x64': 0.18.20
      '@esbuild/linux-arm': 0.18.20
      '@esbuild/linux-arm64': 0.18.20
      '@esbuild/linux-ia32': 0.18.20
      '@esbuild/linux-loong64': 0.18.20
      '@esbuild/linux-mips64el': 0.18.20
      '@esbuild/linux-ppc64': 0.18.20
      '@esbuild/linux-riscv64': 0.18.20
      '@esbuild/linux-s390x': 0.18.20
      '@esbuild/linux-x64': 0.18.20
      '@esbuild/netbsd-x64': 0.18.20
      '@esbuild/openbsd-x64': 0.18.20
      '@esbuild/sunos-x64': 0.18.20
      '@esbuild/win32-arm64': 0.18.20
      '@esbuild/win32-ia32': 0.18.20
      '@esbuild/win32-x64': 0.18.20

  esbuild@0.19.12:
    optionalDependencies:
      '@esbuild/aix-ppc64': 0.19.12
      '@esbuild/android-arm': 0.19.12
      '@esbuild/android-arm64': 0.19.12
      '@esbuild/android-x64': 0.19.12
      '@esbuild/darwin-arm64': 0.19.12
      '@esbuild/darwin-x64': 0.19.12
      '@esbuild/freebsd-arm64': 0.19.12
      '@esbuild/freebsd-x64': 0.19.12
      '@esbuild/linux-arm': 0.19.12
      '@esbuild/linux-arm64': 0.19.12
      '@esbuild/linux-ia32': 0.19.12
      '@esbuild/linux-loong64': 0.19.12
      '@esbuild/linux-mips64el': 0.19.12
      '@esbuild/linux-ppc64': 0.19.12
      '@esbuild/linux-riscv64': 0.19.12
      '@esbuild/linux-s390x': 0.19.12
      '@esbuild/linux-x64': 0.19.12
      '@esbuild/netbsd-x64': 0.19.12
      '@esbuild/openbsd-x64': 0.19.12
      '@esbuild/sunos-x64': 0.19.12
      '@esbuild/win32-arm64': 0.19.12
      '@esbuild/win32-ia32': 0.19.12
      '@esbuild/win32-x64': 0.19.12

  escalade@3.2.0: {}

  escape-html@1.0.3: {}

  escape-string-regexp@1.0.5: {}

  escape-string-regexp@4.0.0: {}

  eslint-config-next@15.1.7(eslint@8.57.1)(typescript@5.7.3):
    dependencies:
      '@next/eslint-plugin-next': 15.1.7
      '@rushstack/eslint-patch': 1.10.5
      '@typescript-eslint/eslint-plugin': 8.24.0(@typescript-eslint/parser@8.24.0(eslint@8.57.1)(typescript@5.7.3))(eslint@8.57.1)(typescript@5.7.3)
      '@typescript-eslint/parser': 8.24.0(eslint@8.57.1)(typescript@5.7.3)
      eslint: 8.57.1
      eslint-import-resolver-node: 0.3.9
      eslint-import-resolver-typescript: 3.7.0(eslint-plugin-import@2.31.0)(eslint@8.57.1)
      eslint-plugin-import: 2.31.0(@typescript-eslint/parser@8.24.0(eslint@8.57.1)(typescript@5.7.3))(eslint-import-resolver-typescript@3.7.0)(eslint@8.57.1)
      eslint-plugin-jsx-a11y: 6.10.2(eslint@8.57.1)
      eslint-plugin-react: 7.37.4(eslint@8.57.1)
      eslint-plugin-react-hooks: 5.1.0(eslint@8.57.1)
    optionalDependencies:
      typescript: 5.7.3
    transitivePeerDependencies:
      - eslint-import-resolver-webpack
      - eslint-plugin-import-x
      - supports-color

  eslint-config-prettier@10.0.1(eslint@8.57.1):
    dependencies:
      eslint: 8.57.1

  eslint-import-resolver-node@0.3.9:
    dependencies:
      debug: 3.2.7
      is-core-module: 2.16.1
      resolve: 1.22.10
    transitivePeerDependencies:
      - supports-color

  eslint-import-resolver-typescript@3.7.0(eslint-plugin-import@2.31.0)(eslint@8.57.1):
    dependencies:
      '@nolyfill/is-core-module': 1.0.39
      debug: 4.4.0
      enhanced-resolve: 5.18.1
      eslint: 8.57.1
      fast-glob: 3.3.3
      get-tsconfig: 4.10.0
      is-bun-module: 1.3.0
      is-glob: 4.0.3
      stable-hash: 0.0.4
    optionalDependencies:
      eslint-plugin-import: 2.31.0(@typescript-eslint/parser@8.24.0(eslint@8.57.1)(typescript@5.7.3))(eslint-import-resolver-typescript@3.7.0)(eslint@8.57.1)
    transitivePeerDependencies:
      - supports-color

  eslint-module-utils@2.12.0(@typescript-eslint/parser@8.24.0(eslint@8.57.1)(typescript@5.7.3))(eslint-import-resolver-node@0.3.9)(eslint-import-resolver-typescript@3.7.0(eslint-plugin-import@2.31.0)(eslint@8.57.1))(eslint@8.57.1):
    dependencies:
      debug: 3.2.7
    optionalDependencies:
      '@typescript-eslint/parser': 8.24.0(eslint@8.57.1)(typescript@5.7.3)
      eslint: 8.57.1
      eslint-import-resolver-node: 0.3.9
      eslint-import-resolver-typescript: 3.7.0(eslint-plugin-import@2.31.0)(eslint@8.57.1)
    transitivePeerDependencies:
      - supports-color

  eslint-plugin-drizzle@0.2.3(eslint@8.57.1):
    dependencies:
      eslint: 8.57.1

  eslint-plugin-import@2.31.0(@typescript-eslint/parser@8.24.0(eslint@8.57.1)(typescript@5.7.3))(eslint-import-resolver-typescript@3.7.0)(eslint@8.57.1):
    dependencies:
      '@rtsao/scc': 1.1.0
      array-includes: 3.1.8
      array.prototype.findlastindex: 1.2.5
      array.prototype.flat: 1.3.3
      array.prototype.flatmap: 1.3.3
      debug: 3.2.7
      doctrine: 2.1.0
      eslint: 8.57.1
      eslint-import-resolver-node: 0.3.9
      eslint-module-utils: 2.12.0(@typescript-eslint/parser@8.24.0(eslint@8.57.1)(typescript@5.7.3))(eslint-import-resolver-node@0.3.9)(eslint-import-resolver-typescript@3.7.0(eslint-plugin-import@2.31.0)(eslint@8.57.1))(eslint@8.57.1)
      hasown: 2.0.2
      is-core-module: 2.16.1
      is-glob: 4.0.3
      minimatch: 3.1.2
      object.fromentries: 2.0.8
      object.groupby: 1.0.3
      object.values: 1.2.1
      semver: 6.3.1
      string.prototype.trimend: 1.0.9
      tsconfig-paths: 3.15.0
    optionalDependencies:
      '@typescript-eslint/parser': 8.24.0(eslint@8.57.1)(typescript@5.7.3)
    transitivePeerDependencies:
      - eslint-import-resolver-typescript
      - eslint-import-resolver-webpack
      - supports-color

  eslint-plugin-jsx-a11y@6.10.2(eslint@8.57.1):
    dependencies:
      aria-query: 5.3.2
      array-includes: 3.1.8
      array.prototype.flatmap: 1.3.3
      ast-types-flow: 0.0.8
      axe-core: 4.10.2
      axobject-query: 4.1.0
      damerau-levenshtein: 1.0.8
      emoji-regex: 9.2.2
      eslint: 8.57.1
      hasown: 2.0.2
      jsx-ast-utils: 3.3.5
      language-tags: 1.0.9
      minimatch: 3.1.2
      object.fromentries: 2.0.8
      safe-regex-test: 1.1.0
      string.prototype.includes: 2.0.1

  eslint-plugin-prettier@5.2.3(@types/eslint@8.56.12)(eslint-config-prettier@10.0.1(eslint@8.57.1))(eslint@8.57.1)(prettier@3.5.0):
    dependencies:
      eslint: 8.57.1
      prettier: 3.5.0
      prettier-linter-helpers: 1.0.0
      synckit: 0.9.2
    optionalDependencies:
      '@types/eslint': 8.56.12
      eslint-config-prettier: 10.0.1(eslint@8.57.1)

  eslint-plugin-react-hooks@5.1.0(eslint@8.57.1):
    dependencies:
      eslint: 8.57.1

  eslint-plugin-react@7.37.4(eslint@8.57.1):
    dependencies:
      array-includes: 3.1.8
      array.prototype.findlast: 1.2.5
      array.prototype.flatmap: 1.3.3
      array.prototype.tosorted: 1.1.4
      doctrine: 2.1.0
      es-iterator-helpers: 1.2.1
      eslint: 8.57.1
      estraverse: 5.3.0
      hasown: 2.0.2
      jsx-ast-utils: 3.3.5
      minimatch: 3.1.2
      object.entries: 1.1.8
      object.fromentries: 2.0.8
      object.values: 1.2.1
      prop-types: 15.8.1
      resolve: 2.0.0-next.5
      semver: 6.3.1
      string.prototype.matchall: 4.0.12
      string.prototype.repeat: 1.0.0

  eslint-scope@7.2.2:
    dependencies:
      esrecurse: 4.3.0
      estraverse: 5.3.0

  eslint-visitor-keys@3.4.3: {}

  eslint-visitor-keys@4.2.0: {}

  eslint@8.57.1:
    dependencies:
      '@eslint-community/eslint-utils': 4.4.1(eslint@8.57.1)
      '@eslint-community/regexpp': 4.12.1
      '@eslint/eslintrc': 2.1.4
      '@eslint/js': 8.57.1
      '@humanwhocodes/config-array': 0.13.0
      '@humanwhocodes/module-importer': 1.0.1
      '@nodelib/fs.walk': 1.2.8
      '@ungap/structured-clone': 1.3.0
      ajv: 6.12.6
      chalk: 4.1.2
      cross-spawn: 7.0.6
      debug: 4.4.0
      doctrine: 3.0.0
      escape-string-regexp: 4.0.0
      eslint-scope: 7.2.2
      eslint-visitor-keys: 3.4.3
      espree: 9.6.1
      esquery: 1.6.0
      esutils: 2.0.3
      fast-deep-equal: 3.1.3
      file-entry-cache: 6.0.1
      find-up: 5.0.0
      glob-parent: 6.0.2
      globals: 13.24.0
      graphemer: 1.4.0
      ignore: 5.3.2
      imurmurhash: 0.1.4
      is-glob: 4.0.3
      is-path-inside: 3.0.3
      js-yaml: 4.1.0
      json-stable-stringify-without-jsonify: 1.0.1
      levn: 0.4.1
      lodash.merge: 4.6.2
      minimatch: 3.1.2
      natural-compare: 1.4.0
      optionator: 0.9.4
      strip-ansi: 6.0.1
      text-table: 0.2.0
    transitivePeerDependencies:
      - supports-color

  espree@9.6.1:
    dependencies:
      acorn: 8.14.0
      acorn-jsx: 5.3.2(acorn@8.14.0)
      eslint-visitor-keys: 3.4.3

  esquery@1.6.0:
    dependencies:
      estraverse: 5.3.0

  esrecurse@4.3.0:
    dependencies:
      estraverse: 5.3.0

  estraverse@5.3.0: {}

  esutils@2.0.3: {}

  etag@1.8.1: {}

  event-target-shim@5.0.1: {}

  eventemitter3@4.0.7: {}

  events@3.3.0: {}

  express@5.0.1:
    dependencies:
      accepts: 2.0.0
      body-parser: 2.1.0
      content-disposition: 1.0.0
      content-type: 1.0.5
      cookie: 0.7.1
      cookie-signature: 1.2.2
      debug: 4.3.6
      depd: 2.0.0
      encodeurl: 2.0.0
      escape-html: 1.0.3
      etag: 1.8.1
      finalhandler: 2.0.0
      fresh: 2.0.0
      http-errors: 2.0.0
      merge-descriptors: 2.0.0
      methods: 1.1.2
      mime-types: 3.0.0
      on-finished: 2.4.1
      once: 1.4.0
      parseurl: 1.3.3
      proxy-addr: 2.0.7
      qs: 6.13.0
      range-parser: 1.2.1
      router: 2.1.0
      safe-buffer: 5.2.1
      send: 1.1.0
      serve-static: 2.1.0
      setprototypeof: 1.2.0
      statuses: 2.0.1
      type-is: 2.0.0
      utils-merge: 1.0.1
      vary: 1.1.2
    transitivePeerDependencies:
      - supports-color

  fast-deep-equal@3.1.3: {}

  fast-diff@1.3.0: {}

  fast-glob@3.3.1:
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      '@nodelib/fs.walk': 1.2.8
      glob-parent: 5.1.2
      merge2: 1.4.1
      micromatch: 4.0.8

  fast-glob@3.3.3:
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      '@nodelib/fs.walk': 1.2.8
      glob-parent: 5.1.2
      merge2: 1.4.1
      micromatch: 4.0.8

  fast-json-stable-stringify@2.1.0: {}

  fast-levenshtein@2.0.6: {}

  fast-safe-stringify@2.1.1: {}

  fast-unique-numbers@8.0.13:
    dependencies:
      '@babel/runtime': 7.26.7
      tslib: 2.8.1

  fastq@1.19.0:
    dependencies:
      reusify: 1.0.4

  file-entry-cache@6.0.1:
    dependencies:
      flat-cache: 3.2.0

  fill-range@7.1.1:
    dependencies:
      to-regex-range: 5.0.1

  finalhandler@2.0.0:
    dependencies:
      debug: 2.6.9
      encodeurl: 1.0.2
      escape-html: 1.0.3
      on-finished: 2.4.1
      parseurl: 1.3.3
      statuses: 2.0.1
      unpipe: 1.0.0
    transitivePeerDependencies:
      - supports-color

  find-up@5.0.0:
    dependencies:
      locate-path: 6.0.0
      path-exists: 4.0.0

  flat-cache@3.2.0:
    dependencies:
      flatted: 3.3.2
      keyv: 4.5.4
      rimraf: 3.0.2

  flatted@3.3.2: {}

  for-each@0.3.5:
    dependencies:
      is-callable: 1.2.7

  foreground-child@3.3.0:
    dependencies:
      cross-spawn: 7.0.6
      signal-exit: 4.1.0

  form-data-encoder@1.7.2: {}

  form-data@4.0.1:
    dependencies:
      asynckit: 0.4.0
      combined-stream: 1.0.8
      mime-types: 2.1.35

  formdata-node@4.4.1:
    dependencies:
      node-domexception: 1.0.0
      web-streams-polyfill: 4.0.0-beta.3

  forwarded@0.2.0: {}

  fraction.js@4.3.7: {}

  fresh@0.5.2: {}

  fresh@2.0.0: {}

  fs.realpath@1.0.0: {}

  fsevents@2.3.3:
    optional: true

  function-bind@1.1.2: {}

  function.prototype.name@1.1.8:
    dependencies:
      call-bind: 1.0.8
      call-bound: 1.0.3
      define-properties: 1.2.1
      functions-have-names: 1.2.3
      hasown: 2.0.2
      is-callable: 1.2.7

  functions-have-names@1.2.3: {}

  geist@1.3.1(next@15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1)):
    dependencies:
      next: 15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1)

  get-caller-file@2.0.5: {}

  get-intrinsic@1.2.7:
    dependencies:
      call-bind-apply-helpers: 1.0.2
      es-define-property: 1.0.1
      es-errors: 1.3.0
      es-object-atoms: 1.1.1
      function-bind: 1.1.2
      get-proto: 1.0.1
      gopd: 1.2.0
      has-symbols: 1.1.0
      hasown: 2.0.2
      math-intrinsics: 1.1.0

  get-nonce@1.0.1: {}

  get-proto@1.0.1:
    dependencies:
      dunder-proto: 1.0.1
      es-object-atoms: 1.1.1

  get-symbol-description@1.1.0:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      get-intrinsic: 1.2.7

  get-tsconfig@4.10.0:
    dependencies:
      resolve-pkg-maps: 1.0.0

  glob-parent@5.1.2:
    dependencies:
      is-glob: 4.0.3

  glob-parent@6.0.2:
    dependencies:
      is-glob: 4.0.3

  glob@10.4.5:
    dependencies:
      foreground-child: 3.3.0
      jackspeak: 3.4.3
      minimatch: 9.0.5
      minipass: 7.1.2
      package-json-from-dist: 1.0.1
      path-scurry: 1.11.1

  glob@7.2.3:
    dependencies:
      fs.realpath: 1.0.0
      inflight: 1.0.6
      inherits: 2.0.4
      minimatch: 3.1.2
      once: 1.4.0
      path-is-absolute: 1.0.1

  globals@13.24.0:
    dependencies:
      type-fest: 0.20.2

  globalthis@1.0.4:
    dependencies:
      define-properties: 1.2.1
      gopd: 1.2.0

  globby@11.1.0:
    dependencies:
      array-union: 2.1.0
      dir-glob: 3.0.1
      fast-glob: 3.3.3
      ignore: 5.3.2
      merge2: 1.4.1
      slash: 3.0.0

  gopd@1.2.0: {}

  graceful-fs@4.2.11: {}

  graphemer@1.4.0: {}

  groq-sdk@0.5.0:
    dependencies:
      '@types/node': 18.19.75
      '@types/node-fetch': 2.6.12
      abort-controller: 3.0.0
      agentkeepalive: 4.6.0
      form-data-encoder: 1.7.2
      formdata-node: 4.4.1
      node-fetch: 2.7.0
      web-streams-polyfill: 3.3.3
    transitivePeerDependencies:
      - encoding

  has-ansi@2.0.0:
    dependencies:
      ansi-regex: 2.1.1

  has-bigints@1.1.0: {}

  has-flag@4.0.0: {}

  has-property-descriptors@1.0.2:
    dependencies:
      es-define-property: 1.0.1

  has-proto@1.2.0:
    dependencies:
      dunder-proto: 1.0.1

  has-symbols@1.1.0: {}

  has-tostringtag@1.0.2:
    dependencies:
      has-symbols: 1.1.0

  hasown@2.0.2:
    dependencies:
      function-bind: 1.1.2

  help-me@5.0.0: {}

  htmlparser2@9.1.0:
    dependencies:
      domelementtype: 2.3.0
      domhandler: 5.0.3
      domutils: 3.2.2
      entities: 4.5.0

  http-errors@2.0.0:
    dependencies:
      depd: 2.0.0
      inherits: 2.0.4
      setprototypeof: 1.2.0
      statuses: 2.0.1
      toidentifier: 1.0.1

  humanize-ms@1.2.1:
    dependencies:
      ms: 2.1.3

  iconv-lite@0.5.2:
    dependencies:
      safer-buffer: 2.1.2

  iconv-lite@0.6.3:
    dependencies:
      safer-buffer: 2.1.2

  ieee754@1.2.1: {}

  ignore@5.3.2: {}

  import-fresh@3.3.1:
    dependencies:
      parent-module: 1.0.1
      resolve-from: 4.0.0

  imurmurhash@0.1.4: {}

  indent-string@4.0.0: {}

  inflight@1.0.6:
    dependencies:
      once: 1.4.0
      wrappy: 1.0.2

  inherits@2.0.4: {}

  internal-slot@1.1.0:
    dependencies:
      es-errors: 1.3.0
      hasown: 2.0.2
      side-channel: 1.1.0

  ioredis@5.5.0:
    dependencies:
      '@ioredis/commands': 1.2.0
      cluster-key-slot: 1.1.2
      debug: 4.4.0
      denque: 2.1.0
      lodash.defaults: 4.2.0
      lodash.isarguments: 3.1.0
      redis-errors: 1.2.0
      redis-parser: 3.0.0
      standard-as-callback: 2.1.0
    transitivePeerDependencies:
      - supports-color

  ipaddr.js@1.9.1: {}

  is-array-buffer@3.0.5:
    dependencies:
      call-bind: 1.0.8
      call-bound: 1.0.3
      get-intrinsic: 1.2.7

  is-arrayish@0.3.2:
    optional: true

  is-async-function@2.1.1:
    dependencies:
      async-function: 1.0.0
      call-bound: 1.0.3
      get-proto: 1.0.1
      has-tostringtag: 1.0.2
      safe-regex-test: 1.1.0

  is-bigint@1.1.0:
    dependencies:
      has-bigints: 1.1.0

  is-binary-path@2.1.0:
    dependencies:
      binary-extensions: 2.3.0

  is-boolean-object@1.2.2:
    dependencies:
      call-bound: 1.0.3
      has-tostringtag: 1.0.2

  is-bun-module@1.3.0:
    dependencies:
      semver: 7.7.1

  is-callable@1.2.7: {}

  is-core-module@2.16.1:
    dependencies:
      hasown: 2.0.2

  is-data-view@1.0.2:
    dependencies:
      call-bound: 1.0.3
      get-intrinsic: 1.2.7
      is-typed-array: 1.1.15

  is-date-object@1.1.0:
    dependencies:
      call-bound: 1.0.3
      has-tostringtag: 1.0.2

  is-extglob@2.1.1: {}

  is-finalizationregistry@1.1.1:
    dependencies:
      call-bound: 1.0.3

  is-fullwidth-code-point@3.0.0: {}

  is-generator-function@1.1.0:
    dependencies:
      call-bound: 1.0.3
      get-proto: 1.0.1
      has-tostringtag: 1.0.2
      safe-regex-test: 1.1.0

  is-glob@4.0.3:
    dependencies:
      is-extglob: 2.1.1

  is-map@2.0.3: {}

  is-number-object@1.1.1:
    dependencies:
      call-bound: 1.0.3
      has-tostringtag: 1.0.2

  is-number@7.0.0: {}

  is-path-inside@3.0.3: {}

  is-promise@4.0.0: {}

  is-regex@1.2.1:
    dependencies:
      call-bound: 1.0.3
      gopd: 1.2.0
      has-tostringtag: 1.0.2
      hasown: 2.0.2

  is-set@2.0.3: {}

  is-shared-array-buffer@1.0.4:
    dependencies:
      call-bound: 1.0.3

  is-string@1.1.1:
    dependencies:
      call-bound: 1.0.3
      has-tostringtag: 1.0.2

  is-symbol@1.1.1:
    dependencies:
      call-bound: 1.0.3
      has-symbols: 1.1.0
      safe-regex-test: 1.1.0

  is-typed-array@1.1.15:
    dependencies:
      which-typed-array: 1.1.18

  is-weakmap@2.0.2: {}

  is-weakref@1.1.1:
    dependencies:
      call-bound: 1.0.3

  is-weakset@2.0.4:
    dependencies:
      call-bound: 1.0.3
      get-intrinsic: 1.2.7

  is-what@4.1.16: {}

  isarray@1.0.0: {}

  isarray@2.0.5: {}

  isexe@2.0.0: {}

  iterare@1.2.1: {}

  iterator.prototype@1.1.5:
    dependencies:
      define-data-property: 1.1.4
      es-object-atoms: 1.1.1
      get-intrinsic: 1.2.7
      get-proto: 1.0.1
      has-symbols: 1.1.0
      set-function-name: 2.0.2

  jackspeak@3.4.3:
    dependencies:
      '@isaacs/cliui': 8.0.2
    optionalDependencies:
      '@pkgjs/parseargs': 0.11.0

  jiti@1.21.7: {}

  jose@5.9.6: {}

  js-sdsl@4.3.0: {}

  js-tiktoken@1.0.18:
    dependencies:
      base64-js: 1.5.1

  js-tokens@4.0.0: {}

  js-yaml@4.1.0:
    dependencies:
      argparse: 2.0.1

  json-buffer@3.0.1: {}

  json-schema-traverse@0.4.1: {}

  json-stable-stringify-without-jsonify@1.0.1: {}

  json5@1.0.2:
    dependencies:
      minimist: 1.2.8

  jsonpointer@5.0.1: {}

  jsx-ast-utils@3.3.5:
    dependencies:
      array-includes: 3.1.8
      array.prototype.flat: 1.3.3
      object.assign: 4.1.7
      object.values: 1.2.1

  kafkajs@2.2.4: {}

  keyv@4.5.4:
    dependencies:
      json-buffer: 3.0.1

  langchain@0.3.15(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))(@langchain/google-genai@0.1.8(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))(zod@3.24.2))(@langchain/groq@0.1.3(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2))))(cheerio@1.0.0)(openai@4.84.0(zod@3.24.2)):
    dependencies:
      '@langchain/core': 0.3.40(openai@4.84.0(zod@3.24.2))
      '@langchain/openai': 0.4.4(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))
      '@langchain/textsplitters': 0.1.0(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))
      js-tiktoken: 1.0.18
      js-yaml: 4.1.0
      jsonpointer: 5.0.1
      langsmith: 0.3.7(openai@4.84.0(zod@3.24.2))
      openapi-types: 12.1.3
      p-retry: 4.6.2
      uuid: 10.0.0
      yaml: 2.7.0
      zod: 3.24.2
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    optionalDependencies:
      '@langchain/google-genai': 0.1.8(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))(zod@3.24.2)
      '@langchain/groq': 0.1.3(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))
      cheerio: 1.0.0
    transitivePeerDependencies:
      - encoding
      - openai
      - ws

  langsmith@0.3.7(openai@4.84.0(zod@3.24.2)):
    dependencies:
      '@types/uuid': 10.0.0
      chalk: 4.1.2
      console-table-printer: 2.12.1
      p-queue: 6.6.2
      p-retry: 4.6.2
      semver: 7.7.1
      uuid: 10.0.0
    optionalDependencies:
      openai: 4.84.0(zod@3.24.2)

  language-subtag-registry@0.3.23: {}

  language-tags@1.0.9:
    dependencies:
      language-subtag-registry: 0.3.23

  levn@0.4.1:
    dependencies:
      prelude-ls: 1.2.1
      type-check: 0.4.0

  libphonenumber-js@1.11.19: {}

  lilconfig@3.1.3: {}

  lines-and-columns@1.2.4: {}

  locate-path@6.0.0:
    dependencies:
      p-locate: 5.0.0

  lodash.camelcase@4.3.0: {}

  lodash.defaults@4.2.0: {}

  lodash.isarguments@3.1.0: {}

  lodash.merge@4.6.2: {}

  lodash@4.17.21: {}

  loglevel-colored-level-prefix@1.0.0:
    dependencies:
      chalk: 1.1.3
      loglevel: 1.9.2

  loglevel@1.9.2: {}

  long@5.3.0: {}

  loose-envify@1.4.0:
    dependencies:
      js-tokens: 4.0.0

  lru-cache@10.4.3: {}

  lucide-react@0.244.0(react@18.3.1):
    dependencies:
      react: 18.3.1

  math-intrinsics@1.1.0: {}

  media-typer@0.3.0: {}

  media-typer@1.1.0: {}

  merge-descriptors@2.0.0: {}

  merge2@1.4.1: {}

  methods@1.1.2: {}

  micromatch@4.0.8:
    dependencies:
      braces: 3.0.3
      picomatch: 2.3.1

  mime-db@1.52.0: {}

  mime-db@1.53.0: {}

  mime-types@2.1.35:
    dependencies:
      mime-db: 1.52.0

  mime-types@3.0.0:
    dependencies:
      mime-db: 1.53.0

  minimatch@3.1.2:
    dependencies:
      brace-expansion: 1.1.11

  minimatch@9.0.3:
    dependencies:
      brace-expansion: 2.0.1

  minimatch@9.0.5:
    dependencies:
      brace-expansion: 2.0.1

  minimist@1.2.8: {}

  minipass@7.1.2: {}

  mkdirp@0.5.6:
    dependencies:
      minimist: 1.2.8

  mqtt-packet@9.0.1:
    dependencies:
      bl: 6.0.19
      debug: 4.4.0
      process-nextick-args: 2.0.1
    transitivePeerDependencies:
      - supports-color

  mqtt@5.10.3:
    dependencies:
      '@types/readable-stream': 4.0.18
      '@types/ws': 8.5.14
      commist: 3.2.0
      concat-stream: 2.0.0
      debug: 4.4.0
      help-me: 5.0.0
      lru-cache: 10.4.3
      minimist: 1.2.8
      mqtt-packet: 9.0.1
      number-allocator: 1.0.14
      readable-stream: 4.7.0
      reinterval: 1.1.0
      rfdc: 1.4.1
      split2: 4.2.0
      worker-timers: 7.1.8
      ws: 8.17.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  ms@2.0.0: {}

  ms@2.1.2: {}

  ms@2.1.3: {}

  multer@1.4.5-lts.1:
    dependencies:
      append-field: 1.0.0
      busboy: 1.6.0
      concat-stream: 1.6.2
      mkdirp: 0.5.6
      object-assign: 4.1.1
      type-is: 1.6.18
      xtend: 4.0.2

  mustache@4.2.0: {}

  mz@2.7.0:
    dependencies:
      any-promise: 1.3.0
      object-assign: 4.1.1
      thenify-all: 1.6.0

  nanoid@3.3.8: {}

  nats@2.29.1:
    dependencies:
      nkeys.js: 1.1.0

  natural-compare@1.4.0: {}

  negotiator@0.6.3: {}

  negotiator@1.0.0: {}

  next-auth@5.0.0-beta.25(next@15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1))(react@18.3.1):
    dependencies:
      '@auth/core': 0.37.2
      next: 15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      react: 18.3.1

  next-themes@0.2.1(next@15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1))(react-dom@18.3.1(react@18.3.1))(react@18.3.1):
    dependencies:
      next: 15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1)
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)

  next@15.1.7(react-dom@18.3.1(react@18.3.1))(react@18.3.1):
    dependencies:
      '@next/env': 15.1.7
      '@swc/counter': 0.1.3
      '@swc/helpers': 0.5.15
      busboy: 1.6.0
      caniuse-lite: 1.0.30001699
      postcss: 8.4.31
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)
      styled-jsx: 5.1.6(react@18.3.1)
    optionalDependencies:
      '@next/swc-darwin-arm64': 15.1.7
      '@next/swc-darwin-x64': 15.1.7
      '@next/swc-linux-arm64-gnu': 15.1.7
      '@next/swc-linux-arm64-musl': 15.1.7
      '@next/swc-linux-x64-gnu': 15.1.7
      '@next/swc-linux-x64-musl': 15.1.7
      '@next/swc-win32-arm64-msvc': 15.1.7
      '@next/swc-win32-x64-msvc': 15.1.7
      sharp: 0.33.5
    transitivePeerDependencies:
      - '@babel/core'
      - babel-plugin-macros

  nkeys.js@1.1.0:
    dependencies:
      tweetnacl: 1.0.3

  node-domexception@1.0.0: {}

  node-fetch@2.7.0:
    dependencies:
      whatwg-url: 5.0.0

  node-releases@2.0.19: {}

  normalize-path@3.0.0: {}

  normalize-range@0.1.2: {}

  nth-check@2.1.1:
    dependencies:
      boolbase: 1.0.0

  number-allocator@1.0.14:
    dependencies:
      debug: 4.4.0
      js-sdsl: 4.3.0
    transitivePeerDependencies:
      - supports-color

  oauth4webapi@3.1.4: {}

  object-assign@4.1.1: {}

  object-hash@3.0.0: {}

  object-inspect@1.13.4: {}

  object-keys@1.1.1: {}

  object.assign@4.1.7:
    dependencies:
      call-bind: 1.0.8
      call-bound: 1.0.3
      define-properties: 1.2.1
      es-object-atoms: 1.1.1
      has-symbols: 1.1.0
      object-keys: 1.1.1

  object.entries@1.1.8:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-object-atoms: 1.1.1

  object.fromentries@2.0.8:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-object-atoms: 1.1.1

  object.groupby@1.0.3:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9

  object.values@1.2.1:
    dependencies:
      call-bind: 1.0.8
      call-bound: 1.0.3
      define-properties: 1.2.1
      es-object-atoms: 1.1.1

  on-finished@2.4.1:
    dependencies:
      ee-first: 1.1.1

  once@1.4.0:
    dependencies:
      wrappy: 1.0.2

  openai@4.84.0(zod@3.24.2):
    dependencies:
      '@types/node': 18.19.75
      '@types/node-fetch': 2.6.12
      abort-controller: 3.0.0
      agentkeepalive: 4.6.0
      form-data-encoder: 1.7.2
      formdata-node: 4.4.1
      node-fetch: 2.7.0
    optionalDependencies:
      zod: 3.24.2
    transitivePeerDependencies:
      - encoding

  openapi-types@12.1.3: {}

  optionator@0.9.4:
    dependencies:
      deep-is: 0.1.4
      fast-levenshtein: 2.0.6
      levn: 0.4.1
      prelude-ls: 1.2.1
      type-check: 0.4.0
      word-wrap: 1.2.5

  own-keys@1.0.1:
    dependencies:
      get-intrinsic: 1.2.7
      object-keys: 1.1.1
      safe-push-apply: 1.0.0

  p-finally@1.0.0: {}

  p-limit@3.1.0:
    dependencies:
      yocto-queue: 0.1.0

  p-locate@5.0.0:
    dependencies:
      p-limit: 3.1.0

  p-queue@6.6.2:
    dependencies:
      eventemitter3: 4.0.7
      p-timeout: 3.2.0

  p-retry@4.6.2:
    dependencies:
      '@types/retry': 0.12.0
      retry: 0.13.1

  p-timeout@3.2.0:
    dependencies:
      p-finally: 1.0.0

  package-json-from-dist@1.0.1: {}

  parent-module@1.0.1:
    dependencies:
      callsites: 3.1.0

  parse5-htmlparser2-tree-adapter@7.1.0:
    dependencies:
      domhandler: 5.0.3
      parse5: 7.2.1

  parse5-parser-stream@7.1.2:
    dependencies:
      parse5: 7.2.1

  parse5@7.2.1:
    dependencies:
      entities: 4.5.0

  parseurl@1.3.3: {}

  path-exists@4.0.0: {}

  path-is-absolute@1.0.1: {}

  path-key@3.1.1: {}

  path-parse@1.0.7: {}

  path-scurry@1.11.1:
    dependencies:
      lru-cache: 10.4.3
      minipass: 7.1.2

  path-to-regexp@8.2.0: {}

  path-type@4.0.0: {}

  picocolors@1.1.1: {}

  picomatch@2.3.1: {}

  pify@2.3.0: {}

  pirates@4.0.6: {}

  possible-typed-array-names@1.1.0: {}

  postcss-import@15.1.0(postcss@8.5.2):
    dependencies:
      postcss: 8.5.2
      postcss-value-parser: 4.2.0
      read-cache: 1.0.0
      resolve: 1.22.10

  postcss-js@4.0.1(postcss@8.5.2):
    dependencies:
      camelcase-css: 2.0.1
      postcss: 8.5.2

  postcss-load-config@4.0.2(postcss@8.5.2):
    dependencies:
      lilconfig: 3.1.3
      yaml: 2.7.0
    optionalDependencies:
      postcss: 8.5.2

  postcss-nested@6.2.0(postcss@8.5.2):
    dependencies:
      postcss: 8.5.2
      postcss-selector-parser: 6.1.2

  postcss-selector-parser@6.1.2:
    dependencies:
      cssesc: 3.0.0
      util-deprecate: 1.0.2

  postcss-value-parser@4.2.0: {}

  postcss@8.4.31:
    dependencies:
      nanoid: 3.3.8
      picocolors: 1.1.1
      source-map-js: 1.2.1

  postcss@8.5.2:
    dependencies:
      nanoid: 3.3.8
      picocolors: 1.1.1
      source-map-js: 1.2.1

  postgres@3.4.5: {}

  preact-render-to-string@5.2.3(preact@10.11.3):
    dependencies:
      preact: 10.11.3
      pretty-format: 3.8.0

  preact-render-to-string@6.5.11(preact@10.24.3):
    dependencies:
      preact: 10.24.3

  preact@10.11.3: {}

  preact@10.24.3: {}

  prelude-ls@1.2.1: {}

  prettier-eslint@16.3.0:
    dependencies:
      '@typescript-eslint/parser': 6.21.0(eslint@8.57.1)(typescript@5.7.3)
      common-tags: 1.8.2
      dlv: 1.1.3
      eslint: 8.57.1
      indent-string: 4.0.0
      lodash.merge: 4.6.2
      loglevel-colored-level-prefix: 1.0.0
      prettier: 3.5.0
      pretty-format: 29.7.0
      require-relative: 0.8.7
      typescript: 5.7.3
      vue-eslint-parser: 9.4.3(eslint@8.57.1)
    transitivePeerDependencies:
      - supports-color

  prettier-linter-helpers@1.0.0:
    dependencies:
      fast-diff: 1.3.0

  prettier-plugin-tailwindcss@0.6.11(prettier@3.5.0):
    dependencies:
      prettier: 3.5.0

  prettier@3.5.0: {}

  pretty-format@29.7.0:
    dependencies:
      '@jest/schemas': 29.6.3
      ansi-styles: 5.2.0
      react-is: 18.3.1

  pretty-format@3.8.0: {}

  process-nextick-args@2.0.1: {}

  process@0.11.10: {}

  promise-breaker@6.0.0: {}

  prop-types@15.8.1:
    dependencies:
      loose-envify: 1.4.0
      object-assign: 4.1.1
      react-is: 16.13.1

  protobufjs@7.4.0:
    dependencies:
      '@protobufjs/aspromise': 1.1.2
      '@protobufjs/base64': 1.1.2
      '@protobufjs/codegen': 2.0.4
      '@protobufjs/eventemitter': 1.1.0
      '@protobufjs/fetch': 1.1.0
      '@protobufjs/float': 1.0.2
      '@protobufjs/inquire': 1.1.0
      '@protobufjs/path': 1.1.2
      '@protobufjs/pool': 1.1.0
      '@protobufjs/utf8': 1.1.0
      '@types/node': 20.17.17
      long: 5.3.0

  proxy-addr@2.0.7:
    dependencies:
      forwarded: 0.2.0
      ipaddr.js: 1.9.1

  punycode@2.3.1: {}

  qs@6.13.0:
    dependencies:
      side-channel: 1.1.0

  qs@6.14.0:
    dependencies:
      side-channel: 1.1.0

  querystringify@2.2.0: {}

  queue-microtask@1.2.3: {}

  range-parser@1.2.1: {}

  raw-body@3.0.0:
    dependencies:
      bytes: 3.1.2
      http-errors: 2.0.0
      iconv-lite: 0.6.3
      unpipe: 1.0.0

  react-chartjs-2@5.3.0(chart.js@4.4.7)(react@18.3.1):
    dependencies:
      chart.js: 4.4.7
      react: 18.3.1

  react-dom@18.3.1(react@18.3.1):
    dependencies:
      loose-envify: 1.4.0
      react: 18.3.1
      scheduler: 0.23.2

  react-hook-form@7.54.2(react@18.3.1):
    dependencies:
      react: 18.3.1

  react-is@16.13.1: {}

  react-is@18.3.1: {}

  react-remove-scroll-bar@2.3.8(@types/react@18.3.18)(react@18.3.1):
    dependencies:
      react: 18.3.1
      react-style-singleton: 2.2.3(@types/react@18.3.18)(react@18.3.1)
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 18.3.18

  react-remove-scroll@2.6.3(@types/react@18.3.18)(react@18.3.1):
    dependencies:
      react: 18.3.1
      react-remove-scroll-bar: 2.3.8(@types/react@18.3.18)(react@18.3.1)
      react-style-singleton: 2.2.3(@types/react@18.3.18)(react@18.3.1)
      tslib: 2.8.1
      use-callback-ref: 1.3.3(@types/react@18.3.18)(react@18.3.1)
      use-sidecar: 1.1.3(@types/react@18.3.18)(react@18.3.1)
    optionalDependencies:
      '@types/react': 18.3.18

  react-style-singleton@2.2.3(@types/react@18.3.18)(react@18.3.1):
    dependencies:
      get-nonce: 1.0.1
      react: 18.3.1
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 18.3.18

  react@18.3.1:
    dependencies:
      loose-envify: 1.4.0

  read-cache@1.0.0:
    dependencies:
      pify: 2.3.0

  readable-stream@2.3.8:
    dependencies:
      core-util-is: 1.0.3
      inherits: 2.0.4
      isarray: 1.0.0
      process-nextick-args: 2.0.1
      safe-buffer: 5.1.2
      string_decoder: 1.1.1
      util-deprecate: 1.0.2

  readable-stream@3.6.2:
    dependencies:
      inherits: 2.0.4
      string_decoder: 1.1.1
      util-deprecate: 1.0.2

  readable-stream@4.7.0:
    dependencies:
      abort-controller: 3.0.0
      buffer: 6.0.3
      events: 3.3.0
      process: 0.11.10
      string_decoder: 1.3.0

  readdirp@3.6.0:
    dependencies:
      picomatch: 2.3.1

  redis-errors@1.2.0: {}

  redis-parser@3.0.0:
    dependencies:
      redis-errors: 1.2.0

  reflect-metadata@0.2.2: {}

  reflect.getprototypeof@1.0.10:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-errors: 1.3.0
      es-object-atoms: 1.1.1
      get-intrinsic: 1.2.7
      get-proto: 1.0.1
      which-builtin-type: 1.2.1

  regenerator-runtime@0.14.1: {}

  regexp.prototype.flags@1.5.4:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-errors: 1.3.0
      get-proto: 1.0.1
      gopd: 1.2.0
      set-function-name: 2.0.2

  reinterval@1.1.0: {}

  require-directory@2.1.1: {}

  require-relative@0.8.7: {}

  requires-port@1.0.0: {}

  resolve-from@4.0.0: {}

  resolve-pkg-maps@1.0.0: {}

  resolve@1.22.10:
    dependencies:
      is-core-module: 2.16.1
      path-parse: 1.0.7
      supports-preserve-symlinks-flag: 1.0.0

  resolve@2.0.0-next.5:
    dependencies:
      is-core-module: 2.16.1
      path-parse: 1.0.7
      supports-preserve-symlinks-flag: 1.0.0

  retry@0.13.1: {}

  reusify@1.0.4: {}

  rfdc@1.4.1: {}

  rimraf@3.0.2:
    dependencies:
      glob: 7.2.3

  router@2.1.0:
    dependencies:
      is-promise: 4.0.0
      parseurl: 1.3.3
      path-to-regexp: 8.2.0

  run-parallel@1.2.0:
    dependencies:
      queue-microtask: 1.2.3

  rxjs@7.8.1:
    dependencies:
      tslib: 2.8.1

  safe-array-concat@1.1.3:
    dependencies:
      call-bind: 1.0.8
      call-bound: 1.0.3
      get-intrinsic: 1.2.7
      has-symbols: 1.1.0
      isarray: 2.0.5

  safe-buffer@5.1.2: {}

  safe-buffer@5.2.1: {}

  safe-push-apply@1.0.0:
    dependencies:
      es-errors: 1.3.0
      isarray: 2.0.5

  safe-regex-test@1.1.0:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      is-regex: 1.2.1

  safer-buffer@2.1.2: {}

  scheduler@0.23.2:
    dependencies:
      loose-envify: 1.4.0

  semver@6.3.1: {}

  semver@7.7.1: {}

  send@1.1.0:
    dependencies:
      debug: 4.4.0
      destroy: 1.2.0
      encodeurl: 2.0.0
      escape-html: 1.0.3
      etag: 1.8.1
      fresh: 0.5.2
      http-errors: 2.0.0
      mime-types: 2.1.35
      ms: 2.1.3
      on-finished: 2.4.1
      range-parser: 1.2.1
      statuses: 2.0.1
    transitivePeerDependencies:
      - supports-color

  serve-static@2.1.0:
    dependencies:
      encodeurl: 2.0.0
      escape-html: 1.0.3
      parseurl: 1.3.3
      send: 1.1.0
    transitivePeerDependencies:
      - supports-color

  server-only@0.0.1: {}

  set-function-length@1.2.2:
    dependencies:
      define-data-property: 1.1.4
      es-errors: 1.3.0
      function-bind: 1.1.2
      get-intrinsic: 1.2.7
      gopd: 1.2.0
      has-property-descriptors: 1.0.2

  set-function-name@2.0.2:
    dependencies:
      define-data-property: 1.1.4
      es-errors: 1.3.0
      functions-have-names: 1.2.3
      has-property-descriptors: 1.0.2

  set-proto@1.0.0:
    dependencies:
      dunder-proto: 1.0.1
      es-errors: 1.3.0
      es-object-atoms: 1.1.1

  setprototypeof@1.2.0: {}

  sharp@0.33.5:
    dependencies:
      color: 4.2.3
      detect-libc: 2.0.3
      semver: 7.7.1
    optionalDependencies:
      '@img/sharp-darwin-arm64': 0.33.5
      '@img/sharp-darwin-x64': 0.33.5
      '@img/sharp-libvips-darwin-arm64': 1.0.4
      '@img/sharp-libvips-darwin-x64': 1.0.4
      '@img/sharp-libvips-linux-arm': 1.0.5
      '@img/sharp-libvips-linux-arm64': 1.0.4
      '@img/sharp-libvips-linux-s390x': 1.0.4
      '@img/sharp-libvips-linux-x64': 1.0.4
      '@img/sharp-libvips-linuxmusl-arm64': 1.0.4
      '@img/sharp-libvips-linuxmusl-x64': 1.0.4
      '@img/sharp-linux-arm': 0.33.5
      '@img/sharp-linux-arm64': 0.33.5
      '@img/sharp-linux-s390x': 0.33.5
      '@img/sharp-linux-x64': 0.33.5
      '@img/sharp-linuxmusl-arm64': 0.33.5
      '@img/sharp-linuxmusl-x64': 0.33.5
      '@img/sharp-wasm32': 0.33.5
      '@img/sharp-win32-ia32': 0.33.5
      '@img/sharp-win32-x64': 0.33.5
    optional: true

  shebang-command@2.0.0:
    dependencies:
      shebang-regex: 3.0.0

  shebang-regex@3.0.0: {}

  side-channel-list@1.0.0:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4

  side-channel-map@1.0.1:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      get-intrinsic: 1.2.7
      object-inspect: 1.13.4

  side-channel-weakmap@1.0.2:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      get-intrinsic: 1.2.7
      object-inspect: 1.13.4
      side-channel-map: 1.0.1

  side-channel@1.1.0:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4
      side-channel-list: 1.0.0
      side-channel-map: 1.0.1
      side-channel-weakmap: 1.0.2

  signal-exit@4.1.0: {}

  simple-swizzle@0.2.2:
    dependencies:
      is-arrayish: 0.3.2
    optional: true

  simple-wcswidth@1.0.1: {}

  slash@3.0.0: {}

  socket.io-adapter@2.5.5:
    dependencies:
      debug: 4.3.7
      ws: 8.17.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  socket.io-parser@4.2.4:
    dependencies:
      '@socket.io/component-emitter': 3.1.2
      debug: 4.3.7
    transitivePeerDependencies:
      - supports-color

  socket.io@4.8.1:
    dependencies:
      accepts: 1.3.8
      base64id: 2.0.0
      cors: 2.8.5
      debug: 4.3.7
      engine.io: 6.6.4
      socket.io-adapter: 2.5.5
      socket.io-parser: 4.2.4
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  sonner@1.7.4(react-dom@18.3.1(react@18.3.1))(react@18.3.1):
    dependencies:
      react: 18.3.1
      react-dom: 18.3.1(react@18.3.1)

  source-map-js@1.2.1: {}

  source-map-support@0.5.21:
    dependencies:
      buffer-from: 1.1.2
      source-map: 0.6.1

  source-map@0.6.1: {}

  split2@4.2.0: {}

  stable-hash@0.0.4: {}

  standard-as-callback@2.1.0: {}

  statuses@2.0.1: {}

  streamsearch@1.1.0: {}

  string-width@4.2.3:
    dependencies:
      emoji-regex: 8.0.0
      is-fullwidth-code-point: 3.0.0
      strip-ansi: 6.0.1

  string-width@5.1.2:
    dependencies:
      eastasianwidth: 0.2.0
      emoji-regex: 9.2.2
      strip-ansi: 7.1.0

  string.prototype.includes@2.0.1:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-abstract: 1.23.9

  string.prototype.matchall@4.0.12:
    dependencies:
      call-bind: 1.0.8
      call-bound: 1.0.3
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-errors: 1.3.0
      es-object-atoms: 1.1.1
      get-intrinsic: 1.2.7
      gopd: 1.2.0
      has-symbols: 1.1.0
      internal-slot: 1.1.0
      regexp.prototype.flags: 1.5.4
      set-function-name: 2.0.2
      side-channel: 1.1.0

  string.prototype.repeat@1.0.0:
    dependencies:
      define-properties: 1.2.1
      es-abstract: 1.23.9

  string.prototype.trim@1.2.10:
    dependencies:
      call-bind: 1.0.8
      call-bound: 1.0.3
      define-data-property: 1.1.4
      define-properties: 1.2.1
      es-abstract: 1.23.9
      es-object-atoms: 1.1.1
      has-property-descriptors: 1.0.2

  string.prototype.trimend@1.0.9:
    dependencies:
      call-bind: 1.0.8
      call-bound: 1.0.3
      define-properties: 1.2.1
      es-object-atoms: 1.1.1

  string.prototype.trimstart@1.0.8:
    dependencies:
      call-bind: 1.0.8
      define-properties: 1.2.1
      es-object-atoms: 1.1.1

  string_decoder@1.1.1:
    dependencies:
      safe-buffer: 5.1.2

  string_decoder@1.3.0:
    dependencies:
      safe-buffer: 5.2.1

  strip-ansi@3.0.1:
    dependencies:
      ansi-regex: 2.1.1

  strip-ansi@6.0.1:
    dependencies:
      ansi-regex: 5.0.1

  strip-ansi@7.1.0:
    dependencies:
      ansi-regex: 6.1.0

  strip-bom@3.0.0: {}

  strip-json-comments@3.1.1: {}

  styled-jsx@5.1.6(react@18.3.1):
    dependencies:
      client-only: 0.0.1
      react: 18.3.1

  sucrase@3.35.0:
    dependencies:
      '@jridgewell/gen-mapping': 0.3.8
      commander: 4.1.1
      glob: 10.4.5
      lines-and-columns: 1.2.4
      mz: 2.7.0
      pirates: 4.0.6
      ts-interface-checker: 0.1.13

  superjson@2.2.2:
    dependencies:
      copy-anything: 3.0.5

  supports-color@2.0.0: {}

  supports-color@7.2.0:
    dependencies:
      has-flag: 4.0.0

  supports-preserve-symlinks-flag@1.0.0: {}

  synckit@0.9.2:
    dependencies:
      '@pkgr/core': 0.1.1
      tslib: 2.8.1

  tailwind-merge@3.0.1: {}

  tailwindcss-animate@1.0.7(tailwindcss@3.4.17):
    dependencies:
      tailwindcss: 3.4.17

  tailwindcss@3.4.17:
    dependencies:
      '@alloc/quick-lru': 5.2.0
      arg: 5.0.2
      chokidar: 3.6.0
      didyoumean: 1.2.2
      dlv: 1.1.3
      fast-glob: 3.3.3
      glob-parent: 6.0.2
      is-glob: 4.0.3
      jiti: 1.21.7
      lilconfig: 3.1.3
      micromatch: 4.0.8
      normalize-path: 3.0.0
      object-hash: 3.0.0
      picocolors: 1.1.1
      postcss: 8.5.2
      postcss-import: 15.1.0(postcss@8.5.2)
      postcss-js: 4.0.1(postcss@8.5.2)
      postcss-load-config: 4.0.2(postcss@8.5.2)
      postcss-nested: 6.2.0(postcss@8.5.2)
      postcss-selector-parser: 6.1.2
      resolve: 1.22.10
      sucrase: 3.35.0
    transitivePeerDependencies:
      - ts-node

  tapable@2.2.1: {}

  text-table@0.2.0: {}

  thenify-all@1.6.0:
    dependencies:
      thenify: 3.3.1

  thenify@3.3.1:
    dependencies:
      any-promise: 1.3.0

  to-regex-range@5.0.1:
    dependencies:
      is-number: 7.0.0

  toidentifier@1.0.1: {}

  tr46@0.0.3: {}

  ts-api-utils@1.4.3(typescript@5.7.3):
    dependencies:
      typescript: 5.7.3

  ts-api-utils@2.0.1(typescript@5.7.3):
    dependencies:
      typescript: 5.7.3

  ts-interface-checker@0.1.13: {}

  tsconfig-paths@3.15.0:
    dependencies:
      '@types/json5': 0.0.29
      json5: 1.0.2
      minimist: 1.2.8
      strip-bom: 3.0.0

  tslib@2.8.1: {}

  tweetnacl@1.0.3: {}

  type-check@0.4.0:
    dependencies:
      prelude-ls: 1.2.1

  type-fest@0.20.2: {}

  type-is@1.6.18:
    dependencies:
      media-typer: 0.3.0
      mime-types: 2.1.35

  type-is@2.0.0:
    dependencies:
      content-type: 1.0.5
      media-typer: 1.1.0
      mime-types: 3.0.0

  typed-array-buffer@1.0.3:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      is-typed-array: 1.1.15

  typed-array-byte-length@1.0.3:
    dependencies:
      call-bind: 1.0.8
      for-each: 0.3.5
      gopd: 1.2.0
      has-proto: 1.2.0
      is-typed-array: 1.1.15

  typed-array-byte-offset@1.0.4:
    dependencies:
      available-typed-arrays: 1.0.7
      call-bind: 1.0.8
      for-each: 0.3.5
      gopd: 1.2.0
      has-proto: 1.2.0
      is-typed-array: 1.1.15
      reflect.getprototypeof: 1.0.10

  typed-array-length@1.0.7:
    dependencies:
      call-bind: 1.0.8
      for-each: 0.3.5
      gopd: 1.2.0
      is-typed-array: 1.1.15
      possible-typed-array-names: 1.1.0
      reflect.getprototypeof: 1.0.10

  typedarray@0.0.6: {}

  typescript@5.7.3: {}

  uid@2.0.2:
    dependencies:
      '@lukeed/csprng': 1.1.0

  unbox-primitive@1.1.0:
    dependencies:
      call-bound: 1.0.3
      has-bigints: 1.1.0
      has-symbols: 1.1.0
      which-boxed-primitive: 1.1.1

  undici-types@5.26.5: {}

  undici-types@6.19.8: {}

  undici@6.21.1: {}

  unpipe@1.0.0: {}

  update-browserslist-db@1.1.2(browserslist@4.24.4):
    dependencies:
      browserslist: 4.24.4
      escalade: 3.2.0
      picocolors: 1.1.1

  uri-js@4.4.1:
    dependencies:
      punycode: 2.3.1

  url-parse@1.5.10:
    dependencies:
      querystringify: 2.2.0
      requires-port: 1.0.0

  use-callback-ref@1.3.3(@types/react@18.3.18)(react@18.3.1):
    dependencies:
      react: 18.3.1
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 18.3.18

  use-sidecar@1.1.3(@types/react@18.3.18)(react@18.3.1):
    dependencies:
      detect-node-es: 1.1.0
      react: 18.3.1
      tslib: 2.8.1
    optionalDependencies:
      '@types/react': 18.3.18

  util-deprecate@1.0.2: {}

  utils-merge@1.0.1: {}

  uuid@10.0.0: {}

  validator@13.12.0: {}

  vary@1.1.2: {}

  vue-eslint-parser@9.4.3(eslint@8.57.1):
    dependencies:
      debug: 4.4.0
      eslint: 8.57.1
      eslint-scope: 7.2.2
      eslint-visitor-keys: 3.4.3
      espree: 9.6.1
      esquery: 1.6.0
      lodash: 4.17.21
      semver: 7.7.1
    transitivePeerDependencies:
      - supports-color

  web-streams-polyfill@3.3.3: {}

  web-streams-polyfill@4.0.0-beta.3: {}

  webidl-conversions@3.0.1: {}

  whatwg-encoding@3.1.1:
    dependencies:
      iconv-lite: 0.6.3

  whatwg-mimetype@4.0.0: {}

  whatwg-url@5.0.0:
    dependencies:
      tr46: 0.0.3
      webidl-conversions: 3.0.1

  which-boxed-primitive@1.1.1:
    dependencies:
      is-bigint: 1.1.0
      is-boolean-object: 1.2.2
      is-number-object: 1.1.1
      is-string: 1.1.1
      is-symbol: 1.1.1

  which-builtin-type@1.2.1:
    dependencies:
      call-bound: 1.0.3
      function.prototype.name: 1.1.8
      has-tostringtag: 1.0.2
      is-async-function: 2.1.1
      is-date-object: 1.1.0
      is-finalizationregistry: 1.1.1
      is-generator-function: 1.1.0
      is-regex: 1.2.1
      is-weakref: 1.1.1
      isarray: 2.0.5
      which-boxed-primitive: 1.1.1
      which-collection: 1.0.2
      which-typed-array: 1.1.18

  which-collection@1.0.2:
    dependencies:
      is-map: 2.0.3
      is-set: 2.0.3
      is-weakmap: 2.0.2
      is-weakset: 2.0.4

  which-typed-array@1.1.18:
    dependencies:
      available-typed-arrays: 1.0.7
      call-bind: 1.0.8
      call-bound: 1.0.3
      for-each: 0.3.5
      gopd: 1.2.0
      has-tostringtag: 1.0.2

  which@2.0.2:
    dependencies:
      isexe: 2.0.0

  word-wrap@1.2.5: {}

  worker-timers-broker@6.1.8:
    dependencies:
      '@babel/runtime': 7.26.7
      fast-unique-numbers: 8.0.13
      tslib: 2.8.1
      worker-timers-worker: 7.0.71

  worker-timers-worker@7.0.71:
    dependencies:
      '@babel/runtime': 7.26.7
      tslib: 2.8.1

  worker-timers@7.1.8:
    dependencies:
      '@babel/runtime': 7.26.7
      tslib: 2.8.1
      worker-timers-broker: 6.1.8
      worker-timers-worker: 7.0.71

  wrap-ansi@7.0.0:
    dependencies:
      ansi-styles: 4.3.0
      string-width: 4.2.3
      strip-ansi: 6.0.1

  wrap-ansi@8.1.0:
    dependencies:
      ansi-styles: 6.2.1
      string-width: 5.1.2
      strip-ansi: 7.1.0

  wrappy@1.0.2: {}

  ws@8.17.1: {}

  xtend@4.0.2: {}

  y18n@5.0.8: {}

  yaml@2.7.0: {}

  yargs-parser@21.1.1: {}

  yargs@17.7.2:
    dependencies:
      cliui: 8.0.1
      escalade: 3.2.0
      get-caller-file: 2.0.5
      require-directory: 2.1.1
      string-width: 4.2.3
      y18n: 5.0.8
      yargs-parser: 21.1.1

  yocto-queue@0.1.0: {}

  zod-to-json-schema@3.24.1(zod@3.24.2):
    dependencies:
      zod: 3.24.2

  zod@3.24.2: {}
-e 
```
-e 

# postcss.config.js
```
export default {
  plugins: {
    tailwindcss: {},
  },
};
-e 
```
-e 

# prettier.config.js
```
/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
  plugins: ['prettier-plugin-tailwindcss'],
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  semi: true,
  overrides: [
    {
      files: ['src/microservices/**/*.ts', 'src/microservices/**/*.js'],
      options: {
        singleQuote: true,
        trailingComma: 'all',
        printWidth: 80,
      },
    },
  ],
};
-e 
```
-e 

# public/favicon.ico
```
         h  6          (  ž  00     h&  Æ  (                                                                                                                                                                                     îèáLïçäA            ñêã$ïèâŽðèáµðèá™ñçâ5                        ðèâÀñéã¤        óçäAðèâôðèáçïèâ±ðèâÜðèâüïèâb                    ðèâÀñéã¤    ÿÿÿðèãâðèâ»ÿææ
    ÿÿÿïèá›ðçâ÷ëëâ                ðèâÀñéã¤        ñéä}ôêä0            ïßßðèâüòêâb                ðèâÀñéã¤                            ¿¿¿ðçáøñçãl                ðèâÀñéã¤                            ïçá_ðèâÿðåà2                ðèâÀñéã¤            òêä_ñèâX    ñéã\ñèâùñçâŸ                    ðèâÀñéã¤        ÿ  ðèâžñéâúïæãRíííñèãmÿÿÿ                    ðèâÀñéã¤            ÿÿªïèã£ðèâùòèáL                            ôéÞòææ                ¿¿¿ñèâ§ñèâ÷ñæâG        ïèâNñèâ°ñèâ°ñèâ°ñèâ°ñèâ°ñèâ°ñèâ°ñèâ°ñèâ°òéãQÿÿÿðéã«ïçâöóçäA    ïèâOñèã³ñèã³ñèã³ñèã³ñèã³ñèã³ñèã³ñèã³ñèã³ðèâ®öíåÿÿÿñèâ|ïçá€ßßß                                                                                                                                                                                                (       @                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ßßßðèàBðéâhïèánïéãRóèè                                                        ðèãfðèâÉðèâÉîåá;                        èèÑñêäƒðèáïðèâÿðèâÿðèâÿðèâÿðèâüðçâ­ñêã%                                                ñéãðèâÿðèâÿñêãJ                    îææñèâÔðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿïèâôòèâO                                            ñéãðèâÿðèâÿñêãJ                îÝÝñéãØðèâÿðèâÿðçáùïèá¤ðèãfïçá_îçâ‹ñéâæðèâÿðèâÿñèâùóêâ>                                        ñéãðèâÿðèâÿñêãJ                ñéâ”ðèâÿðèâÿðèâÚìæà)                êêêðèâ§ðèâÿðèâÿðèâÞÿÿÛ                                    ñéãðèâÿðèâÿñêãJ            ïïïñèâøðèâÿïèâóðèá"                        ÿÿÿïçâÂðèâÿðèâÿòêä_                                    ñéãðèâÿðèâÿñêãJ                ðèä{ðèâÿðéâŒ                                îæâ=ðèâÿðèâÿðèâ¯                                    ñéãðèâÿðèâÿñêãJ                    ðèä{ñçâ5                                ÿÿÿïçâôðèâÿñéãÚ                                    ñéãðèâÿðèâÿñêãJ                                                                ñèâåðèâÿïèâä                                    ñéãðèâÿðèâÿñêãJ                                                            ííÛðèâüðèâÿðçâÍ                                    ñéãðèâÿðèâÿñêãJ                                                            îçâiðèâÿðèâÿïçâ“                                    ñéãðèâÿðèâÿñêãJ                                                        ñêã%ñèãìðèâÿðèâþðæá3                                    ñéãðèâÿðèâÿñêãJ                            õëæ4òéä9            ÿÿÿðçáUñèâèðèâÿðèâÿïèá£                                        ñéãðèâÿðèâÿñêãJ                        ðéãSïèâõðèâðñìâ5        íçá*ðèâððèâÿðèâÿðçâÍíÛÛ                                        ñéãðèâÿðèâÿñêãJ                    ÿ€€ñéã¶ðèâÿðèâÿñèâíïåà1        ñèä8ðèâñðçâ­îîî                                            ñéãðèâÿðèâÿñêãJ                        ÿãã	ðèá¼ðèâÿðèâÿðçâëîèâ,        óóè                                                    ñéãðèâÿðèâÿñêãJ                            ÿÿæ
ðèã¿ðèâÿðèâÿðèâèòæß(                                                            ñéãðèâÿðèâÿñêãJ                                êêêïçâÃðèâÿðèâÿðéâäñêã$                                                        ïæÞòêæ<òêæ<ñãã                                    íÛÛñèãÆðèâÿðèâÿðèãáðèà!                                                                                                            îîÝñèãÉðèâÿðèâÿðèâÝöíä                    ðçáVòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaòêåaóçá+        ðááðèâÌðèâÿðèâÿðèâÚëââ                ðèãàðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâìôèã-        òääðèâÐðèâÿðèâÿñèâÕóèè            ðèãàðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿñèâèòìæ(        ççÛïèâÓðèâÿðèâÿïèâÒææÙ        ñéã[ðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhðéâhòèáM            ÿÿßôéÞôéÞôéÞæææ
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    (   0   `                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ÿÿÿÿèèõëàðèá"ñêã%ñêã$îææää×¿¿¿                                                                                    ÿëëñçãJñçãJñçãJîåá;ÿÿÛ                                            ïçç ðéägïçá¡ðèâÊðéããðéâîðèâëñéãØñéã¶ðèâ…ðèäBããã	                                                                            íçá+ðèâíðèâíðèâíðèâ»ôéÞ                                    ÔÔÔïèâbñèâÖðèâöðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâýðçâêñéã¤ëââ                                                                        îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                ðááïèáðèâûðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿïçâáòéá;ÿÿÿ                                                                îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                            ìããðèâ¥ðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèãëðèâÜðèâáñèâøðèâÿðèâÿðèâÿðèâÿðèâÿðçâãïåâOÿÿÿ                                                            îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                        ÿßßðéá‰ðéâúðèâÿðèâÿðèâÿñéãûïèá¼ïåâOñêã$ïææðèà!ðëå2ðèâ†ðèâïðèâÿðèâÿðèâÿðèâþðçá×ðéâ#                                                            îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                        òíå:ïèáððèâÿðèâÿðèâÿðçâëîçâjÿÿÿ                        ðèà!ïèá½ðèáúðèâÿðèâÿðèâÿðèâ¨ÿÿÿ                                                        îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                    ÿÿÿñéâ¹ðèâÿðèâÿðèâÿðçáàïèâN                                    ééÞðèâ¨ðèâüðèâÿðèâÿðèâüñæßG                                                        îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                    óìæ)ñéãûðèâÿðèâÿñèâøðèãxÿÿÿ                                        óææ)ðèãàðèâÿðèâÿðèâÿðéâ·ÿÿÿ                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                        ðèäyïèâôðèâÿðèâÛïçß                                                 ñéã€ðèâÿðèâÿðèâÿðçâáëäÝ&                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                        æææ
ðêä{ïèâôòêã›ÿÿÿ                                                ðèà!ðèãüðèâÿðèâÿðçâíîçàJ                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                            æææ
ðèäyóçäA                                                    ÿÿÿðçâãðèâÿðèâÿðèâôòêä_                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                    ÿÿÿ                                                        ðèâÑðèâÿðèâÿðèâöðèãe                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                                                                            ÿÿÿñéâæðèâÿðèâÿðèãóñéä]                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                                                                            ñêã%ðèâýðèâÿðèâÿðèâìñéâG                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                                                                        ÿÿÿòèã‡ðèâÿðèâÿðèâÿðèâÞðèà!                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                                                                        ñçâ5ïçââðèâÿðèâÿðèâÿðèä¨ÿªª                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                                                                    óççðçâ¶ðèâýðèâÿðèâÿñéãýìçâ5                                                        îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                        ÿÿÿöîæøëä&ÿÿÿ                    ããã	óèâ,ïçâÁðèâÿðèâÿðèâÿðèâýðèá˜                                                            îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                    ÿÿÿðèäCðçâÌðèáÏíèß8ÿÿÿ            ëëëïçá€ðèáçðèâÿðèâÿðèâÿðèâþïçâÃïæÞ                                                            îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                    òèáLðèâáðèâþðèâýðèâËðèá"            ÿÿÔîèáyðçâ÷ðèâÿðèâÿðèâÿïçáàíèß8€€€                                                            îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                ÿ¿¿ñéâÄñéãüðèâÿðèâÿðèâÿðèáÏïïÞÿ          ÿÿÿïçàñèâ÷ðçáùñéäÍíçá*                                                                    îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                    ñêã$ðèâºðèâýðèâÿðèâÿðèâÿïèáÄîéã.            ÔÔÔòéãuñéãõëë                                                                        îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                    ÿÿÿòëä&ïèáÏðèâÿðèâÿðèâÿðèâýðèâ¿ëëâ            ÿÿÿÿÿÿ                                                                            îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                            öííïèâÑðèâýðèâÿðèâÿðèâÿðêã¿ôéé                                                                                            îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                                íçá*ïéâÁðéãýðèâÿðèâÿðèâÿñéâ·òäÝ&                                                                                        îãÞ.ðèâÿðèâÿðèâÿðèâÉëëà                                                ÿÿÿîèã-ñçâÖðèâÿðèâÿðèâÿðèâüñèâ²òææ                                                                                    ññãðëãdðëãdðëãdïèâOæææ
                                                        ñêã%ðçâÙðèâþðèâÿðèâÿðèâÿðéã­ññã                                                                                                                                                                    ïêà1ðèâÈðèâþðèâÿðèâÿðèâÿðéãªöîæ                                                                                                                                                                ÿÿÿðæâ4ðçâÝðèâÿðèâÿðèâÿðéãûñéã£ïßß                            ÿêê÷ïæðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ðèà!ôéÞÿÿÿ            îéã.ïèáßðèâþðèâÿðèâÿðèâÿðèášÿíí                        ðêäUñèã×ðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèãàðèá¾ïêä0                ñèä8ðéãÎðèâþðèâÿðèâÿðèâÿðèâœêêß                    ïçâaïèâõðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâýðçâÁöãÙ            ÿÿÿîêá<ïçâãðèâÿðèâÿðèâÿðèáúñéâ•ÿêê                ïçâaïèâõðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèâÿðèãÀôêß                íéä9ðéâäðèâÿðèâÿðèâÿðèâýðèã‡èèè            ñèâXðèâÞðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçðèâçïçá ëââ                îêá<ñèá’ðçâ–ðçâ–ðçâ–ïéâ”êåà1            ëëëððè!ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ðéâ#ïçß ããã	                ÿÿÿÛÛÛßßßßßßßßßßßßÿÿÿ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        -e 
```
-e 

# src/app/_components/post.tsx
```
'use client';

import { useState } from 'react';

import { api } from '~/trpc/react';

export function LatestPost() {
  const [latestPost] = api.post.getLatest.useSuspenseQuery();

  const utils = api.useUtils();
  const [name, setName] = useState('');
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      setName('');
    },
  });

  return (
    <div className="w-full max-w-xs">
      {latestPost ? (
        <p className="truncate">Your most recent post: {latestPost.name}</p>
      ) : (
        <p>You have no posts yet.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPost.mutate({ name });
        }}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-full px-4 py-2 text-black"
        />
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          disabled={createPost.isPending}
        >
          {createPost.isPending ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
-e 
```
-e 

# src/app/api/auth/[...nextauth]/route.ts
```
import { handlers } from '~/server/auth';

export const { GET, POST } = handlers;
-e 
```
-e 

# src/app/api/competitor-data/route.ts
```
import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userCompetitors, type UserCompetitor } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userCompetitorsList = (await db.query.userCompetitors.findMany({
    where: eq(userCompetitors.userId, session.user.id),
    with: { competitor: true },
  })) as UserCompetitor[];

  const competitors = userCompetitorsList.map((uc) => uc.competitor.domain);

  // Mock data - replace with real data later
  const priceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Your Price',
        data: [100, 105, 102, 108],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      ...competitors.map((_, index) => ({
        label: competitors[index],
        data: [98, 103, 106, 105].map((n) => n + Math.random() * 5),
        borderColor: `rgb(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100})`,
        backgroundColor: `rgba(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100}, 0.5)`,
      })),
    ],
  };

  return NextResponse.json({
    competitors,
    priceData,
  });
}
-e 
```
-e 

# src/app/api/competitor-discovery/route.ts
```
import { auth } from '~/auth';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as {
      domain: string;
      businessType: string;
      knownCompetitors: string[];
      productCatalogUrl: string;
    };

    if (!body.domain || !body.businessType || !body.productCatalogUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = MicroserviceClient.getInstance();
    const result = await client.discoverCompetitors({
      domain: body.domain,
      userId: session.user.id,
      businessType: body.businessType,
      knownCompetitors: body.knownCompetitors,
      productCatalogUrl: body.productCatalogUrl,
    });

    return Response.json(result);
  } catch (error) {
    console.error('Error discovering competitors:', error);
    return Response.json(
      { error: 'Failed to discover competitors' },
      { status: 500 },
    );
  }
}
-e 
```
-e 

# src/app/api/competitor-initial/route.ts
```
import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const onboardingData = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, session.user.id),
  });

  if (!onboardingData) {
    return NextResponse.json({ error: 'Onboarding not completed' }, { status: 400 });
  }

  if (!onboardingData.productCatalogUrl) {
    return NextResponse.json({ error: 'Product catalog URL is required' }, { status: 400 });
  }

  const competitors = onboardingData.identifiedCompetitors ?? [];
  const additionalCompetitors = await MicroserviceClient.getInstance().discoverCompetitors({
    domain: onboardingData.companyDomain,
    userId: session.user.id,
    businessType: onboardingData.businessType,
    knownCompetitors: competitors,
    productCatalogUrl: onboardingData.productCatalogUrl,
  });

  await db
    .update(userOnboarding)
    .set({ identifiedCompetitors: additionalCompetitors.competitors.map((c) => c.domain) })
    .where(eq(userOnboarding.userId, session.user.id));

  return NextResponse.json({
    competitors: additionalCompetitors,
  });
}
-e 
```
-e 

# src/app/api/competitors/route.ts
```
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding } from '~/server/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { z } from 'zod';

const schema = z.object({
  url: z.string().transform((url) => {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      throw new Error('Invalid URL');
    }
  }),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const domain = parsed.data.url;

  const existingOnboarding = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, session.user.id),
  });

  if (!existingOnboarding) {
    return NextResponse.json({ error: 'Complete onboarding first' }, { status: 400 });
  }

  if (!existingOnboarding.productCatalogUrl) {
    return NextResponse.json({ error: 'Product catalog URL is required' }, { status: 400 });
  }

  const result = await MicroserviceClient.getInstance().discoverCompetitors({
    domain,
    userId: session.user.id,
    businessType: existingOnboarding.businessType,
    knownCompetitors: [],
    productCatalogUrl: existingOnboarding.productCatalogUrl,
  });

  return NextResponse.json({
    success: true,
    ...result,
  });
}
-e 
```
-e 

# src/app/api/onboarding/route.ts
```
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding, users } from '~/server/db/schema';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';
const optionalUrl = z.preprocess(
  (a) => (typeof a === 'string' && a.trim() === '' ? undefined : a),
  z.string().url().optional(),
);

const schema = z.object({
  companyDomain: z.string().url(),
  productCatalog: z.string().url(),
  competitor1: optionalUrl,
  competitor2: optionalUrl,
  competitor3: optionalUrl,
  businessType: z.enum(['ecommerce', 'saas', 'marketplace', 'other']),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const input = (await req.json()) as z.infer<typeof schema>;
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const errorMessage =
      parsed.error.issues.find((i) => i.path.includes('productCatalog'))?.message ??
      'Invalid input data';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  const { companyDomain, productCatalog, competitor1, competitor2, competitor3, businessType } =
    parsed.data;
  const userCompetitors = [competitor1, competitor2, competitor3].filter(Boolean) as string[];
  const discoveryResult = await MicroserviceClient.getInstance().discoverCompetitors({
    domain: companyDomain,
    userId: session.user.id,
    businessType,
    knownCompetitors: userCompetitors,
    productCatalogUrl: productCatalog,
  });

  await db.insert(userOnboarding).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    companyDomain,
    productCatalogUrl: productCatalog,
    businessType,
    identifiedCompetitors: discoveryResult.competitors.map((c) => c.domain),
    completed: true,
  });

  await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, session.user.id));

  return NextResponse.json({
    success: true,
    ...discoveryResult,
  });
}
-e 
```
-e 

# src/app/api/trpc/[trpc]/route.ts
```
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type NextRequest } from 'next/server';

import { env } from '~/env';
import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`âŒ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
          }
        : undefined,
  });

export { handler as GET, handler as POST };
-e 
```
-e 

# src/app/dashboard/page.tsx
```
'use client';

import PricingDashboard from '~/components/pricing-dashboard';

export default function DashboardPage() {
  return <PricingDashboard />;
}
-e 
```
-e 

# src/app/home-client.tsx
```
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PricingDashboard from '~/components/pricing-dashboard';
import { type Session } from 'next-auth';
import { useEffect } from 'react';

export default function HomeClient({ session }: { session: Session }) {
  const router = useRouter();
  const { data: clientSession, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && !clientSession.user?.onboardingCompleted) {
      router.push('/onboarding');
    }
  }, [status, clientSession?.user?.onboardingCompleted, router, session.user.onboardingCompleted]);

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return null;

  return <PricingDashboard />;
}
-e 
```
-e 

# src/app/layout.tsx
```
import { GeistSans } from 'geist/font/sans';
// import { Inter } from "next/font/google"
import { ThemeProvider } from '~/components/theme-provider';
import '~/styles/globals.css';
import type React from 'react';
import { type Metadata } from 'next';
import { TRPCReactProvider } from '~/trpc/react';
import { SessionProvider } from 'next-auth/react';

export const metadata: Metadata = {
  title: 'Sagelytics - AI-Powered Pricing Strategy Platform',
  description: 'Optimize your e-commerce pricing with AI-driven insights and automated strategies.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

// const inter = Inter({ subsets: ["latin"] })

console.log('Before RootLayout');

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider>
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
-e 
```
-e 

# src/app/login/page.tsx
```
'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { LoginForm } from '~/components/login-form';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PatternBackground } from '~/components/ui/pattern-background';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      void router.push('/');
    }
  }, [session, router]);
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Image
                src="/owl-logo.png"
                alt="Sagelytics"
                className="size-4"
                width={16}
                height={16}
              />
            </div>
            Sagelytics
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <PatternBackground className="absolute inset-0" />
      </div>
    </div>
  );
}
-e 
```
-e 

# src/app/onboarding/page.tsx
```
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useRouter } from 'next/navigation';
import { Building2, Link2, Users2, Key } from 'lucide-react';
import { Progress } from '~/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Controller } from 'react-hook-form';

const fullSchema = z
  .object({
    companyDomain: z.string().url({ message: 'Valid company domain required' }),
    productCatalog: z.string().url().optional().or(z.literal('')),
    competitor1: z.string().optional().default(''),
    competitor2: z.string().optional().default(''),
    competitor3: z.string().optional().default(''),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    businessType: z.enum(['ecommerce', 'saas', 'marketplace', 'other']),
  })
  .refine(
    (data) =>
      !(data.apiKey && !data.apiSecret) && !(data.apiKey && data.apiSecret),
    {
      message: 'Both API fields must be filled or left empty',
      path: ['apiSecret'],
    },
  );

type FullForm = z.infer<typeof fullSchema>;

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors },
  } = useForm<FullForm>({
    resolver: zodResolver(fullSchema),
    mode: 'onChange',
    defaultValues: {
      businessType: undefined,
    },
  });

  const steps = [
    { title: 'Company Details', icon: Building2 },
    { title: 'Competitors', icon: Users2 },
    { title: 'Integration', icon: Key },
  ];

  const onNext = async (data: FullForm) => {
    if (step < 2) {
      const fields: (keyof FullForm)[] =
        step === 0
          ? ['companyDomain', 'productCatalog', 'businessType']
          : ['competitor1', 'competitor2', 'competitor3'];
      const valid = await trigger(fields);
      if (!valid) return;
      setStep(step + 1);
    } else {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        await fetch('/api/competitor-initial');
        router.refresh();
        router.push('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="mb-8">
          <h1 className="mb-2 text-center text-3xl font-bold">Welcome to Sagelytics</h1>
          <p className="text-center text-muted-foreground">Let&apos;s get your account set up</p>
        </div>

        <div className="mb-8">
          <Progress value={((step + 1) / steps.length) * 100} className="h-2" />
          <div className="mt-4 flex justify-between">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 ${i === step ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[step]?.title}</CardTitle>
            <CardDescription>
              {step === 0 && 'Enter your company information'}
              {step === 1 && 'Add your main competitors'}
              {step === 2 && 'Set up your integrations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onNext)} className="space-y-6">
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label>Business Type</Label>
                    <Controller
                      name="businessType"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                            <SelectItem value="saas">SaaS</SelectItem>
                            <SelectItem value="marketplace">Marketplace</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.businessType && (
                      <p className="mt-1 text-sm text-destructive">{errors.businessType.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Company Domain</Label>
                    <div className="flex">
                      <Input {...register('companyDomain')} placeholder="https://yourcompany.com" />
                      <Button type="button" variant="ghost" size="icon" className="ml-2">
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.companyDomain && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.companyDomain.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Product Catalog URL</Label>
                    <Input
                      {...register('productCatalog', {
                        required: 'Product catalog URL is required',
                      })}
                      placeholder="https://docs.google.com/spreadsheets/..."
                    />
                    {errors.productCatalog && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.productCatalog.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  {[1, 2, 3].map((num) => (
                    <div key={num}>
                      <Label>Top Competitor #{num}</Label>
                      <Input
                        {...register(`competitor${num}` as keyof FullForm)}
                        placeholder="https://competitor.com"
                      />
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>API Key (Optional)</Label>
                    <Input {...register('apiKey')} placeholder="Enter your API key" />
                  </div>
                  <div>
                    <Label>API Secret (Optional)</Label>
                    <Input {...register('apiSecret')} type="password" />
                    {errors.apiSecret && (
                      <p className="mt-1 text-sm text-destructive">{errors.apiSecret.message}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 0}
                >
                  Back
                </Button>
                <Button type="submit">{step === 2 ? 'Complete Setup' : 'Continue'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
-e 
```
-e 

# src/app/page.tsx
```
import { auth } from '~/server/auth';
import { HydrateClient } from '~/trpc/server';
import HomeClient from './home-client';
import { LandingPage } from '~/components/landing-page';

console.log('Before Home');

export default async function Home() {
  console.log('Home');
  const session = await auth();

  if (session?.user) {
    return (
      <HydrateClient>
        <HomeClient session={session} />
      </HydrateClient>
    );
  }

  return <LandingPage />;
}
-e 
```
-e 

# src/app/register/page.tsx
```
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '~/components/ui/card';
import Image from 'next/image';
export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration logic
    console.log('Registration attempt', { email, password, confirmPassword });
  };

  return (
    <div className="grid min-h-screen bg-gray-100 dark:bg-gray-900 lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <span className="text-2xl font-bold">Sagelytics</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Register for Sagelytics</CardTitle>
                <CardDescription>Create your account to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="mt-4 w-full">
                    Register
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-blue-600 hover:underline">
                    Login here
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/placeholder.svg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
-e 
```
-e 

# src/auth.ts
```
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Google from 'next-auth/providers/google';
import { db } from '~/server/db';
import { env } from '~/env';

export const { auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
-e 
```
-e 

# src/components/competitor-management.tsx
```
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { api } from '~/trpc/react';
import { Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function CompetitorManagement() {
  const [newCompetitor, setNewCompetitor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRediscovering, setIsRediscovering] = useState(false);
  const utils = api.useUtils();

  const { data, isLoading } = api.competitor.get.useQuery();
  
  const { mutate: addCompetitor } = api.competitor.add.useMutation({
    onSuccess: () => {
      setNewCompetitor('');
      setIsAdding(false);
      void utils.competitor.get.invalidate();
      toast.success('Competitor added');
    },
    onError: (error) => {
      setIsAdding(false);
      toast.error(error.message || 'Failed to add competitor');
    },
  });

  const { mutate: removeCompetitor } = api.competitor.remove.useMutation({
    onSuccess: () => {
      void utils.competitor.get.invalidate();
      toast.success('Competitor removed');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove competitor');
    },
  });

  const { mutate: rediscoverCompetitors } = api.competitor.rediscover.useMutation({
    onSuccess: (data) => {
      void utils.competitor.get.invalidate();
      setIsRediscovering(false);
      toast.success(`Discovered ${data.stats.totalDiscovered} competitors`);
    },
    onError: (error) => {
      setIsRediscovering(false);
      toast.error(error.message || 'Failed to discover competitors');
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetitor.trim()) {
      toast.error('Please enter a competitor URL');
      return;
    }

    try {
      // Basic URL validation
      let url = newCompetitor;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      new URL(url); // Will throw if invalid
      
      setIsAdding(true);
      addCompetitor({ url: newCompetitor.trim() });
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const handleRediscover = () => {
    setIsRediscovering(true);
    rediscoverCompetitors();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Management</CardTitle>
        <CardDescription>Add or remove competitors from your tracking list</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
          <Input
            value={newCompetitor}
            onChange={(e) => setNewCompetitor(e.target.value)}
            placeholder="https://competitor.com"
            className="flex-1"
            disabled={isAdding}
          />
          <Button type="submit" disabled={isAdding}>
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </Button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            data?.competitors?.map((competitor) => (
              <div
                key={competitor.domain}
                className="flex items-center justify-between rounded-md bg-muted p-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{competitor.domain}</span>
                  {competitor.domain.includes('.') && (
                    <a
                      href={`https://${competitor.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Visit site
                    </a>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    try {
                      removeCompetitor({ url: competitor.domain });
                    } catch {
                      toast.error('Failed to remove competitor');
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <Button 
          variant="outline" 
          className="mt-4 w-full" 
          onClick={handleRediscover}
          disabled={isRediscovering}
        >
          {isRediscovering ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Rediscover Competitors
        </Button>
      </CardContent>
    </Card>
  );
}
-e 
```
-e 

# src/components/dashboard/ai-insights.tsx
```
'use client';

import { ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

interface AIInsightsProps {
  insights: Array<{
    product: string;
    recommendation: string;
    message: string;
    reason: string;
  }>;
}

export function AIInsights({ insights }: AIInsightsProps) {
  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Insights</CardTitle>
          <CardDescription>Pricing recommendations based on market analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {insights?.map((insight) => (
              <li key={insight.product}>
                <div className="flex items-center">
                  {insight.recommendation === 'increase' ? (
                    <ArrowUp className="mr-2 text-green-500 dark:text-green-400" />
                  ) : insight.recommendation === 'decrease' ? (
                    <ArrowDown className="mr-2 text-red-500 dark:text-red-400" />
                  ) : (
                    <Zap className="mr-2 text-yellow-500 dark:text-yellow-400" />
                  )}
                  <span className="font-semibold">{insight.message}</span>
                </div>
                <p className="text-sm text-muted-foreground">{insight.reason}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
-e 
```
-e 

# src/components/dashboard/price-comparison.tsx
```
'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import type { ChartData } from '~/lib/types/dashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  annotationPlugin,
);

interface PriceComparisonProps {
  priceData: ChartData;
}

export function PriceComparison({ priceData }: PriceComparisonProps) {
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-200">Competitor Price Intelligence</h2>
      <Card>
        <CardHeader>
          <CardTitle>Real-time Price Comparison</CardTitle>
          <CardDescription>Your prices vs competitors across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Line
              data={priceData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  annotation: {
                    annotations: {
                      priceWarning: {
                        type: 'line',
                        yMin: 100,
                        yMax: 100,
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
-e 
```
-e 

# src/components/dashboard/pricing-strategy.tsx
```
'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import type { DashboardData } from '~/lib/types/dashboard';

ChartJS.register(CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement);

interface PricingStrategyProps {
  data: DashboardData;
}

export function PricingStrategy({ data }: PricingStrategyProps) {
  const chartData = {
    labels: data.priceData.labels,
    datasets: [
      {
        label: 'Your Price',
        data: data.priceData.datasets[0]?.data ?? [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      ...data.competitors.map((competitor, index) => ({
        label: competitor.domain,
        data: data.priceData.datasets[index + 1]?.data ?? [],
        backgroundColor: `rgba(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100}, 0.5)`,
        borderColor: `rgb(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100})`,
        borderWidth: 1,
      })),
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Pricing Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Strategy</CardTitle>
        <CardDescription>Adjust your pricing strategy based on market trends.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] overflow-hidden rounded-lg shadow-lg">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
-e 
```
-e 

# src/components/dashboard/product-matching.tsx
```
'use client';

import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import type { CompetitorBase } from '~/lib/types/dashboard';

interface ProductMatchingProps {
  competitors: CompetitorBase[];
}

export function ProductMatching({ competitors }: ProductMatchingProps) {
  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Product Matching Analysis</CardTitle>
          <CardDescription>Compare your products with competitor offerings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {competitors?.map((competitor) => {
              if (!competitor?.products?.length) return null;

              return (
                <div key={competitor.domain} className="space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    {competitor.domain}
                    <a
                      href={`https://${competitor.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Your Product</TableHead>
                        <TableHead>Match Score</TableHead>
                        <TableHead>Competitor Product</TableHead>
                        <TableHead>Price Difference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competitor.products.map((product) =>
                        product.matchedProducts.map((match, idx) => (
                          <TableRow key={`${product.url}-${match.url}-${idx}`}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <a
                                  href={product.url ?? ''}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {product.name}
                                </a>
                                <span className="text-sm text-muted-foreground">
                                  {product.price
                                    ? `${product.currency} ${product.price}`
                                    : 'Price not available'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={match.matchScore > 80 ? 'default' : 'secondary'}>
                                {match.matchScore}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <a
                                  href={match.url ?? ''}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {match.name}
                                </a>
                              </div>
                            </TableCell>
                            <TableCell>
                              {match.priceDiff !== null ? (
                                <span
                                  className={
                                    match.priceDiff > 0 ? 'text-green-600' : 'text-red-600'
                                  }
                                >
                                  {match.priceDiff > 0 ? '+' : ''}
                                  {match.priceDiff}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )),
                      )}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
-e 
```
-e 

# src/components/dashboard/sales-overview.tsx
```
'use client';

import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import type {
  DashboardData,
  DashboardCompetitor,
  CompetitorBase,
  PlatformData,
  PlatformMetrics,
} from '~/lib/types/dashboard';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface SalesOverviewProps {
  data: DashboardData;
}

type MetricKey = keyof PlatformMetrics;

function isDashboardCompetitor(competitor: CompetitorBase): competitor is DashboardCompetitor {
  return (
    'metadata' in competitor &&
    competitor.metadata !== null &&
    typeof competitor.metadata === 'object' &&
    'platforms' in competitor.metadata &&
    Array.isArray(competitor.metadata.platforms)
  );
}

export function SalesOverview({ data }: SalesOverviewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCompetitor, setSelectedCompetitor] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('sales');

  const handleMetricChange = (value: string) => {
    setSelectedMetric(value as MetricKey);
  };

  const platforms = [
    'all',
    ...new Set(
      data.competitors
        .filter(isDashboardCompetitor)
        .flatMap((c) => c.metadata.platforms.map((p: PlatformData) => p.platform)),
    ),
  ];

  const getMetricData = (competitor: CompetitorBase, platform: string): number => {
    if (!isDashboardCompetitor(competitor)) return 0;

    if (platform === 'all') {
      return competitor.metadata.platforms.reduce((acc: number, p: PlatformData) => {
        if (selectedMetric === 'priceRange') {
          return acc + (p.metrics.priceRange?.max ?? 0);
        }
        const value = p.metrics[selectedMetric];
        return acc + (typeof value === 'number' ? value : 0);
      }, 0);
    }

    const platformData = competitor.metadata.platforms.find(
      (p: PlatformData) => p.platform === platform,
    );
    if (selectedMetric === 'priceRange') {
      return platformData?.metrics.priceRange?.max ?? 0;
    }
    const value = platformData?.metrics[selectedMetric];
    return typeof value === 'number' ? value : 0;
  };

  const filteredCompetitors =
    selectedCompetitor === 'all'
      ? data.competitors
      : data.competitors.filter((c) => c.domain === selectedCompetitor);

  const chartData = {
    labels: filteredCompetitors.map((c) => c.domain),
    datasets: [
      {
        label:
          selectedMetric === 'sales'
            ? 'Sales Volume'
            : selectedMetric === 'reviews'
              ? 'Review Count'
              : selectedMetric === 'rating'
                ? 'Rating'
                : 'Price Range',
        data: filteredCompetitors.map((c) => getMetricData(c, selectedPlatform)),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} by Platform`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>Platform-specific performance metrics.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between space-x-4">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Competitor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitors</SelectItem>
              {data.competitors?.map((competitor) => (
                <SelectItem key={competitor.domain} value={competitor.domain}>
                  {competitor.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={selectedMetric} onValueChange={handleMetricChange} className="w-[400px]">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="rating">Rating</TabsTrigger>
              <TabsTrigger value="priceRange">Price</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="h-[300px] overflow-hidden rounded-lg shadow-lg">
          <Bar data={chartData} options={options} />
        </div>

        {selectedCompetitor !== 'all' && selectedPlatform !== 'all' && (
          <div className="mt-4 rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-semibold">Platform Details</h4>
            {data.competitors
              .filter(isDashboardCompetitor)
              .filter((c) => c.domain === selectedCompetitor)
              .map((competitor) => {
                const platformData = competitor.metadata.platforms.find(
                  (p: PlatformData) => p.platform === selectedPlatform,
                );

                return platformData ? (
                  <div key={platformData.platform} className="space-y-2">
                    <p>
                      Store URL:{' '}
                      <a
                        href={platformData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {platformData.url}
                      </a>
                    </p>
                    <p>Sales: {platformData.metrics.sales?.toLocaleString()}</p>
                    <p>Reviews: {platformData.metrics.reviews?.toLocaleString()}</p>
                    <p>Rating: {platformData.metrics.rating?.toFixed(1)} / 5.0</p>
                    <p>
                      Price Range: {platformData.metrics.priceRange?.min} -{' '}
                      {platformData.metrics.priceRange?.max}{' '}
                      {platformData.metrics.priceRange?.currency}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last Updated:{' '}
                      {new Date(platformData.metrics.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                ) : null;
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
-e 
```
-e 

# src/components/dashboard/stats-cards.tsx
```
'use client';

import {
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Users,
  LineChart,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import type { CompetitorBase } from '~/lib/types/dashboard';

interface StatsCardsProps {
  competitors: CompetitorBase[];
}

export function StatsCards({ competitors }: StatsCardsProps) {
  // Calculate average match score
  const avgMatchScore =
    competitors.length > 0
      ? Math.round(competitors.reduce((acc, comp) => acc + comp.matchScore, 0) / competitors.length)
      : 0;

  // Calculate total monitored products
  const totalProducts = competitors.reduce((acc, comp) => acc + comp.products.length, 0);

  // Calculate price positioning
  const pricePositioning =
    competitors.reduce((acc, comp) => {
      const avgCompetitorPrice =
        comp.products.reduce((sum, p) => sum + (p.price ?? 0), 0) / (comp.products.length ?? 1);
      const avgMatchedPrice =
        comp.products.reduce((sum, p) => {
          const matchedPrices = p.matchedProducts.reduce((mSum, m) => mSum + (m.priceDiff ?? 0), 0);
          return sum + matchedPrices / (p.matchedProducts.length ?? 1);
        }, 0) / (comp.products.length ?? 1);
      return acc + avgMatchedPrice / avgCompetitorPrice;
    }, 0) / (competitors.length ?? 1);

  // Calculate market coverage (percentage of competitors with complete data)
  const marketCoverage =
    competitors.length > 0
      ? Math.round(
          (competitors.filter((c) => c.dataGaps.length === 0).length / competitors.length) * 100,
        )
      : 0;

  // Get unique platforms
  const uniquePlatforms = new Set(
    competitors
      .filter(
        (c): c is CompetitorBase & { metadata?: { platforms?: { platform: string }[] } } =>
          'metadata' in c,
      )
      .flatMap((c) => c.metadata?.platforms?.map((p) => p.platform) ?? []),
  );

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Found Competitors</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Companies we&apos;ve found that sell similar products or services to yours</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitors.length}</div>
            <p className="text-xs text-muted-foreground">
              {competitors.length > 0
                ? `Found on ${uniquePlatforms.size} different websites`
                : 'Add your first competitor to get started'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>How complete our data is about your competitors. Higher is better!</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketCoverage}%</div>
            <p className="text-xs text-muted-foreground">
              {marketCoverage > 80
                ? 'We have great data about your market!'
                : 'Still gathering more info'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Your Prices vs Market</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>How your prices compare to similar products from competitors</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {pricePositioning > 1
                  ? 'Higher than'
                  : pricePositioning < 1
                    ? 'Lower than'
                    : 'Same as'}{' '}
                competitors
              </div>
              {pricePositioning !== 1 && (
                <span
                  className={`ml-2 ${pricePositioning > 1 ? 'text-red-500' : 'text-green-500'}`}
                >
                  {Math.abs((pricePositioning - 1) * 100).toFixed(1)}%
                  {pricePositioning > 1 ? (
                    <ArrowUpRight className="inline h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="inline h-4 w-4" />
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Looking at {totalProducts} similar products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Market Strength</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Overall score showing how well you&apos;re competing in your market</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMatchScore}/100</div>
            <p className="text-xs text-muted-foreground">
              {avgMatchScore >= 80
                ? "You're leading your market! ðŸŽ‰"
                : avgMatchScore >= 60
                  ? 'Strong performance!'
                  : avgMatchScore >= 40
                    ? 'Getting there - room to grow'
                    : "Let's work on improving this"}
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
-e 
```
-e 

# src/components/dynamic-dashboard.tsx
```
'use client';

import { api } from '~/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { type MetricComparison } from '~/lib/metrics-service';
import { cn } from '~/lib/utils';
import { Icons } from './icons';
import { Skeleton } from './ui/skeleton';

interface MetricValueProps {
  metric: string;
  comparison?: MetricComparison;
}

function DashboardSkeleton() {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-[120px]" />
            <Skeleton className="h-4 w-[80px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MetricIcon({ icon }: { icon: keyof typeof Icons }) {
  const IconComp = Icons[icon];
  return IconComp ? <IconComp className="h-4 w-4 text-muted-foreground" /> : null;
}

function formatValue(metric: string, value: number): string {
  const formatters: Record<string, (val: number) => string> = {
    revenue: (val) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
      }).format(val),
    inventory_value: (val) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
      }).format(val),
    repricing_actions: (val) => val.toString(),
    active_listings: (val) => val.toString(),
  };
  return formatters[metric]?.(value) ?? value.toString();
}

function MetricValue({ metric, comparison }: MetricValueProps) {
  const value = comparison?.current ?? 0;
  const trend = comparison?.trend ?? 0;

  return (
    <>
      <div className="text-2xl font-bold">{formatValue(metric, value)}</div>
      <p
        className={cn(
          'text-xs',
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground',
        )}
      >
        {trend > 0 ? '+' : ''}
        {trend.toFixed(1)}% from last period
      </p>
    </>
  );
}

function MetricCard({ metric }: { metric: { key: string; name: string; icon: string } }) {
  const { data: comparison, isLoading } = api.competitor.getComparisons.useQuery(
    { metric: metric.key },
    { enabled: !!metric.key },
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-8 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
        <MetricIcon icon={metric.icon} />
      </CardHeader>
      <CardContent>
        <MetricValue metric={metric.key} comparison={comparison ?? undefined} />
      </CardContent>
    </Card>
  );
}

export function DynamicDashboard() {
  const { data: metrics, isLoading } = api.competitor.getRelevantMetrics.useQuery();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics?.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
    </div>
  );
}
-e 
```
-e 

# src/components/icons.tsx
```
import { DollarSign, Package, Zap, ShoppingCart, type LucideIcon } from 'lucide-react';

export const Icons: Record<string, LucideIcon> = {
  DollarSign,
  Package,
  Zap,
  ShoppingCart,
};
-e 
```
-e 

# src/components/landing-page.tsx
```
import { Navigation } from '~/components/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import Link from 'next/link';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white dark:from-blue-900 dark:to-gray-900">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <header className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-bold text-blue-600 dark:text-blue-400">Sagelytics</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            AI-Powered Pricing Strategy Platform
          </p>
        </header>

        <main>
          <section className="mb-16">
            <h2 className="mb-8 text-center text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Stop guessing, start knowing
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Multi-platform Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Track prices across Amazon, Walmart, eBay, and Shopify in real-time.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>AI-Powered Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Get predictive margin optimization and competitor strategy analysis.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>LLM-Generated Strategies</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Receive automated strategy memos and natural language insights.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="text-center">
            <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">
              Ready to boost your margins by 15-40%?
            </h2>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </section>
        </main>

        <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
          Â© 2025 Sagelytics. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
-e 
```
-e 

# src/components/login-form.tsx
```
'use client';

import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'form'> & { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-sm text-muted-foreground">Enter your email below to login</p>
      </div>
      <form {...props} className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <a href="#" className="ml-auto text-sm hover:underline">
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" required />
        </div>
        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
      <div className="relative text-center text-sm">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">
          Or continue with
        </span>
      </div>
      <div className="grid gap-2">
        <Button type="button" variant="outline" className="w-full" onClick={() => signIn('google')}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="mr-2 h-4 w-4"
          >
            <path
              fill="#4285F4"
              d="M21.35 11.1h-9.18v2.84h5.23c-.23 1.27-.94 2.33-1.99 3.04v2.54h3.22c1.88-1.73 2.97-4.28 2.97-7.43s-1.08-5.7-2.97-7.43z"
            />
            <path
              fill="#34A853"
              d="M11.17 21.66c2.68 0 4.93-.89 6.57-2.41l-3.22-2.54c-.89.6-2.03.95-3.35.95-2.57 0-4.74-1.74-5.52-4.08H2.42v2.56c1.63 3.21 4.99 5.42 8.75 5.42z"
            />
            <path
              fill="#FBBC05"
              d="M5.65 13.07c-.2-.59-.32-1.22-.32-1.87s.12-1.28.32-1.87V7.77H2.42A9.993 9.993 0 0 0 2 11.2c0 1.64.39 3.2 1.18 4.43l3.47-2.56z"
            />
            <path
              fill="#EA4335"
              d="M11.17 5.29c1.45 0 2.75.5 3.77 1.48l2.82-2.82C15.09 2.32 13.03 1.2 11.17 1.2 7.41 1.2 4.05 3.41 2.42 7.2l3.47 2.56c.78-2.34 3-4.08 5.28-4.08z"
            />
          </svg>
          Continue with Google
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => signIn('github')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
            <path
              d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577
                0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73
                1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.304-5.466-1.337-5.466-5.93
                0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.522.105-3.176 0 0 1.005-.322 3.3 1.23a11.52 11.52 0 013 .405c1.02-.007 2.04-.093 3-.405
                2.28-1.552 3.285-1.23 3.285-1.23.645 1.654.24 2.874.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.435.375.81 1.114.81 2.244
                0 1.62-.015 2.924-.015 3.322 0 .315.21.69.825.57C20.565 21.795 24 17.303 24 12c0-6.627-5.373-12-12-12z"
              fill="currentColor"
            />
          </svg>
          Continue with GitHub
        </Button>
      </div>
      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
-e 
```
-e 

# src/components/navigation.tsx
```
import Link from 'next/link';
import { Button } from '~/components/ui/button';

export function Navigation() {
  return (
    <nav className="bg-white shadow dark:bg-gray-800">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-2xl font-bold text-gray-800 dark:text-white">
              Sagelytics
            </Link>
          </div>
          <div className="flex space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
-e 
```
-e 

# src/components/pricing-dashboard.tsx
```
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import { CompetitorManagement } from '~/components/competitor-management';
import { StatsCards } from '~/components/dashboard/stats-cards';
import { SalesOverview } from '~/components/dashboard/sales-overview';
import { PricingStrategy } from '~/components/dashboard/pricing-strategy';
import { AIInsights } from '~/components/dashboard/ai-insights';
import { PriceComparison } from '~/components/dashboard/price-comparison';
import { ProductMatching } from '~/components/dashboard/product-matching';
import type { DashboardData } from '~/lib/types/dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { RefreshCw, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

export default function PricingDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const { data: result, error, refetch } = api.competitor.get.useQuery<DashboardData>();
  const { mutate: rediscover, isPending: isRediscovering } = api.competitor.rediscover.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (session && !session.user.onboardingCompleted) {
      router.push('/onboarding');
    }
    if (error?.data?.code === 'NOT_FOUND') {
      router.push('/onboarding');
    }
  }, [status, session, error, router]);

  if (status === 'loading' || !result) return <div>Loading...</div>;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Market Watch</h1>
              <p className="mt-2 text-muted-foreground">
                Keep an eye on your competition and stay ahead
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {mounted && (
                <>
                  <Label htmlFor="dark-mode-toggle">Dark Mode</Label>
                  <Switch
                    id="dark-mode-toggle"
                    checked={theme === 'dark'}
                    onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  />
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => rediscover()} disabled={isRediscovering}>
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isRediscovering ? 'animate-spin' : ''}`}
                    />
                    {isRediscovering ? 'Looking for updates...' : 'Check for Updates'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Look for new competitors and price changes</p>
                </TooltipContent>
              </Tooltip>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>

          <StatsCards competitors={result.competitors} />

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Quick Overview</TabsTrigger>
              <TabsTrigger value="competitors">Who You&apos;re Up Against</TabsTrigger>
              <TabsTrigger value="pricing">Price Watch</TabsTrigger>
              <TabsTrigger value="insights">Smart Tips</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Sales Performance</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>See how your sales compare across different platforms</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>
                      How you&apos;re doing across different sales channels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SalesOverview data={result} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Price Trends</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Track how prices are changing over time</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Recent price changes in your market</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PriceComparison priceData={result.priceData} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="competitors" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Track Competitors</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add or remove competitors you want to keep an eye on</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Manage your competitor watchlist</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompetitorManagement />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Similar Products</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>See which competitor products match yours</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Products similar to yours</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductMatching competitors={result.competitors} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Pricing Tips</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Get suggestions on how to price your products</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Smart pricing recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PricingStrategy data={result} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Market Prices</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>See how prices are changing across your market</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Price changes and patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PriceComparison priceData={result.priceData} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>AI Suggestions</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Get smart recommendations based on market data</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CardDescription>Smart tips to help you stay competitive</CardDescription>
                </CardHeader>
                <CardContent>
                  <AIInsights insights={result.insights} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
-e 
```
-e 

# src/components/theme-provider.tsx
```
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

// "use client"
// import { ThemeProvider as NextThemesProvider } from "next-themes"
// import type { ThemeProviderProps } from "next-themes"

// export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
//   return <NextThemesProvider {...props}>{children}</NextThemesProvider>
// }
-e 
```
-e 

# src/components/ui/badge.tsx
```
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '~/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
-e 
```
-e 

# src/components/ui/button.tsx
```
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '~/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
-e 
```
-e 

# src/components/ui/card.tsx
```
import * as React from 'react';

import { cn } from '~/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
-e 
```
-e 

# src/components/ui/input.tsx
```
import * as React from 'react';

import { cn } from '~/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
-e 
```
-e 

# src/components/ui/label.tsx
```
'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '~/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
-e 
```
-e 

# src/components/ui/progress.tsx
```
'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '~/lib/utils';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
-e 
```
-e 

# src/components/ui/select.tsx
```
'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '~/lib/utils';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
-e 
```
-e 

# src/components/ui/skeleton.tsx
```
import React from 'react';
import { cn } from '~/lib/utils';

export function Skeleton(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse bg-gray-200', props.className)} {...props} />;
}
-e 
```
-e 

# src/components/ui/switch.tsx
```
'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '~/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
-e 
```
-e 

# src/components/ui/table.tsx
```
import * as React from 'react';

import { cn } from '~/lib/utils';

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
-e 
```
-e 

# src/components/ui/tabs.tsx
```
'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '~/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
-e 
```
-e 

# src/components/ui/tooltip.tsx
```
'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '~/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
-e 
```
-e 

# src/env.js
```
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET: process.env.NODE_ENV === 'production' ? z.string() : z.string().optional(),
    AUTH_GOOGLE_CLIENT_ID: z.string().min(1),
    AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    REDIS_URL: z.string().min(1).optional(),
    MICROSERVICE_HOST: z.string().min(1),
    MICROSERVICE_PORT: z.string().min(1),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid eanv vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_CLIENT_ID: process.env.AUTH_GOOGLE_CLIENT_ID,
    AUTH_GOOGLE_CLIENT_SECRET: process.env.AUTH_GOOGLE_CLIENT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    MICROSERVICE_HOST: process.env.MICROSERVICE_HOST,
    MICROSERVICE_PORT: process.env.MICROSERVICE_PORT,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
-e 
```
-e 

# src/lib/metrics-service.ts
```
import { eq } from 'drizzle-orm';
import { db } from '~/server/db';
import { userOnboarding } from '~/server/db/schema';

export class MetricsService {
  private readonly businessRules: Record<string, string[]> = {
    ecommerce: ['revenue', 'inventory_value', 'repricing_actions'],
    saas: ['mrr', 'churn_rate', 'active_users'],
    marketplace: ['gmv', 'commission_rate', 'active_listings'],
  };

  async getRelevantMetrics(userId: string) {
    const onboarding = await db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, userId),
    });

    if (!onboarding) return [];

    const availableMetrics = this.businessRules[onboarding.businessType] ?? [];
    const enabledMetrics = availableMetrics.filter(
      (metric) => onboarding.metricConfig?.[metric] !== false,
    );

    return this.enrichMetrics(enabledMetrics);
  }

  private enrichMetrics(metrics: string[]) {
    const metricDefinitions = {
      revenue: { name: 'Revenue', icon: 'DollarSign' },
      inventory_value: { name: 'Inventory Value', icon: 'Package' },
      repricing_actions: { name: 'Repricing Actions', icon: 'Zap' },
      active_listings: { name: 'Active Listings', icon: 'ShoppingCart' },
    };

    return metrics.map((metric) => ({
      key: metric,
      ...metricDefinitions[metric as keyof typeof metricDefinitions],
    }));
  }

  async calculateMetricComparison(metric: string, userId: string) {
    const onboarding = await db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, userId),
    });

    if (!onboarding) return null;

    // Example implementation - replace with actual logic
    const calculations: Record<string, () => Promise<MetricComparison>> = {
      revenue: async () => ({
        current: 100000,
        previous: 95000,
        trend: 5.26,
        competitors: {
          average: 98000,
          highest: 120000,
          lowest: 80000,
        },
      }),
      inventory_value: async () => ({
        current: 50000,
        previous: 48000,
        trend: 4.17,
        competitors: {
          average: 55000,
          highest: 70000,
          lowest: 40000,
        },
      }),
      // Add other metric calculations
    };

    const calculator = calculations[metric];
    if (!calculator) return null;

    return calculator();
  }
}

export interface MetricComparison {
  current: number;
  previous: number;
  trend: number;
  competitors: {
    average: number;
    highest: number;
    lowest: number;
  };
}
-e 
```
-e 

# src/lib/services/microservice-client.ts
```
import { type ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import type { DiscoveryResult } from '../../types/competitor';
import type { WebsiteContent } from '../../types/website';
import type { CompetitorMetadata } from '~/server/db/schema';
import type { BusinessContext } from '../../microservices/src/competitor/interfaces/business-context.interface';

export class MicroserviceClient {
  private static instance: MicroserviceClient;
  private client: ClientProxy;

  private constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: process.env.MICROSERVICE_HOST ?? 'localhost',
        port: parseInt(process.env.MICROSERVICE_PORT ?? '3001'),
      },
    });
  }

  public static getInstance(): MicroserviceClient {
    if (!MicroserviceClient.instance) {
      MicroserviceClient.instance = new MicroserviceClient();
    }
    return MicroserviceClient.instance;
  }

  async discoverCompetitors(data: {
    domain: string;
    userId: string;
    businessType: string;
    knownCompetitors?: string[];
    productCatalogUrl: string;
  }): Promise<DiscoveryResult> {
    const result = await this.client
      .send<DiscoveryResult>('discover_competitors', data)
      .toPromise();

    if (!result) throw new Error('Failed to discover competitors');
    return result;
  }

  async analyzeCompetitor(data: { 
    competitorDomain: string; 
    businessContext: BusinessContext;
    serpMetadata?: {
      title?: string;
      snippet?: string;
      rating?: number;
      reviewCount?: number;
      priceRange?: {
        min: number;
        max: number;
        currency: string;
      };
    };
  }): Promise<Partial<CompetitorMetadata>> {
    const result = await this.client
      .send<Partial<CompetitorMetadata>>('analyze_competitor', data)
      .toPromise();

    if (!result) throw new Error('Failed to analyze competitor');
    return result;
  }

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    const result = await this.client
      .send<WebsiteContent>('discover_website_content', domain)
      .toPromise();

    if (!result) throw new Error('Failed to discover website content');
    return result;
  }
}
-e 
```
-e 

# src/lib/types/dashboard.ts
```
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export type PlatformMetrics = {
  sales?: number;
  reviews?: number;
  rating?: number;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  lastUpdated: string;
};

export type PlatformData = {
  platform: string;
  url: string;
  metrics: PlatformMetrics;
};

export type ProductMatch = {
  name: string;
  url: string;
  matchScore: number;
  priceDiff: number | null;
};

export type Product = {
  name: string;
  url: string;
  price: number | null;
  currency: string;
  matchedProducts: ProductMatch[];
  lastUpdated: string;
};

export type CompetitorBase = {
  domain: string;
  matchScore: number;
  matchReasons: string[];
  suggestedApproach: string;
  dataGaps: string[];
  products: Product[];
};

export type DashboardCompetitor = CompetitorBase & {
  metadata: {
    platforms: PlatformData[];
    products: Product[];
  };
};

export type DashboardData = {
  competitors: CompetitorBase[];
  insights: {
    product: string;
    recommendation: string;
    message: string;
    reason: string;
  }[];
  priceData: ChartData;
};
-e 
```
-e 

# src/lib/types/location.ts
```
export interface GeoLocation {
  address: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  city: string;
  postalCode?: string;
  formattedAddress: string;
}

export interface LocationContext {
  location: GeoLocation;
  radius: number; // in kilometers
  timezone?: string;
}
-e 
```
-e 

# src/lib/utils.ts
```
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
-e 
```
-e 

# src/lib/website-extraction-utils.ts
```
import * as cheerio from 'cheerio';

export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '')
    .replace(/[^\w\s.,!?-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function prepareTextForAnalysis(texts: string[], maxTextLength: number): string {
  const combinedText = texts.join('\n\n');
  if (combinedText.length <= maxTextLength) return combinedText;
  const halfLength = Math.floor(maxTextLength / 2);
  return (
    combinedText.slice(0, halfLength) +
    '\n...[content truncated]...\n' +
    combinedText.slice(-halfLength)
  );
}

export function extractCleanText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, meta, link').remove();
  const mainContent = $("main, article, #content, .content, [role='main']").text();
  return mainContent.trim() ? cleanText(mainContent) : cleanText($('body').text());
}

export function cleanText(text: string): string {
  return text
    .replace(/[\r\n]+/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

export function formatValue(
  value: string,
  format: { type: 'price' | 'text' | 'url' | 'date'; currency?: string; dateFormat?: string },
): string | number | null {
  switch (format.type) {
    case 'price': {
      const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, '');
      const number = parseFloat(cleaned);
      return isNaN(number) ? null : number;
    }
    case 'date':
      return new Date(value).toISOString();
    case 'url':
      try {
        return new URL(value).toString();
      } catch {
        return null;
      }
    default:
      return value;
  }
}

export function transformValue(value: string, transform: string): string {
  switch (transform) {
    case 'lowercase':
      return value.toLowerCase();
    case 'uppercase':
      return value.toUpperCase();
    case 'trim':
      return value.trim();
    default:
      return value;
  }
}
-e 
```
-e 

# src/microservices/.env.example
```
NODE_ENV=development
PORT=3000
SPIDER_API_KEY=your_spider_api_key_here 
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
VALUESERP_API_KEY=your_valueserp_api_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sagelytics
REDIS_URL=redis://localhost:6379
MICROSERVICE_HOST=localhost
MICROSERVICE_PORT=3001-e 
```
-e 

# src/microservices/.gitignore
```
# compiled output
/dist
/node_modules
/build

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS
.DS_Store

# Tests
/coverage
/.nyc_output

# IDEs and editors
/.idea
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# IDE - VSCode
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# temp directory
.temp
.tmp

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json
-e 
```
-e 

# src/microservices/README.md
```
# Sagelytics Microservices

Intelligent competitor discovery and analysis microservices built with NestJS. This service provides deep insights into competitors through SERP analysis, smart web crawling, and AI-powered content analysis.

## Features

### Competitor Discovery
- SERP-based competitor identification
- Smart depth-based web crawling (up to 3 levels)
- Business type-specific search strategies:
  - E-commerce: Product and shopping analysis
  - SaaS: Feature and pricing comparison
  - Local Business: Location-based competitor mapping
  - Marketplace: Multi-vendor analysis

### Smart Crawling
- Respects robots.txt and crawl delays
- LLM-powered URL prioritization
- Intelligent sitemap parsing
- Structured data extraction
- Product and service identification

### Content Analysis
- AI-powered competitor insights
- Product matching and comparison
- Price analysis and monitoring
- Business strategy recommendations
- Market positioning analysis

## Tech Stack

- NestJS for microservices architecture
- TypeScript for type safety
- GROQ/Gemini for AI analysis
- Spider API for web crawling
- ValueSERP for search results
- Redis for caching and message queues

## Getting Started

### Prerequisites
```bash
# Install pnpm if not already installed
npm install -g pnpm
```

### Installation
```bash
# Install dependencies
pnpm install
```

### Configuration
Create a `.env` file with the following:
```env
NODE_ENV=development
PORT=3000
SPIDER_API_KEY=your_spider_api_key
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
VALUESERP_API_KEY=your_valueserp_api_key
DATABASE_URL=your_database_url
REDIS_URL=redis://localhost:6379
```

### Running the Service

```bash
# Development
pnpm run start:dev

# Production
pnpm run start:prod
```

### Running Tests

```bash
# Unit tests
pnpm run test

# Integration tests (requires API keys)
pnpm test src/test/integration/*.spec.ts

# Individual service tests
pnpm test src/test/integration/website-discovery.spec.ts
pnpm test src/test/integration/competitor-discovery.spec.ts
pnpm test src/test/integration/smart-crawler.spec.ts
```

## API Endpoints

### Competitor Discovery
```typescript
POST /competitors/discover
{
  domain: string;
  userId: string;
  businessType: string;
  knownCompetitors?: string[];
  productCatalogUrl: string;
}
```

### Website Analysis
```typescript
POST /website/discover
{
  domain: string;
}
```

### Smart Crawling
```typescript
POST /website/crawl
{
  domain: string;
  maxDepth?: number;
  respectRobots?: boolean;
}
```

## Development

### Project Structure
```
src/
â”œâ”€â”€ competitor/         # Competitor discovery and analysis
â”œâ”€â”€ website/           # Website discovery and crawling
â”œâ”€â”€ shared/           # Shared utilities and services
â”œâ”€â”€ interfaces/       # TypeScript interfaces
â””â”€â”€ test/
    â””â”€â”€ integration/  # Integration tests
```

### Adding New Features
1. Create feature module: `nest g module feature-name`
2. Add service: `nest g service feature-name`
3. Add controller: `nest g controller feature-name`
4. Add integration tests in `test/integration/`

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

## License

This project is licensed under a Docker-like license.
-e 
```
-e 

# src/microservices/docker-compose.yml
```
version: '3.8'

services:
  api-gateway:
    build:
      context: .
      dockerfile: ./docker/gateway.Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sagelytics
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
      website-service:
        condition: service_started
      competitor-service:
        condition: service_started
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  website-service:
    build:
      context: .
      dockerfile: ./docker/service.Dockerfile
      args:
        - SERVICE=website
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sagelytics
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy

  competitor-service:
    build:
      context: .
      dockerfile: ./docker/service.Dockerfile
      args:
        - SERVICE=competitor
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sagelytics
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=sagelytics
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data: -e 
```
-e 

# src/microservices/docker/gateway.Dockerfile
```
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Remove development dependencies
RUN pnpm prune --prod

EXPOSE 3000
CMD ["pnpm", "start:prod"] -e 
```
-e 

# src/microservices/docker/service.Dockerfile
```
FROM node:20-alpine

WORKDIR /app

ARG SERVICE
ENV SERVICE_NAME=$SERVICE

# Install dependencies first for better caching
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Remove development dependencies
RUN pnpm prune --prod

# Run the microservice
CMD ["sh", "-c", "node dist/src/$SERVICE_NAME/$SERVICE_NAME.service.js"] -e 
```
-e 

# src/microservices/eslint.config.mjs
```
// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // '@typescript-eslint/no-unsafe-argument': 'warn',
      // '@typescript-eslint/no-unsafe-assignment': 'warn',
      // '@typescript-eslint/no-unsafe-call': 'off',
      // '@typescript-eslint/no-unsafe-return': 'off',
      // '@typescript-eslint/no-unsafe-member-access': 'warn',
      // '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      // '@typescript-eslint/no-base-to-string': 'warn',
      // '@typescript-eslint/no-require-imports': 'warn',
      // '@typescript-eslint/consistent-generic-constructors': 'warn',
      // '@typescript-eslint/restrict-template-expressions': 'warn',
    },
  },
);-e 
```
-e 

# src/microservices/nest-cli.json
```
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
-e 
```
-e 

# src/microservices/package.json
```
{
  "name": "sagelytics-microservices",
  "version": "0.0.1",
  "description": "Sagelytics microservices",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@langchain/core": "^0.3.40",
    "@langchain/google-genai": "^0.1.8",
    "@langchain/groq": "^0.0.1",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.1",
    "@nestjs/microservices": "^11.0.9",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/platform-socket.io": "^11.0.9",
    "@spider-cloud/spider-client": "^0.1.26",
    "@t3-oss/env-core": "^0.9.2",
    "@types/cheerio": "^0.22.35",
    "cheerio": "^1.0.0",
    "drizzle-orm": "^0.29.5",
    "fast-xml-parser": "^4.3.4",
    "reflect-metadata": "^0.2.2",
    "robots-parser": "^3.0.1",
    "rxjs": "^7.8.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@eslint/js": "^9.18.0",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@swc/cli": "^0.6.0",
    "@swc/core": "^1.10.7",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/supertest": "^6.0.2",
    "dotenv": "^16.4.7",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
    "globals": "^15.14.0",
    "jest": "^29.7.0",
    "prettier": "^3.4.2",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.20.0"
  },
  "jest": {
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@shared/(.*)$": "<rootDir>/shared/$1"
    },
    "moduleDirectories": [
      "node_modules",
      "src"
    ],
    "setupFilesAfterEnv": [
      "<rootDir>/test/jest.setup.ts"
    ],
    "testTimeout": 30000
  }
}
-e 
```
-e 

# src/microservices/pnpm-lock.yaml
```
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      '@langchain/core':
        specifier: ^0.3.40
        version: 0.3.40(openai@4.84.0(zod@3.24.2))
      '@langchain/google-genai':
        specifier: ^0.1.8
        version: 0.1.8(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))(zod@3.24.2)
      '@langchain/groq':
        specifier: ^0.0.1
        version: 0.0.1(openai@4.84.0(zod@3.24.2))
      '@nestjs/common':
        specifier: ^11.0.1
        version: 11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/config':
        specifier: ^4.0.0
        version: 4.0.0(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(rxjs@7.8.1)
      '@nestjs/core':
        specifier: ^11.0.1
        version: 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/microservices':
        specifier: ^11.0.9
        version: 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/platform-express':
        specifier: ^11.0.1
        version: 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)
      '@nestjs/platform-socket.io':
        specifier: ^11.0.9
        version: 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/websockets@11.0.9)(rxjs@7.8.1)
      '@spider-cloud/spider-client':
        specifier: ^0.1.26
        version: 0.1.26
      '@t3-oss/env-core':
        specifier: ^0.9.2
        version: 0.9.2(typescript@5.7.3)(zod@3.24.2)
      '@types/cheerio':
        specifier: ^0.22.35
        version: 0.22.35
      cheerio:
        specifier: ^1.0.0
        version: 1.0.0
      drizzle-orm:
        specifier: ^0.29.5
        version: 0.29.5
      fast-xml-parser:
        specifier: ^4.3.4
        version: 4.5.1
      reflect-metadata:
        specifier: ^0.2.2
        version: 0.2.2
      robots-parser:
        specifier: ^3.0.1
        version: 3.0.1
      rxjs:
        specifier: ^7.8.1
        version: 7.8.1
      zod:
        specifier: ^3.24.2
        version: 3.24.2
    devDependencies:
      '@eslint/eslintrc':
        specifier: ^3.2.0
        version: 3.2.0
      '@eslint/js':
        specifier: ^9.18.0
        version: 9.20.0
      '@nestjs/cli':
        specifier: ^11.0.0
        version: 11.0.2(@swc/cli@0.6.0(@swc/core@1.10.16)(chokidar@4.0.3))(@swc/core@1.10.16)(@types/node@20.17.17)
      '@nestjs/schematics':
        specifier: ^11.0.0
        version: 11.0.0(chokidar@4.0.3)(typescript@5.7.3)
      '@nestjs/testing':
        specifier: ^11.0.1
        version: 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/platform-express@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9))
      '@swc/cli':
        specifier: ^0.6.0
        version: 0.6.0(@swc/core@1.10.16)(chokidar@4.0.3)
      '@swc/core':
        specifier: ^1.10.7
        version: 1.10.16
      '@types/express':
        specifier: ^4.17.17
        version: 4.17.21
      '@types/jest':
        specifier: ^29.5.2
        version: 29.5.14
      '@types/node':
        specifier: ^20.3.1
        version: 20.17.17
      '@types/supertest':
        specifier: ^6.0.2
        version: 6.0.2
      dotenv:
        specifier: ^16.4.7
        version: 16.4.7
      eslint:
        specifier: ^9.18.0
        version: 9.20.1
      eslint-config-prettier:
        specifier: ^10.0.1
        version: 10.0.1(eslint@9.20.1)
      eslint-plugin-prettier:
        specifier: ^5.2.2
        version: 5.2.3(@types/eslint@9.6.1)(eslint-config-prettier@10.0.1(eslint@9.20.1))(eslint@9.20.1)(prettier@3.5.0)
      globals:
        specifier: ^15.14.0
        version: 15.15.0
      jest:
        specifier: ^29.7.0
        version: 29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))
      prettier:
        specifier: ^3.4.2
        version: 3.5.0
      source-map-support:
        specifier: ^0.5.21
        version: 0.5.21
      supertest:
        specifier: ^7.0.0
        version: 7.0.0
      ts-jest:
        specifier: ^29.2.5
        version: 29.2.5(@babel/core@7.26.8)(@jest/transform@29.7.0)(@jest/types@29.6.3)(babel-jest@29.7.0(@babel/core@7.26.8))(jest@29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3)))(typescript@5.7.3)
      ts-loader:
        specifier: ^9.5.2
        version: 9.5.2(typescript@5.7.3)(webpack@5.97.1(@swc/core@1.10.16))
      ts-node:
        specifier: ^10.9.2
        version: 10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3)
      tsconfig-paths:
        specifier: ^4.2.0
        version: 4.2.0
      typescript:
        specifier: ^5.7.3
        version: 5.7.3
      typescript-eslint:
        specifier: ^8.20.0
        version: 8.24.0(eslint@9.20.1)(typescript@5.7.3)

packages:

  '@ampproject/remapping@2.3.0':
    resolution: {integrity: sha512-30iZtAPgz+LTIYoeivqYo853f02jBYSd5uGnGpkFV0M3xOt9aN73erkgYAmZU43x4VfqcnLxW9Kpg3R5LC4YYw==}
    engines: {node: '>=6.0.0'}

  '@angular-devkit/core@19.0.1':
    resolution: {integrity: sha512-oXIAV3hXqUW3Pmm95pvEmb+24n1cKQG62FzhQSjOIrMeHiCbGLNuc8zHosIi2oMrcCJJxR6KzWjThvbuzDwWlw==}
    engines: {node: ^18.19.1 || ^20.11.1 || >=22.0.0, npm: ^6.11.0 || ^7.5.6 || >=8.0.0, yarn: '>= 1.13.0'}
    peerDependencies:
      chokidar: ^4.0.0
    peerDependenciesMeta:
      chokidar:
        optional: true

  '@angular-devkit/core@19.1.3':
    resolution: {integrity: sha512-of/TKfJ/vL+/qvr4PbDTtqbFJGFHPfu6bEJrIZsLMYA+Mej8SyTx3kDm4LLnKQBtWVYDqkrxvcpOb4+NmHNLfA==}
    engines: {node: ^18.19.1 || ^20.11.1 || >=22.0.0, npm: ^6.11.0 || ^7.5.6 || >=8.0.0, yarn: '>= 1.13.0'}
    peerDependencies:
      chokidar: ^4.0.0
    peerDependenciesMeta:
      chokidar:
        optional: true

  '@angular-devkit/schematics-cli@19.1.3':
    resolution: {integrity: sha512-levMPch+Mni/cEVd/b9RUzasxWqlafBVjgrofbaSlxgZmr4pRJ/tihzrNnygNUaXoBqhTtXU5aFxTGbJhS35eA==}
    engines: {node: ^18.19.1 || ^20.11.1 || >=22.0.0, npm: ^6.11.0 || ^7.5.6 || >=8.0.0, yarn: '>= 1.13.0'}
    hasBin: true

  '@angular-devkit/schematics@19.0.1':
    resolution: {integrity: sha512-N9dV8WpNRULykNj8fSxQrta85gPKxb315J3xugLS2uwiFWhz7wo5EY1YeYhoVKoVcNB2ng9imJgC5aO52AHZwg==}
    engines: {node: ^18.19.1 || ^20.11.1 || >=22.0.0, npm: ^6.11.0 || ^7.5.6 || >=8.0.0, yarn: '>= 1.13.0'}

  '@angular-devkit/schematics@19.1.3':
    resolution: {integrity: sha512-DfN45eJQtfXXeQwjb7vDqSJ+8e6BW3rXUB2i6IC2CbOYrLWhMBgfv3/uTm++IbCFW2zX3Yk3yqq3d4yua2no7w==}
    engines: {node: ^18.19.1 || ^20.11.1 || >=22.0.0, npm: ^6.11.0 || ^7.5.6 || >=8.0.0, yarn: '>= 1.13.0'}

  '@babel/code-frame@7.26.2':
    resolution: {integrity: sha512-RJlIHRueQgwWitWgF8OdFYGZX328Ax5BCemNGlqHfplnRT9ESi8JkFlvaVYbS+UubVY6dpv87Fs2u5M29iNFVQ==}
    engines: {node: '>=6.9.0'}

  '@babel/compat-data@7.26.8':
    resolution: {integrity: sha512-oH5UPLMWR3L2wEFLnFJ1TZXqHufiTKAiLfqw5zkhS4dKXLJ10yVztfil/twG8EDTA4F/tvVNw9nOl4ZMslB8rQ==}
    engines: {node: '>=6.9.0'}

  '@babel/core@7.26.8':
    resolution: {integrity: sha512-l+lkXCHS6tQEc5oUpK28xBOZ6+HwaH7YwoYQbLFiYb4nS2/l1tKnZEtEWkD0GuiYdvArf9qBS0XlQGXzPMsNqQ==}
    engines: {node: '>=6.9.0'}

  '@babel/generator@7.26.8':
    resolution: {integrity: sha512-ef383X5++iZHWAXX0SXQR6ZyQhw/0KtTkrTz61WXRhFM6dhpHulO/RJz79L8S6ugZHJkOOkUrUdxgdF2YiPFnA==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-compilation-targets@7.26.5':
    resolution: {integrity: sha512-IXuyn5EkouFJscIDuFF5EsiSolseme1s0CZB+QxVugqJLYmKdxI1VfIBOst0SUu4rnk2Z7kqTwmoO1lp3HIfnA==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-module-imports@7.25.9':
    resolution: {integrity: sha512-tnUA4RsrmflIM6W6RFTLFSXITtl0wKjgpnLgXyowocVPrbYrLUXSBXDgTs8BlbmIzIdlBySRQjINYs2BAkiLtw==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-module-transforms@7.26.0':
    resolution: {integrity: sha512-xO+xu6B5K2czEnQye6BHA7DolFFmS3LB7stHZFaOLb1pAwO1HWLS8fXA+eh0A2yIvltPVmx3eNNDBJA2SLHXFw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0

  '@babel/helper-plugin-utils@7.26.5':
    resolution: {integrity: sha512-RS+jZcRdZdRFzMyr+wcsaqOmld1/EqTghfaBGQQd/WnRdzdlvSZ//kF7U8VQTxf1ynZ4cjUcYgjVGx13ewNPMg==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-string-parser@7.25.9':
    resolution: {integrity: sha512-4A/SCr/2KLd5jrtOMFzaKjVtAei3+2r/NChoBNoZ3EyP/+GlhoaEGoWOZUmFmoITP7zOJyHIMm+DYRd8o3PvHA==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-validator-identifier@7.25.9':
    resolution: {integrity: sha512-Ed61U6XJc3CVRfkERJWDz4dJwKe7iLmmJsbOGu9wSloNSFttHV0I8g6UAgb7qnK5ly5bGLPd4oXZlxCdANBOWQ==}
    engines: {node: '>=6.9.0'}

  '@babel/helper-validator-option@7.25.9':
    resolution: {integrity: sha512-e/zv1co8pp55dNdEcCynfj9X7nyUKUXoUEwfXqaZt0omVOmDe9oOTdKStH4GmAw6zxMFs50ZayuMfHDKlO7Tfw==}
    engines: {node: '>=6.9.0'}

  '@babel/helpers@7.26.7':
    resolution: {integrity: sha512-8NHiL98vsi0mbPQmYAGWwfcFaOy4j2HY49fXJCfuDcdE7fMIsH9a7GdaeXpIBsbT7307WU8KCMp5pUVDNL4f9A==}
    engines: {node: '>=6.9.0'}

  '@babel/parser@7.26.8':
    resolution: {integrity: sha512-TZIQ25pkSoaKEYYaHbbxkfL36GNsQ6iFiBbeuzAkLnXayKR1yP1zFe+NxuZWWsUyvt8icPU9CCq0sgWGXR1GEw==}
    engines: {node: '>=6.0.0'}
    hasBin: true

  '@babel/plugin-syntax-async-generators@7.8.4':
    resolution: {integrity: sha512-tycmZxkGfZaxhMRbXlPXuVFpdWlXpir2W4AMhSJgRKzk/eDlIXOhb2LHWoLpDF7TEHylV5zNhykX6KAgHJmTNw==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-bigint@7.8.3':
    resolution: {integrity: sha512-wnTnFlG+YxQm3vDxpGE57Pj0srRU4sHE/mDkt1qv2YJJSeUAec2ma4WLUnUPeKjyrfntVwe/N6dCXpU+zL3Npg==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-class-properties@7.12.13':
    resolution: {integrity: sha512-fm4idjKla0YahUNgFNLCB0qySdsoPiZP3iQE3rky0mBUtMZ23yDJ9SJdg6dXTSDnulOVqiF3Hgr9nbXvXTQZYA==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-class-static-block@7.14.5':
    resolution: {integrity: sha512-b+YyPmr6ldyNnM6sqYeMWE+bgJcJpO6yS4QD7ymxgH34GBPNDM/THBh8iunyvKIZztiwLH4CJZ0RxTk9emgpjw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-import-attributes@7.26.0':
    resolution: {integrity: sha512-e2dttdsJ1ZTpi3B9UYGLw41hifAubg19AtCu/2I/F1QNVclOBr1dYpTdmdyZ84Xiz43BS/tCUkMAZNLv12Pi+A==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-import-meta@7.10.4':
    resolution: {integrity: sha512-Yqfm+XDx0+Prh3VSeEQCPU81yC+JWZ2pDPFSS4ZdpfZhp4MkFMaDC1UqseovEKwSUpnIL7+vK+Clp7bfh0iD7g==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-json-strings@7.8.3':
    resolution: {integrity: sha512-lY6kdGpWHvjoe2vk4WrAapEuBR69EMxZl+RoGRhrFGNYVK8mOPAW8VfbT/ZgrFbXlDNiiaxQnAtgVCZ6jv30EA==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-jsx@7.25.9':
    resolution: {integrity: sha512-ld6oezHQMZsZfp6pWtbjaNDF2tiiCYYDqQszHt5VV437lewP9aSi2Of99CK0D0XB21k7FLgnLcmQKyKzynfeAA==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-logical-assignment-operators@7.10.4':
    resolution: {integrity: sha512-d8waShlpFDinQ5MtvGU9xDAOzKH47+FFoney2baFIoMr952hKOLp1HR7VszoZvOsV/4+RRszNY7D17ba0te0ig==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-nullish-coalescing-operator@7.8.3':
    resolution: {integrity: sha512-aSff4zPII1u2QD7y+F8oDsz19ew4IGEJg9SVW+bqwpwtfFleiQDMdzA/R+UlWDzfnHFCxxleFT0PMIrR36XLNQ==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-numeric-separator@7.10.4':
    resolution: {integrity: sha512-9H6YdfkcK/uOnY/K7/aA2xpzaAgkQn37yzWUMRK7OaPOqOpGS1+n0H5hxT9AUw9EsSjPW8SVyMJwYRtWs3X3ug==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-object-rest-spread@7.8.3':
    resolution: {integrity: sha512-XoqMijGZb9y3y2XskN+P1wUGiVwWZ5JmoDRwx5+3GmEplNyVM2s2Dg8ILFQm8rWM48orGy5YpI5Bl8U1y7ydlA==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-optional-catch-binding@7.8.3':
    resolution: {integrity: sha512-6VPD0Pc1lpTqw0aKoeRTMiB+kWhAoT24PA+ksWSBrFtl5SIRVpZlwN3NNPQjehA2E/91FV3RjLWoVTglWcSV3Q==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-optional-chaining@7.8.3':
    resolution: {integrity: sha512-KoK9ErH1MBlCPxV0VANkXW2/dw4vlbGDrFgz8bmUsBGYkFRcbRwMh6cIJubdPrkxRwuGdtCk0v/wPTKbQgBjkg==}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-private-property-in-object@7.14.5':
    resolution: {integrity: sha512-0wVnp9dxJ72ZUJDV27ZfbSj6iHLoytYZmh3rFcxNnvsJF3ktkzLDZPy/mA17HGsaQT3/DQsWYX1f1QGWkCoVUg==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-top-level-await@7.14.5':
    resolution: {integrity: sha512-hx++upLv5U1rgYfwe1xBQUhRmU41NEvpUvrp8jkrSCdvGSnM5/qdRMtylJ6PG5OFkBaHkbTAKTnd3/YyESRHFw==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/plugin-syntax-typescript@7.25.9':
    resolution: {integrity: sha512-hjMgRy5hb8uJJjUcdWunWVcoi9bGpJp8p5Ol1229PoN6aytsLwNMgmdftO23wnCLMfVmTwZDWMPNq/D1SY60JQ==}
    engines: {node: '>=6.9.0'}
    peerDependencies:
      '@babel/core': ^7.0.0-0

  '@babel/template@7.26.8':
    resolution: {integrity: sha512-iNKaX3ZebKIsCvJ+0jd6embf+Aulaa3vNBqZ41kM7iTWjx5qzWKXGHiJUW3+nTpQ18SG11hdF8OAzKrpXkb96Q==}
    engines: {node: '>=6.9.0'}

  '@babel/traverse@7.26.8':
    resolution: {integrity: sha512-nic9tRkjYH0oB2dzr/JoGIm+4Q6SuYeLEiIiZDwBscRMYFJ+tMAz98fuel9ZnbXViA2I0HVSSRRK8DW5fjXStA==}
    engines: {node: '>=6.9.0'}

  '@babel/types@7.26.8':
    resolution: {integrity: sha512-eUuWapzEGWFEpHFxgEaBG8e3n6S8L3MSu0oda755rOfabWPnh0Our1AozNFVUxGFIhbKgd1ksprsoDGMinTOTA==}
    engines: {node: '>=6.9.0'}

  '@bcoe/v8-coverage@0.2.3':
    resolution: {integrity: sha512-0hYQ8SB4Db5zvZB4axdMHGwEaQjkZzFjQiN9LVYvIFB2nSUHW9tYpxWriPrWDASIxiaXax83REcLxuSdnGPZtw==}

  '@cfworker/json-schema@4.1.1':
    resolution: {integrity: sha512-gAmrUZSGtKc3AiBL71iNWxDsyUC5uMaKKGdvzYsBoTW/xi42JQHl7eKV2OYzCUqvc+D2RCcf7EXY2iCyFIk6og==}

  '@colors/colors@1.5.0':
    resolution: {integrity: sha512-ooWCrlZP11i8GImSjTHYHLkvFDP48nS4+204nGb1RiX/WXYHmJA2III9/e2DWVabCESdW7hBAEzHRqUn9OUVvQ==}
    engines: {node: '>=0.1.90'}

  '@cspotcode/source-map-support@0.8.1':
    resolution: {integrity: sha512-IchNf6dN4tHoMFIn/7OE8LWZ19Y6q/67Bmf6vnGREv8RSbBVb9LPJxEcnwrcwX6ixSvaiGoomAUvu4YSxXrVgw==}
    engines: {node: '>=12'}

  '@eslint-community/eslint-utils@4.4.1':
    resolution: {integrity: sha512-s3O3waFUrMV8P/XaF/+ZTp1X9XBZW1a4B97ZnjQF2KYWaFD2A8KyFBsrsfSjEmjn3RGWAIuvlneuZm3CUK3jbA==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}
    peerDependencies:
      eslint: ^6.0.0 || ^7.0.0 || >=8.0.0

  '@eslint-community/regexpp@4.12.1':
    resolution: {integrity: sha512-CCZCDJuduB9OUkFkY2IgppNZMi2lBQgD2qzwXkEia16cge2pijY/aXi96CJMquDMn3nJdlPV1A5KrJEXwfLNzQ==}
    engines: {node: ^12.0.0 || ^14.0.0 || >=16.0.0}

  '@eslint/config-array@0.19.2':
    resolution: {integrity: sha512-GNKqxfHG2ySmJOBSHg7LxeUx4xpuCoFjacmlCoYWEbaPXLwvfIjixRI12xCQZeULksQb23uiA8F40w5TojpV7w==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/core@0.10.0':
    resolution: {integrity: sha512-gFHJ+xBOo4G3WRlR1e/3G8A6/KZAH6zcE/hkLRCZTi/B9avAG365QhFA8uOGzTMqgTghpn7/fSnscW++dpMSAw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/core@0.11.0':
    resolution: {integrity: sha512-DWUB2pksgNEb6Bz2fggIy1wh6fGgZP4Xyy/Mt0QZPiloKKXerbqq9D3SBQTlCRYOrcRPu4vuz+CGjwdfqxnoWA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/eslintrc@3.2.0':
    resolution: {integrity: sha512-grOjVNN8P3hjJn/eIETF1wwd12DdnwFDoyceUJLYYdkpbwq3nLi+4fqrTAONx7XDALqlL220wC/RHSC/QTI/0w==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/js@9.20.0':
    resolution: {integrity: sha512-iZA07H9io9Wn836aVTytRaNqh00Sad+EamwOVJT12GTLw1VGMFV/4JaME+JjLtr9fiGaoWgYnS54wrfWsSs4oQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/object-schema@2.1.6':
    resolution: {integrity: sha512-RBMg5FRL0I0gs51M/guSAj5/e14VQ4tpZnQNWwuDT66P14I43ItmPfIZRhO9fUVIPOAQXU47atlywZ/czoqFPA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@eslint/plugin-kit@0.2.5':
    resolution: {integrity: sha512-lB05FkqEdUg2AA0xEbUz0SnkXT1LcCTa438W4IWTUh4hdOnVbQyOJ81OrDXsJk/LSiJHubgGEFoR5EHq1NsH1A==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@google/generative-ai@0.21.0':
    resolution: {integrity: sha512-7XhUbtnlkSEZK15kN3t+tzIMxsbKm/dSkKBFalj+20NvPKe1kBY7mR2P7vuijEn+f06z5+A8bVGKO0v39cr6Wg==}
    engines: {node: '>=18.0.0'}

  '@humanfs/core@0.19.1':
    resolution: {integrity: sha512-5DyQ4+1JEUzejeK1JGICcideyfUbGixgS9jNgex5nqkW+cY7WZhxBigmieN5Qnw9ZosSNVC9KQKyb+GUaGyKUA==}
    engines: {node: '>=18.18.0'}

  '@humanfs/node@0.16.6':
    resolution: {integrity: sha512-YuI2ZHQL78Q5HbhDiBA1X4LmYdXCKCMQIfw0pw7piHJwyREFebJUvrQN4cMssyES6x+vfUbx1CIpaQUKYdQZOw==}
    engines: {node: '>=18.18.0'}

  '@humanwhocodes/module-importer@1.0.1':
    resolution: {integrity: sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==}
    engines: {node: '>=12.22'}

  '@humanwhocodes/retry@0.3.1':
    resolution: {integrity: sha512-JBxkERygn7Bv/GbN5Rv8Ul6LVknS+5Bp6RgDC/O8gEBU/yeH5Ui5C/OlWrTb6qct7LjjfT6Re2NxB0ln0yYybA==}
    engines: {node: '>=18.18'}

  '@humanwhocodes/retry@0.4.1':
    resolution: {integrity: sha512-c7hNEllBlenFTHBky65mhq8WD2kbN9Q6gk0bTk8lSBvc554jpXSkST1iePudpt7+A/AQvuHs9EMqjHDXMY1lrA==}
    engines: {node: '>=18.18'}

  '@inquirer/checkbox@4.1.1':
    resolution: {integrity: sha512-os5kFd/52gZTl/W6xqMfhaKVJHQM8V/U1P8jcSaQJ/C4Qhdrf2jEXdA/HaxfQs9iiUA/0yzYhk5d3oRHTxGDDQ==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/confirm@5.1.5':
    resolution: {integrity: sha512-ZB2Cz8KeMINUvoeDi7IrvghaVkYT2RB0Zb31EaLWOE87u276w4wnApv0SH2qWaJ3r0VSUa3BIuz7qAV2ZvsZlg==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/core@10.1.6':
    resolution: {integrity: sha512-Bwh/Zk6URrHwZnSSzAZAKH7YgGYi0xICIBDFOqBQoXNNAzBHw/bgXgLmChfp+GyR3PnChcTbiCTZGC6YJNJkMA==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/editor@4.2.6':
    resolution: {integrity: sha512-l0smvr8g/KAVdXx4I92sFxZiaTG4kFc06cFZw+qqwTirwdUHMFLnouXBB9OafWhpO3cfEkEz2CdPoCmor3059A==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/expand@4.0.8':
    resolution: {integrity: sha512-k0ouAC6L+0Yoj/j0ys2bat0fYcyFVtItDB7h+pDFKaDDSFJey/C/YY1rmIOqkmFVZ5rZySeAQuS8zLcKkKRLmg==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/figures@1.0.10':
    resolution: {integrity: sha512-Ey6176gZmeqZuY/W/nZiUyvmb1/qInjcpiZjXWi6nON+nxJpD1bxtSoBxNliGISae32n6OwbY+TSXPZ1CfS4bw==}
    engines: {node: '>=18'}

  '@inquirer/input@4.1.5':
    resolution: {integrity: sha512-bB6wR5wBCz5zbIVBPnhp94BHv/G4eKbUEjlpCw676pI2chcvzTx1MuwZSCZ/fgNOdqDlAxkhQ4wagL8BI1D3Zg==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/number@3.0.8':
    resolution: {integrity: sha512-CTKs+dT1gw8dILVWATn8Ugik1OHLkkfY82J+Musb57KpmF6EKyskv8zmMiEJPzOnLTZLo05X/QdMd8VH9oulXw==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/password@4.0.8':
    resolution: {integrity: sha512-MgA+Z7o3K1df2lGY649fyOBowHGfrKRz64dx3+b6c1w+h2W7AwBoOkHhhF/vfhbs5S4vsKNCuDzS3s9r5DpK1g==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/prompts@7.2.1':
    resolution: {integrity: sha512-v2JSGri6/HXSfoGIwuKEn8sNCQK6nsB2BNpy2lSX6QH9bsECrMv93QHnj5+f+1ZWpF/VNioIV2B/PDox8EvGuQ==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'

  '@inquirer/prompts@7.2.3':
    resolution: {integrity: sha512-hzfnm3uOoDySDXfDNOm9usOuYIaQvTgKp/13l1uJoe6UNY+Zpcn2RYt0jXz3yA+yemGHvDOxVzqWl3S5sQq53Q==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'

  '@inquirer/rawlist@4.0.8':
    resolution: {integrity: sha512-hl7rvYW7Xl4un8uohQRUgO6uc2hpn7PKqfcGkCOWC0AA4waBxAv6MpGOFCEDrUaBCP+pXPVqp4LmnpWmn1E1+g==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/search@3.0.8':
    resolution: {integrity: sha512-ihSE9D3xQAupNg/aGDZaukqoUSXG2KfstWosVmFCG7jbMQPaj2ivxWtsB+CnYY/T4D6LX1GHKixwJLunNCffww==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/select@4.0.8':
    resolution: {integrity: sha512-Io2prxFyN2jOCcu4qJbVoilo19caiD3kqkD3WR0q3yDA5HUCo83v4LrRtg55ZwniYACW64z36eV7gyVbOfORjA==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@inquirer/type@3.0.4':
    resolution: {integrity: sha512-2MNFrDY8jkFYc9Il9DgLsHhMzuHnOYM1+CUYVWbzu9oT0hC7V7EcYvdCKeoll/Fcci04A+ERZ9wcc7cQ8lTkIA==}
    engines: {node: '>=18'}
    peerDependencies:
      '@types/node': '>=18'
    peerDependenciesMeta:
      '@types/node':
        optional: true

  '@isaacs/cliui@8.0.2':
    resolution: {integrity: sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA==}
    engines: {node: '>=12'}

  '@istanbuljs/load-nyc-config@1.1.0':
    resolution: {integrity: sha512-VjeHSlIzpv/NyD3N0YuHfXOPDIixcA1q2ZV98wsMqcYlPmv2n3Yb2lYP9XMElnaFVXg5A7YLTeLu6V84uQDjmQ==}
    engines: {node: '>=8'}

  '@istanbuljs/schema@0.1.3':
    resolution: {integrity: sha512-ZXRY4jNvVgSVQ8DL3LTcakaAtXwTVUxE81hslsyD2AtoXW/wVob10HkOJ1X/pAlcI7D+2YoZKg5do8G/w6RYgA==}
    engines: {node: '>=8'}

  '@jest/console@29.7.0':
    resolution: {integrity: sha512-5Ni4CU7XHQi32IJ398EEP4RrB8eV09sXP2ROqD4bksHrnTree52PsxvX8tpL8LvTZ3pFzXyPbNQReSN41CAhOg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/core@29.7.0':
    resolution: {integrity: sha512-n7aeXWKMnGtDA48y8TLWJPJmLmmZ642Ceo78cYWEpiD7FzDgmNDV/GCVRorPABdXLJZ/9wzzgZAlHjXjxDHGsg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    peerDependencies:
      node-notifier: ^8.0.1 || ^9.0.0 || ^10.0.0
    peerDependenciesMeta:
      node-notifier:
        optional: true

  '@jest/environment@29.7.0':
    resolution: {integrity: sha512-aQIfHDq33ExsN4jP1NWGXhxgQ/wixs60gDiKO+XVMd8Mn0NWPWgc34ZQDTb2jKaUWQ7MuwoitXAsN2XVXNMpAw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/expect-utils@29.7.0':
    resolution: {integrity: sha512-GlsNBWiFQFCVi9QVSx7f5AgMeLxe9YCCs5PuP2O2LdjDAA8Jh9eX7lA1Jq/xdXw3Wb3hyvlFNfZIfcRetSzYcA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/expect@29.7.0':
    resolution: {integrity: sha512-8uMeAMycttpva3P1lBHB8VciS9V0XAr3GymPpipdyQXbBcuhkLQOSe8E/p92RyAdToS6ZD1tFkX+CkhoECE0dQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/fake-timers@29.7.0':
    resolution: {integrity: sha512-q4DH1Ha4TTFPdxLsqDXK1d3+ioSL7yL5oCMJZgDYm6i+6CygW5E5xVr/D1HdsGxjt1ZWSfUAs9OxSB/BNelWrQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/globals@29.7.0':
    resolution: {integrity: sha512-mpiz3dutLbkW2MNFubUGUEVLkTGiqW6yLVTA+JbP6fI6J5iL9Y0Nlg8k95pcF8ctKwCS7WVxteBs29hhfAotzQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/reporters@29.7.0':
    resolution: {integrity: sha512-DApq0KJbJOEzAFYjHADNNxAE3KbhxQB1y5Kplb5Waqw6zVbuWatSnMjE5gs8FUgEPmNsnZA3NCWl9NG0ia04Pg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    peerDependencies:
      node-notifier: ^8.0.1 || ^9.0.0 || ^10.0.0
    peerDependenciesMeta:
      node-notifier:
        optional: true

  '@jest/schemas@29.6.3':
    resolution: {integrity: sha512-mo5j5X+jIZmJQveBKeS/clAueipV7KgiX1vMgCxam1RNYiqE1w62n0/tJJnHtjW8ZHcQco5gY85jA3mi0L+nSA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/source-map@29.6.3':
    resolution: {integrity: sha512-MHjT95QuipcPrpLM+8JMSzFx6eHp5Bm+4XeFDJlwsvVBjmKNiIAvasGK2fxz2WbGRlnvqehFbh07MMa7n3YJnw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/test-result@29.7.0':
    resolution: {integrity: sha512-Fdx+tv6x1zlkJPcWXmMDAG2HBnaR9XPSd5aDWQVsfrZmLVT3lU1cwyxLgRmXR9yrq4NBoEm9BMsfgFzTQAbJYA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/test-sequencer@29.7.0':
    resolution: {integrity: sha512-GQwJ5WZVrKnOJuiYiAF52UNUJXgTZx1NHjFSEB0qEMmSZKAkdMoIzw/Cj6x6NF4AvV23AUqDpFzQkN/eYCYTxw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/transform@29.7.0':
    resolution: {integrity: sha512-ok/BTPFzFKVMwO5eOHRrvnBVHdRy9IrsrW1GpMaQ9MCnilNLXQKmAX8s1YXDFaai9xJpac2ySzV0YeRRECr2Vw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jest/types@29.6.3':
    resolution: {integrity: sha512-u3UPsIilWKOM3F9CXtrG8LEJmNxwoCQC/XVj4IKYXvvpx7QIi/Kg1LI5uDmDpKlac62NUtX7eLjRh+jVZcLOzw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  '@jridgewell/gen-mapping@0.3.8':
    resolution: {integrity: sha512-imAbBGkb+ebQyxKgzv5Hu2nmROxoDOXHh80evxdoXNOrvAnVx7zimzc1Oo5h9RlfV4vPXaE2iM5pOFbvOCClWA==}
    engines: {node: '>=6.0.0'}

  '@jridgewell/resolve-uri@3.1.2':
    resolution: {integrity: sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==}
    engines: {node: '>=6.0.0'}

  '@jridgewell/set-array@1.2.1':
    resolution: {integrity: sha512-R8gLRTZeyp03ymzP/6Lil/28tGeGEzhx1q2k703KGWRAI1VdvPIXdG70VJc2pAMw3NA6JKL5hhFu1sJX0Mnn/A==}
    engines: {node: '>=6.0.0'}

  '@jridgewell/source-map@0.3.6':
    resolution: {integrity: sha512-1ZJTZebgqllO79ue2bm3rIGud/bOe0pP5BjSRCRxxYkEZS8STV7zN84UBbiYu7jy+eCKSnVIUgoWWE/tt+shMQ==}

  '@jridgewell/sourcemap-codec@1.5.0':
    resolution: {integrity: sha512-gv3ZRaISU3fjPAgNsriBRqGWQL6quFx04YMPW/zD8XMLsU32mhCCbfbO6KZFLjvYpCZ8zyDEgqsgf+PwPaM7GQ==}

  '@jridgewell/trace-mapping@0.3.25':
    resolution: {integrity: sha512-vNk6aEwybGtawWmy/PzwnGDOjCkLWSD2wqvjGGAgOAwCGWySYXfYoxt00IJkTF+8Lb57DwOb3Aa0o9CApepiYQ==}

  '@jridgewell/trace-mapping@0.3.9':
    resolution: {integrity: sha512-3Belt6tdc8bPgAtbcmdtNJlirVoTmEb5e2gC94PnkwEW9jI6CAHUeoG85tjWP5WquqfavoMtMwiG4P926ZKKuQ==}

  '@langchain/core@0.1.63':
    resolution: {integrity: sha512-+fjyYi8wy6x1P+Ee1RWfIIEyxd9Ee9jksEwvrggPwwI/p45kIDTdYTblXsM13y4mNWTiACyLSdbwnPaxxdoz+w==}
    engines: {node: '>=18'}

  '@langchain/core@0.3.40':
    resolution: {integrity: sha512-RGhJOTzJv6H+3veBAnDlH2KXuZ68CXMEg6B6DPTzL3IGDyd+vLxXG4FIttzUwjdeQKjrrFBwlXpJDl7bkoApzQ==}
    engines: {node: '>=18'}

  '@langchain/google-genai@0.1.8':
    resolution: {integrity: sha512-aBz8IzEJfihOVz2GpqFrdLWjDlpscZUYIA7LZ2iazU7edO03etPaqxdexiYKr/Q+Be2D0BT7uaFJsouvQApIZA==}
    engines: {node: '>=18'}
    peerDependencies:
      '@langchain/core': '>=0.3.17 <0.4.0'

  '@langchain/groq@0.0.1':
    resolution: {integrity: sha512-eZ26j6QQWaTdPc0P5131NEEbm/rj4eCdGw7JgkMY9Oh0DZm+ziSKGfXKQAbd1XtgXHDyBO9nviEF0D9EVkuERQ==}
    engines: {node: '>=18'}

  '@langchain/openai@0.0.14':
    resolution: {integrity: sha512-co6nRylPrLGY/C3JYxhHt6cxLq07P086O7K3QaZH7SFFErIN9wSzJonpvhZR07DEUq6eK6wKgh2ORxA/NcjSRQ==}
    engines: {node: '>=18'}

  '@lukeed/csprng@1.1.0':
    resolution: {integrity: sha512-Z7C/xXCiGWsg0KuKsHTKJxbWhpI3Vs5GwLfOean7MGyVFGqdRgBbAjOCh6u4bbjPc/8MJ2pZmK/0DLdCbivLDA==}
    engines: {node: '>=8'}

  '@napi-rs/nice-android-arm-eabi@1.0.1':
    resolution: {integrity: sha512-5qpvOu5IGwDo7MEKVqqyAxF90I6aLj4n07OzpARdgDRfz8UbBztTByBp0RC59r3J1Ij8uzYi6jI7r5Lws7nn6w==}
    engines: {node: '>= 10'}
    cpu: [arm]
    os: [android]

  '@napi-rs/nice-android-arm64@1.0.1':
    resolution: {integrity: sha512-GqvXL0P8fZ+mQqG1g0o4AO9hJjQaeYG84FRfZaYjyJtZZZcMjXW5TwkL8Y8UApheJgyE13TQ4YNUssQaTgTyvA==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [android]

  '@napi-rs/nice-darwin-arm64@1.0.1':
    resolution: {integrity: sha512-91k3HEqUl2fsrz/sKkuEkscj6EAj3/eZNCLqzD2AA0TtVbkQi8nqxZCZDMkfklULmxLkMxuUdKe7RvG/T6s2AA==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [darwin]

  '@napi-rs/nice-darwin-x64@1.0.1':
    resolution: {integrity: sha512-jXnMleYSIR/+TAN/p5u+NkCA7yidgswx5ftqzXdD5wgy/hNR92oerTXHc0jrlBisbd7DpzoaGY4cFD7Sm5GlgQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [darwin]

  '@napi-rs/nice-freebsd-x64@1.0.1':
    resolution: {integrity: sha512-j+iJ/ezONXRQsVIB/FJfwjeQXX7A2tf3gEXs4WUGFrJjpe/z2KB7sOv6zpkm08PofF36C9S7wTNuzHZ/Iiccfw==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [freebsd]

  '@napi-rs/nice-linux-arm-gnueabihf@1.0.1':
    resolution: {integrity: sha512-G8RgJ8FYXYkkSGQwywAUh84m946UTn6l03/vmEXBYNJxQJcD+I3B3k5jmjFG/OPiU8DfvxutOP8bi+F89MCV7Q==}
    engines: {node: '>= 10'}
    cpu: [arm]
    os: [linux]

  '@napi-rs/nice-linux-arm64-gnu@1.0.1':
    resolution: {integrity: sha512-IMDak59/W5JSab1oZvmNbrms3mHqcreaCeClUjwlwDr0m3BoR09ZiN8cKFBzuSlXgRdZ4PNqCYNeGQv7YMTjuA==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]

  '@napi-rs/nice-linux-arm64-musl@1.0.1':
    resolution: {integrity: sha512-wG8fa2VKuWM4CfjOjjRX9YLIbysSVV1S3Kgm2Fnc67ap/soHBeYZa6AGMeR5BJAylYRjnoVOzV19Cmkco3QEPw==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [linux]

  '@napi-rs/nice-linux-ppc64-gnu@1.0.1':
    resolution: {integrity: sha512-lxQ9WrBf0IlNTCA9oS2jg/iAjQyTI6JHzABV664LLrLA/SIdD+I1i3Mjf7TsnoUbgopBcCuDztVLfJ0q9ubf6Q==}
    engines: {node: '>= 10'}
    cpu: [ppc64]
    os: [linux]

  '@napi-rs/nice-linux-riscv64-gnu@1.0.1':
    resolution: {integrity: sha512-3xs69dO8WSWBb13KBVex+yvxmUeEsdWexxibqskzoKaWx9AIqkMbWmE2npkazJoopPKX2ULKd8Fm9veEn0g4Ig==}
    engines: {node: '>= 10'}
    cpu: [riscv64]
    os: [linux]

  '@napi-rs/nice-linux-s390x-gnu@1.0.1':
    resolution: {integrity: sha512-lMFI3i9rlW7hgToyAzTaEybQYGbQHDrpRkg+1gJWEpH0PLAQoZ8jiY0IzakLfNWnVda1eTYYlxxFYzW8Rqczkg==}
    engines: {node: '>= 10'}
    cpu: [s390x]
    os: [linux]

  '@napi-rs/nice-linux-x64-gnu@1.0.1':
    resolution: {integrity: sha512-XQAJs7DRN2GpLN6Fb+ZdGFeYZDdGl2Fn3TmFlqEL5JorgWKrQGRUrpGKbgZ25UeZPILuTKJ+OowG2avN8mThBA==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]

  '@napi-rs/nice-linux-x64-musl@1.0.1':
    resolution: {integrity: sha512-/rodHpRSgiI9o1faq9SZOp/o2QkKQg7T+DK0R5AkbnI/YxvAIEHf2cngjYzLMQSQgUhxym+LFr+UGZx4vK4QdQ==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [linux]

  '@napi-rs/nice-win32-arm64-msvc@1.0.1':
    resolution: {integrity: sha512-rEcz9vZymaCB3OqEXoHnp9YViLct8ugF+6uO5McifTedjq4QMQs3DHz35xBEGhH3gJWEsXMUbzazkz5KNM5YUg==}
    engines: {node: '>= 10'}
    cpu: [arm64]
    os: [win32]

  '@napi-rs/nice-win32-ia32-msvc@1.0.1':
    resolution: {integrity: sha512-t7eBAyPUrWL8su3gDxw9xxxqNwZzAqKo0Szv3IjVQd1GpXXVkb6vBBQUuxfIYaXMzZLwlxRQ7uzM2vdUE9ULGw==}
    engines: {node: '>= 10'}
    cpu: [ia32]
    os: [win32]

  '@napi-rs/nice-win32-x64-msvc@1.0.1':
    resolution: {integrity: sha512-JlF+uDcatt3St2ntBG8H02F1mM45i5SF9W+bIKiReVE6wiy3o16oBP/yxt+RZ+N6LbCImJXJ6bXNO2kn9AXicg==}
    engines: {node: '>= 10'}
    cpu: [x64]
    os: [win32]

  '@napi-rs/nice@1.0.1':
    resolution: {integrity: sha512-zM0mVWSXE0a0h9aKACLwKmD6nHcRiKrPpCfvaKqG1CqDEyjEawId0ocXxVzPMCAm6kkWr2P025msfxXEnt8UGQ==}
    engines: {node: '>= 10'}

  '@nestjs/cli@11.0.2':
    resolution: {integrity: sha512-y1dKk+Q94vnWhJe8eoz1Qs5WIYHSgO0xZttsFnDbYW1A6CBUVanc4RocbiyhwC/GjWPO4D5JmTXjW5mRH6wprA==}
    engines: {node: '>= 20.11'}
    hasBin: true
    peerDependencies:
      '@swc/cli': ^0.1.62 || ^0.3.0 || ^0.4.0 || ^0.5.0 || ^0.6.0
      '@swc/core': ^1.3.62
    peerDependenciesMeta:
      '@swc/cli':
        optional: true
      '@swc/core':
        optional: true

  '@nestjs/common@11.0.9':
    resolution: {integrity: sha512-+SKMYQE7O55tJGQVibnAlR9sXRBCF/8gM1cILdLT7cLj7+51NYD7eAHuAcGYiQIyXsTehZoO7C+B7S3ibNi3aw==}
    peerDependencies:
      class-transformer: '*'
      class-validator: '*'
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      class-transformer:
        optional: true
      class-validator:
        optional: true

  '@nestjs/config@4.0.0':
    resolution: {integrity: sha512-hyhUMtVwlT+tavtPNyekl8iP0QTU1U6awKrgdOSxhMhp3TQMltx7hz2yqGTcARp+19zWPfgJudyxthuD3lPp/Q==}
    peerDependencies:
      '@nestjs/common': ^10.0.0 || ^11.0.0
      rxjs: ^7.1.0

  '@nestjs/core@11.0.9':
    resolution: {integrity: sha512-w32ZF1acSnidiRERGRC/Ki7eSrnTdP7twRnjy15Qnmij3oYRCdgX5aZvbUNv17A7bn9S22p+wMNcpHxqwUiOsQ==}
    engines: {node: '>= 20'}
    peerDependencies:
      '@nestjs/common': ^11.0.0
      '@nestjs/microservices': ^11.0.0
      '@nestjs/platform-express': ^11.0.0
      '@nestjs/websockets': ^11.0.0
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      '@nestjs/microservices':
        optional: true
      '@nestjs/platform-express':
        optional: true
      '@nestjs/websockets':
        optional: true

  '@nestjs/microservices@11.0.9':
    resolution: {integrity: sha512-eyrAVs3P+IDymhzk6xdtS0AqArz1bVyc3TQa1GQm2VZSdAXHxl9tEVikfVdcUbip/Xya8Qp45UalYXFdP5lbpQ==}
    peerDependencies:
      '@grpc/grpc-js': '*'
      '@nestjs/common': ^11.0.0
      '@nestjs/core': ^11.0.0
      '@nestjs/websockets': ^11.0.0
      amqp-connection-manager: '*'
      amqplib: '*'
      cache-manager: '*'
      ioredis: '*'
      kafkajs: '*'
      mqtt: '*'
      nats: '*'
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      '@grpc/grpc-js':
        optional: true
      '@nestjs/websockets':
        optional: true
      amqp-connection-manager:
        optional: true
      amqplib:
        optional: true
      cache-manager:
        optional: true
      ioredis:
        optional: true
      kafkajs:
        optional: true
      mqtt:
        optional: true
      nats:
        optional: true

  '@nestjs/platform-express@11.0.9':
    resolution: {integrity: sha512-AX3UbVNkK+yB0lxfwjy5krxLZy/bWD2V+3WIbc0btRQVcxGj4LWL0yenbAo0jiAFwW3rKt7SbmMHUuKK6OH5qA==}
    peerDependencies:
      '@nestjs/common': ^11.0.0
      '@nestjs/core': ^11.0.0

  '@nestjs/platform-socket.io@11.0.9':
    resolution: {integrity: sha512-H+wTOollSZ1GSAp2+UIl4x+rYutkrH0poYeeo/+Dr8AwobghZuSGxoQ3FpqIurI/NuwBoBdFJV7cm7v9mlKkuw==}
    peerDependencies:
      '@nestjs/common': ^11.0.0
      '@nestjs/websockets': ^11.0.0
      rxjs: ^7.1.0

  '@nestjs/schematics@11.0.0':
    resolution: {integrity: sha512-wts8lG0GfNWw3Wk9aaG5I/wcMIAdm7HjjeThQfUZhJxeIFT82Z3F5+0cYdHH4ii2pYQGiCSrR1VcuMwPiHoecg==}
    peerDependencies:
      typescript: '>=4.8.2'

  '@nestjs/testing@11.0.9':
    resolution: {integrity: sha512-49UV5tC4N0pLf6waVjBVr/CyTkQPGZG/wLmbmu1INd/brprKOJ2lT3nl+6qfWJIqGbxGqZHUQr5FcDk+T/w9lQ==}
    peerDependencies:
      '@nestjs/common': ^11.0.0
      '@nestjs/core': ^11.0.0
      '@nestjs/microservices': ^11.0.0
      '@nestjs/platform-express': ^11.0.0
    peerDependenciesMeta:
      '@nestjs/microservices':
        optional: true
      '@nestjs/platform-express':
        optional: true

  '@nestjs/websockets@11.0.9':
    resolution: {integrity: sha512-+eWh4MPTYBCoCQgcTY6g8TNPg0FkKzoqWRuugoA95Zz5edldoEK/P4BkqvzBiwrKqoHKwpsM/cct2edFA1TzQg==}
    peerDependencies:
      '@nestjs/common': ^11.0.0
      '@nestjs/core': ^11.0.0
      '@nestjs/platform-socket.io': ^11.0.0
      reflect-metadata: ^0.1.12 || ^0.2.0
      rxjs: ^7.1.0
    peerDependenciesMeta:
      '@nestjs/platform-socket.io':
        optional: true

  '@nodelib/fs.scandir@2.1.5':
    resolution: {integrity: sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==}
    engines: {node: '>= 8'}

  '@nodelib/fs.stat@2.0.5':
    resolution: {integrity: sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A==}
    engines: {node: '>= 8'}

  '@nodelib/fs.walk@1.2.8':
    resolution: {integrity: sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==}
    engines: {node: '>= 8'}

  '@nuxt/opencollective@0.4.1':
    resolution: {integrity: sha512-GXD3wy50qYbxCJ652bDrDzgMr3NFEkIS374+IgFQKkCvk9yiYcLvX2XDYr7UyQxf4wK0e+yqDYRubZ0DtOxnmQ==}
    engines: {node: ^14.18.0 || >=16.10.0, npm: '>=5.10.0'}
    hasBin: true

  '@pkgr/core@0.1.1':
    resolution: {integrity: sha512-cq8o4cWH0ibXh9VGi5P20Tu9XF/0fFXl9EUinr9QfTM7a7p0oTA4iJRCQWppXR1Pg8dSM0UCItCkPwsk9qWWYA==}
    engines: {node: ^12.20.0 || ^14.18.0 || >=16.0.0}

  '@sec-ant/readable-stream@0.4.1':
    resolution: {integrity: sha512-831qok9r2t8AlxLko40y2ebgSDhenenCatLVeW/uBtnHPyhHOvG0C7TvfgecV+wHzIm5KUICgzmVpWS+IMEAeg==}

  '@sinclair/typebox@0.27.8':
    resolution: {integrity: sha512-+Fj43pSMwJs4KRrH/938Uf+uAELIgVBmQzg/q1YG10djyfA3TnrU8N8XzqCh/okZdszqBQTZf96idMfE5lnwTA==}

  '@sindresorhus/is@5.6.0':
    resolution: {integrity: sha512-TV7t8GKYaJWsn00tFDqBw8+Uqmr8A0fRU1tvTQhyZzGv0sJCGRQL3JGMI3ucuKo3XIZdUP+Lx7/gh2t3lewy7g==}
    engines: {node: '>=14.16'}

  '@sinonjs/commons@3.0.1':
    resolution: {integrity: sha512-K3mCHKQ9sVh8o1C9cxkwxaOmXoAMlDxC1mYyHrjqOWEcBjYr76t96zL2zlj5dUGZ3HSw240X1qgH3Mjf1yJWpQ==}

  '@sinonjs/fake-timers@10.3.0':
    resolution: {integrity: sha512-V4BG07kuYSUkTCSBHG8G8TNhM+F19jXFWnQtzj+we8DrkpSBCee9Z3Ms8yiGer/dlmhe35/Xdgyo3/0rQKg7YA==}

  '@socket.io/component-emitter@3.1.2':
    resolution: {integrity: sha512-9BCxFwvbGg/RsZK9tjXd8s4UcwR0MWeFQ1XEKIQVVvAGJyINdrqKMcTRyLoK8Rse1GjzLV9cwjWV1olXRWEXVA==}

  '@spider-cloud/spider-client@0.1.26':
    resolution: {integrity: sha512-L7z8OXHucLOj1qaCLUj8fqEtKjzkgny8rSRvCwGoEu55rXjU3XcdPGnRUOqZnEGobKKqGAYjxDwVY+lKDh4mmQ==}

  '@swc/cli@0.6.0':
    resolution: {integrity: sha512-Q5FsI3Cw0fGMXhmsg7c08i4EmXCrcl+WnAxb6LYOLHw4JFFC3yzmx9LaXZ7QMbA+JZXbigU2TirI7RAfO0Qlnw==}
    engines: {node: '>= 16.14.0'}
    hasBin: true
    peerDependencies:
      '@swc/core': ^1.2.66
      chokidar: ^4.0.1
    peerDependenciesMeta:
      chokidar:
        optional: true

  '@swc/core-darwin-arm64@1.10.16':
    resolution: {integrity: sha512-iikIxwqCQ4Bvz79vJ4ELh26efPf1u5D9TFdmXSJUBs7C3mmMHvk5zyWD9A9cTowXiW6WHs2gE58U1R9HOTTIcg==}
    engines: {node: '>=10'}
    cpu: [arm64]
    os: [darwin]

  '@swc/core-darwin-x64@1.10.16':
    resolution: {integrity: sha512-R2Eb9aktWd62vPfW9H/c/OaQ0e94iURibBo4uzUUcgxNNmB4+wb6piKbHxGdr/5bEsT+vJ1lwZFSRzfb45E7DA==}
    engines: {node: '>=10'}
    cpu: [x64]
    os: [darwin]

  '@swc/core-linux-arm-gnueabihf@1.10.16':
    resolution: {integrity: sha512-mkqN3HBAMnuiSGZ/k2utScuH8rAPshvNj0T1LjBWon+X9DkMNHSA+aMLdWsy0yZKF1zjOPc4L3Uq2l2wzhUlzA==}
    engines: {node: '>=10'}
    cpu: [arm]
    os: [linux]

  '@swc/core-linux-arm64-gnu@1.10.16':
    resolution: {integrity: sha512-PH/+q/L5nVZJ91CU07CL6Q9Whs6iR6nneMZMAgtVF9Ix8ST0cWVItdUhs6D38kFklCFhaOrpHhS01HlMJ72vWw==}
    engines: {node: '>=10'}
    cpu: [arm64]
    os: [linux]

  '@swc/core-linux-arm64-musl@1.10.16':
    resolution: {integrity: sha512-1169+C9XbydKKc6Ec1XZxTGKtHjZHDIFn0r+Nqp/QSVwkORrOY1Vz2Hdu7tn/lWMg36ZkGePS+LnnyV67s/7yg==}
    engines: {node: '>=10'}
    cpu: [arm64]
    os: [linux]

  '@swc/core-linux-x64-gnu@1.10.16':
    resolution: {integrity: sha512-n2rV0XwkjoHn4MDJmpYp5RBrnyi94/6GsJVpbn6f+/eqSrZn3mh3dT7pdZc9zCN1Qp9eDHo+uI6e/wgvbL22uA==}
    engines: {node: '>=10'}
    cpu: [x64]
    os: [linux]

  '@swc/core-linux-x64-musl@1.10.16':
    resolution: {integrity: sha512-EevCpwreBrkPrJjQVIbiM81lK42ukNNSlBmrSRxxbx2V9VGmOd5qxX0cJBn0TRRSLIPi62BuMS76F9iYjqsjgg==}
    engines: {node: '>=10'}
    cpu: [x64]
    os: [linux]

  '@swc/core-win32-arm64-msvc@1.10.16':
    resolution: {integrity: sha512-BvE7RWAnKJeELVQWLok6env5I4GUVBTZSvaSN/VPgxnTjF+4PsTeQptYx0xCYhp5QCv68wWYsBnZKuPDS+SBsw==}
    engines: {node: '>=10'}
    cpu: [arm64]
    os: [win32]

  '@swc/core-win32-ia32-msvc@1.10.16':
    resolution: {integrity: sha512-7Jf/7AeCgbLR/JsQgMJuacHIq4Jeie3knf6+mXxn8aCvRypsOTIEu0eh7j24SolOboxK1ijqJ86GyN1VA2Rebg==}
    engines: {node: '>=10'}
    cpu: [ia32]
    os: [win32]

  '@swc/core-win32-x64-msvc@1.10.16':
    resolution: {integrity: sha512-p0blVm0R8bjaTtmW+FoPmLxLSQdRNbqhuWcR/8g80OzMSkka9mk5/J3kn/5JRVWh+MaR9LHRHZc1Q1L8zan13g==}
    engines: {node: '>=10'}
    cpu: [x64]
    os: [win32]

  '@swc/core@1.10.16':
    resolution: {integrity: sha512-nOINg/OUcZazCW7B55QV2/UB8QAqz9FYe4+z229+4RYboBTZ102K7ebOEjY5sKn59JgAkhjZTz+5BKmXpDFopw==}
    engines: {node: '>=10'}
    peerDependencies:
      '@swc/helpers': '*'
    peerDependenciesMeta:
      '@swc/helpers':
        optional: true

  '@swc/counter@0.1.3':
    resolution: {integrity: sha512-e2BR4lsJkkRlKZ/qCHPw9ZaSxc0MVUd7gtbtaB7aMvHeJVYe8sOB8DBZkP2DtISHGSku9sCK6T6cnY0CtXrOCQ==}

  '@swc/types@0.1.17':
    resolution: {integrity: sha512-V5gRru+aD8YVyCOMAjMpWR1Ui577DD5KSJsHP8RAxopAH22jFz6GZd/qxqjO6MJHQhcsjvjOFXyDhyLQUnMveQ==}

  '@szmarczak/http-timer@5.0.1':
    resolution: {integrity: sha512-+PmQX0PiAYPMeVYe237LJAYvOMYW1j2rH5YROyS3b4CTVJum34HfRvKvAzozHAQG0TnHNdUfY9nCeUyRAs//cw==}
    engines: {node: '>=14.16'}

  '@t3-oss/env-core@0.9.2':
    resolution: {integrity: sha512-KgWXljUTHgO3o7GMZQPAD5+P+HqpauMNNHowlm7V2b9IeMitSUpNKwG6xQrup/xARWHTdxRVIl0mSI4wCevQhQ==}
    peerDependencies:
      typescript: '>=5.0.0'
      zod: ^3.0.0
    peerDependenciesMeta:
      typescript:
        optional: true

  '@tokenizer/token@0.3.0':
    resolution: {integrity: sha512-OvjF+z51L3ov0OyAU0duzsYuvO01PH7x4t6DJx+guahgTnBHkhJdG7soQeTSFLWN3efnHyibZ4Z8l2EuWwJN3A==}

  '@tsconfig/node10@1.0.11':
    resolution: {integrity: sha512-DcRjDCujK/kCk/cUe8Xz8ZSpm8mS3mNNpta+jGCA6USEDfktlNvm1+IuZ9eTcDbNk41BHwpHHeW+N1lKCz4zOw==}

  '@tsconfig/node12@1.0.11':
    resolution: {integrity: sha512-cqefuRsh12pWyGsIoBKJA9luFu3mRxCA+ORZvA4ktLSzIuCUtWVxGIuXigEwO5/ywWFMZ2QEGKWvkZG1zDMTag==}

  '@tsconfig/node14@1.0.3':
    resolution: {integrity: sha512-ysT8mhdixWK6Hw3i1V2AeRqZ5WfXg1G43mqoYlM2nc6388Fq5jcXyr5mRsqViLx/GJYdoL0bfXD8nmF+Zn/Iow==}

  '@tsconfig/node16@1.0.4':
    resolution: {integrity: sha512-vxhUy4J8lyeyinH7Azl1pdd43GJhZH/tP2weN8TntQblOY+A0XbT8DJk1/oCPuOOyg/Ja757rG0CgHcWC8OfMA==}

  '@types/babel__core@7.20.5':
    resolution: {integrity: sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==}

  '@types/babel__generator@7.6.8':
    resolution: {integrity: sha512-ASsj+tpEDsEiFr1arWrlN6V3mdfjRMZt6LtK/Vp/kreFLnr5QH5+DhvD5nINYZXzwJvXeGq+05iUXcAzVrqWtw==}

  '@types/babel__template@7.4.4':
    resolution: {integrity: sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==}

  '@types/babel__traverse@7.20.6':
    resolution: {integrity: sha512-r1bzfrm0tomOI8g1SzvCaQHo6Lcv6zu0EA+W2kHrt8dyrHQxGzBBL4kdkzIS+jBMV+EYcMAEAqXqYaLJq5rOZg==}

  '@types/body-parser@1.19.5':
    resolution: {integrity: sha512-fB3Zu92ucau0iQ0JMCFQE7b/dv8Ot07NI3KaZIkIUNXq82k4eBAqUaneXfleGY9JWskeS9y+u0nXMyspcuQrCg==}

  '@types/cheerio@0.22.35':
    resolution: {integrity: sha512-yD57BchKRvTV+JD53UZ6PD8KWY5g5rvvMLRnZR3EQBCZXiDT/HR+pKpMzFGlWNhFrXlo7VPZXtKvIEwZkAWOIA==}

  '@types/connect@3.4.38':
    resolution: {integrity: sha512-K6uROf1LD88uDQqJCktA4yzL1YYAK6NgfsI0v/mTgyPKWsX1CnJ0XPSDhViejru1GcRkLWb8RlzFYJRqGUbaug==}

  '@types/cookiejar@2.1.5':
    resolution: {integrity: sha512-he+DHOWReW0nghN24E1WUqM0efK4kI9oTqDm6XmK8ZPe2djZ90BSNdGnIyCLzCPw7/pogPlGbzI2wHGGmi4O/Q==}

  '@types/cors@2.8.17':
    resolution: {integrity: sha512-8CGDvrBj1zgo2qE+oS3pOCyYNqCPryMWY2bGfwA0dcfopWGgxs+78df0Rs3rc9THP4JkOhLsAa+15VdpAqkcUA==}

  '@types/eslint-scope@3.7.7':
    resolution: {integrity: sha512-MzMFlSLBqNF2gcHWO0G1vP/YQyfvrxZ0bF+u7mzUdZ1/xK4A4sru+nraZz5i3iEIk1l1uyicaDVTB4QbbEkAYg==}

  '@types/eslint@9.6.1':
    resolution: {integrity: sha512-FXx2pKgId/WyYo2jXw63kk7/+TY7u7AziEJxJAnSFzHlqTAS3Ync6SvgYAN/k4/PQpnnVuzoMuVnByKK2qp0ag==}

  '@types/estree@1.0.6':
    resolution: {integrity: sha512-AYnb1nQyY49te+VRAVgmzfcgjYS91mY5P0TKUDCLEM+gNnA+3T6rWITXRLYCpahpqSQbN5cE+gHpnPyXjHWxcw==}

  '@types/express-serve-static-core@4.19.6':
    resolution: {integrity: sha512-N4LZ2xG7DatVqhCZzOGb1Yi5lMbXSZcmdLDe9EzSndPV2HpWYWzRbaerl2n27irrm94EPpprqa8KpskPT085+A==}

  '@types/express@4.17.21':
    resolution: {integrity: sha512-ejlPM315qwLpaQlQDTjPdsUFSc6ZsP4AN6AlWnogPjQ7CVi7PYF3YVz+CY3jE2pwYf7E/7HlDAN0rV2GxTG0HQ==}

  '@types/gensync@1.0.4':
    resolution: {integrity: sha512-C3YYeRQWp2fmq9OryX+FoDy8nXS6scQ7dPptD8LnFDAUNcKWJjXQKDNJD3HVm+kOUsXhTOkpi69vI4EuAr95bA==}

  '@types/graceful-fs@4.1.9':
    resolution: {integrity: sha512-olP3sd1qOEe5dXTSaFvQG+02VdRXcdytWLAZsAq1PecU8uqQAhkrnbli7DagjtXKW/Bl7YJbUsa8MPcuc8LHEQ==}

  '@types/http-cache-semantics@4.0.4':
    resolution: {integrity: sha512-1m0bIFVc7eJWyve9S0RnuRgcQqF/Xd5QsUZAZeQFr1Q3/p9JWoQQEqmVy+DPTNpGXwhgIetAoYF8JSc33q29QA==}

  '@types/http-errors@2.0.4':
    resolution: {integrity: sha512-D0CFMMtydbJAegzOyHjtiKPLlvnm3iTZyZRSZoLq2mRhDdmLfIWOCYPfQJ4cu2erKghU++QvjcUjp/5h7hESpA==}

  '@types/istanbul-lib-coverage@2.0.6':
    resolution: {integrity: sha512-2QF/t/auWm0lsy8XtKVPG19v3sSOQlJe/YHZgfjb/KBBHOGSV+J2q/S671rcq9uTBrLAXmZpqJiaQbMT+zNU1w==}

  '@types/istanbul-lib-report@3.0.3':
    resolution: {integrity: sha512-NQn7AHQnk/RSLOxrBbGyJM/aVQ+pjj5HCgasFxc0K/KhoATfQ/47AyUl15I2yBUpihjmas+a+VJBOqecrFH+uA==}

  '@types/istanbul-reports@3.0.4':
    resolution: {integrity: sha512-pk2B1NWalF9toCRu6gjBzR69syFjP4Od8WRAX+0mmf9lAjCRicLOWc+ZrxZHx/0XRjotgkF9t6iaMJ+aXcOdZQ==}

  '@types/jest@29.5.14':
    resolution: {integrity: sha512-ZN+4sdnLUbo8EVvVc2ao0GFW6oVrQRPn4K2lglySj7APvSrgzxHiNNK99us4WDMi57xxA2yggblIAMNhXOotLQ==}

  '@types/json-schema@7.0.15':
    resolution: {integrity: sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==}

  '@types/methods@1.1.4':
    resolution: {integrity: sha512-ymXWVrDiCxTBE3+RIrrP533E70eA+9qu7zdWoHuOmGujkYtzf4HQF96b8nwHLqhuf4ykX61IGRIB38CC6/sImQ==}

  '@types/mime@1.3.5':
    resolution: {integrity: sha512-/pyBZWSLD2n0dcHE3hq8s8ZvcETHtEuF+3E7XVt0Ig2nvsVQXdghHVcEkIWjy9A0wKfTn97a/PSDYohKIlnP/w==}

  '@types/node-fetch@2.6.12':
    resolution: {integrity: sha512-8nneRWKCg3rMtF69nLQJnOYUcbafYeFSjqkw3jCRLsqkWFlHaoQrr5mXmofFGOx3DKn7UfmBMyov8ySvLRVldA==}

  '@types/node@18.19.75':
    resolution: {integrity: sha512-UIksWtThob6ZVSyxcOqCLOUNg/dyO1Qvx4McgeuhrEtHTLFTf7BBhEazaE4K806FGTPtzd/2sE90qn4fVr7cyw==}

  '@types/node@20.17.17':
    resolution: {integrity: sha512-/WndGO4kIfMicEQLTi/mDANUu/iVUhT7KboZPdEqqHQ4aTS+3qT3U5gIqWDFV+XouorjfgGqvKILJeHhuQgFYg==}

  '@types/qs@6.9.18':
    resolution: {integrity: sha512-kK7dgTYDyGqS+e2Q4aK9X3D7q234CIZ1Bv0q/7Z5IwRDoADNU81xXJK/YVyLbLTZCoIwUoDoffFeF+p/eIklAA==}

  '@types/range-parser@1.2.7':
    resolution: {integrity: sha512-hKormJbkJqzQGhziax5PItDUTMAM9uE2XXQmM37dyd4hVM+5aVl7oVxMVUiVQn2oCQFN/LKCZdvSM0pFRqbSmQ==}

  '@types/retry@0.12.0':
    resolution: {integrity: sha512-wWKOClTTiizcZhXnPY4wikVAwmdYHp8q6DmC+EJUzAMsycb7HB32Kh9RN4+0gExjmPmZSAQjgURXIGATPegAvA==}

  '@types/send@0.17.4':
    resolution: {integrity: sha512-x2EM6TJOybec7c52BX0ZspPodMsQUd5L6PRwOunVyVUhXiBSKf3AezDL8Dgvgt5o0UfKNfuA0eMLr2wLT4AiBA==}

  '@types/serve-static@1.15.7':
    resolution: {integrity: sha512-W8Ym+h8nhuRwaKPaDw34QUkwsGi6Rc4yYqvKFo5rm2FUEhCFbzVWrxXUxuKK8TASjWsysJY0nsmNCGhCOIsrOw==}

  '@types/stack-utils@2.0.3':
    resolution: {integrity: sha512-9aEbYZ3TbYMznPdcdr3SmIrLXwC/AKZXQeCf9Pgao5CKb8CyHuEX5jzWPTkvregvhRJHcpRO6BFoGW9ycaOkYw==}

  '@types/superagent@8.1.9':
    resolution: {integrity: sha512-pTVjI73witn+9ILmoJdajHGW2jkSaOzhiFYF1Rd3EQ94kymLqB9PjD9ISg7WaALC7+dCHT0FGe9T2LktLq/3GQ==}

  '@types/supertest@6.0.2':
    resolution: {integrity: sha512-137ypx2lk/wTQbW6An6safu9hXmajAifU/s7szAHLN/FeIm5w7yR0Wkl9fdJMRSHwOn4HLAI0DaB2TOORuhPDg==}

  '@types/uuid@10.0.0':
    resolution: {integrity: sha512-7gqG38EyHgyP1S+7+xomFtL+ZNHcKv6DwNaCZmJmo1vgMugyF3TCnXVg4t1uk89mLNwnLtnY3TpOpCOyp1/xHQ==}

  '@types/yargs-parser@21.0.3':
    resolution: {integrity: sha512-I4q9QU9MQv4oEOz4tAHJtNz1cwuLxn2F3xcc2iV5WdqLPpUnj30aUuxt1mAxYTG+oe8CZMV/+6rU4S4gRDzqtQ==}

  '@types/yargs@17.0.33':
    resolution: {integrity: sha512-WpxBCKWPLr4xSsHgz511rFJAM+wS28w2zEO1QDNY5zM/S8ok70NNfztH0xwhqKyaK0OHCbN98LDAZuy1ctxDkA==}

  '@typescript-eslint/eslint-plugin@8.24.0':
    resolution: {integrity: sha512-aFcXEJJCI4gUdXgoo/j9udUYIHgF23MFkg09LFz2dzEmU0+1Plk4rQWv/IYKvPHAtlkkGoB3m5e6oUp+JPsNaQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      '@typescript-eslint/parser': ^8.0.0 || ^8.0.0-alpha.0
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/parser@8.24.0':
    resolution: {integrity: sha512-MFDaO9CYiard9j9VepMNa9MTcqVvSny2N4hkY6roquzj8pdCBRENhErrteaQuu7Yjn1ppk0v1/ZF9CG3KIlrTA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/scope-manager@8.24.0':
    resolution: {integrity: sha512-HZIX0UByphEtdVBKaQBgTDdn9z16l4aTUz8e8zPQnyxwHBtf5vtl1L+OhH+m1FGV9DrRmoDuYKqzVrvWDcDozw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@typescript-eslint/type-utils@8.24.0':
    resolution: {integrity: sha512-8fitJudrnY8aq0F1wMiPM1UUgiXQRJ5i8tFjq9kGfRajU+dbPyOuHbl0qRopLEidy0MwqgTHDt6CnSeXanNIwA==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/types@8.24.0':
    resolution: {integrity: sha512-VacJCBTyje7HGAw7xp11q439A+zeGG0p0/p2zsZwpnMzjPB5WteaWqt4g2iysgGFafrqvyLWqq6ZPZAOCoefCw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@typescript-eslint/typescript-estree@8.24.0':
    resolution: {integrity: sha512-ITjYcP0+8kbsvT9bysygfIfb+hBj6koDsu37JZG7xrCiy3fPJyNmfVtaGsgTUSEuTzcvME5YI5uyL5LD1EV5ZQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/utils@8.24.0':
    resolution: {integrity: sha512-07rLuUBElvvEb1ICnafYWr4hk8/U7X9RDCOqd9JcAMtjh/9oRmcfN4yGzbPVirgMR0+HLVHehmu19CWeh7fsmQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <5.8.0'

  '@typescript-eslint/visitor-keys@8.24.0':
    resolution: {integrity: sha512-kArLq83QxGLbuHrTMoOEWO+l2MwsNS2TGISEdx8xgqpkbytB07XmlQyQdNDrCc1ecSqx0cnmhGvpX+VBwqqSkg==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  '@webassemblyjs/ast@1.14.1':
    resolution: {integrity: sha512-nuBEDgQfm1ccRp/8bCQrx1frohyufl4JlbMMZ4P1wpeOfDhF6FQkxZJ1b/e+PLwr6X1Nhw6OLme5usuBWYBvuQ==}

  '@webassemblyjs/floating-point-hex-parser@1.13.2':
    resolution: {integrity: sha512-6oXyTOzbKxGH4steLbLNOu71Oj+C8Lg34n6CqRvqfS2O71BxY6ByfMDRhBytzknj9yGUPVJ1qIKhRlAwO1AovA==}

  '@webassemblyjs/helper-api-error@1.13.2':
    resolution: {integrity: sha512-U56GMYxy4ZQCbDZd6JuvvNV/WFildOjsaWD3Tzzvmw/mas3cXzRJPMjP83JqEsgSbyrmaGjBfDtV7KDXV9UzFQ==}

  '@webassemblyjs/helper-buffer@1.14.1':
    resolution: {integrity: sha512-jyH7wtcHiKssDtFPRB+iQdxlDf96m0E39yb0k5uJVhFGleZFoNw1c4aeIcVUPPbXUVJ94wwnMOAqUHyzoEPVMA==}

  '@webassemblyjs/helper-numbers@1.13.2':
    resolution: {integrity: sha512-FE8aCmS5Q6eQYcV3gI35O4J789wlQA+7JrqTTpJqn5emA4U2hvwJmvFRC0HODS+3Ye6WioDklgd6scJ3+PLnEA==}

  '@webassemblyjs/helper-wasm-bytecode@1.13.2':
    resolution: {integrity: sha512-3QbLKy93F0EAIXLh0ogEVR6rOubA9AoZ+WRYhNbFyuB70j3dRdwH9g+qXhLAO0kiYGlg3TxDV+I4rQTr/YNXkA==}

  '@webassemblyjs/helper-wasm-section@1.14.1':
    resolution: {integrity: sha512-ds5mXEqTJ6oxRoqjhWDU83OgzAYjwsCV8Lo/N+oRsNDmx/ZDpqalmrtgOMkHwxsG0iI//3BwWAErYRHtgn0dZw==}

  '@webassemblyjs/ieee754@1.13.2':
    resolution: {integrity: sha512-4LtOzh58S/5lX4ITKxnAK2USuNEvpdVV9AlgGQb8rJDHaLeHciwG4zlGr0j/SNWlr7x3vO1lDEsuePvtcDNCkw==}

  '@webassemblyjs/leb128@1.13.2':
    resolution: {integrity: sha512-Lde1oNoIdzVzdkNEAWZ1dZ5orIbff80YPdHx20mrHwHrVNNTjNr8E3xz9BdpcGqRQbAEa+fkrCb+fRFTl/6sQw==}

  '@webassemblyjs/utf8@1.13.2':
    resolution: {integrity: sha512-3NQWGjKTASY1xV5m7Hr0iPeXD9+RDobLll3T9d2AO+g3my8xy5peVyjSag4I50mR1bBSN/Ct12lo+R9tJk0NZQ==}

  '@webassemblyjs/wasm-edit@1.14.1':
    resolution: {integrity: sha512-RNJUIQH/J8iA/1NzlE4N7KtyZNHi3w7at7hDjvRNm5rcUXa00z1vRz3glZoULfJ5mpvYhLybmVcwcjGrC1pRrQ==}

  '@webassemblyjs/wasm-gen@1.14.1':
    resolution: {integrity: sha512-AmomSIjP8ZbfGQhumkNvgC33AY7qtMCXnN6bL2u2Js4gVCg8fp735aEiMSBbDR7UQIj90n4wKAFUSEd0QN2Ukg==}

  '@webassemblyjs/wasm-opt@1.14.1':
    resolution: {integrity: sha512-PTcKLUNvBqnY2U6E5bdOQcSM+oVP/PmrDY9NzowJjislEjwP/C4an2303MCVS2Mg9d3AJpIGdUFIQQWbPds0Sw==}

  '@webassemblyjs/wasm-parser@1.14.1':
    resolution: {integrity: sha512-JLBl+KZ0R5qB7mCnud/yyX08jWFw5MsoalJ1pQ4EdFlgj9VdXKGuENGsiCIjegI1W7p91rUlcB/LB5yRJKNTcQ==}

  '@webassemblyjs/wast-printer@1.14.1':
    resolution: {integrity: sha512-kPSSXE6De1XOR820C90RIo2ogvZG+c3KiHzqUoO/F34Y2shGzesfqv7o57xrxovZJH/MetF5UjroJ/R/3isoiw==}

  '@xhmikosr/archive-type@7.0.0':
    resolution: {integrity: sha512-sIm84ZneCOJuiy3PpWR5bxkx3HaNt1pqaN+vncUBZIlPZCq8ASZH+hBVdu5H8znR7qYC6sKwx+ie2Q7qztJTxA==}
    engines: {node: ^14.14.0 || >=16.0.0}

  '@xhmikosr/bin-check@7.0.3':
    resolution: {integrity: sha512-4UnCLCs8DB+itHJVkqFp9Zjg+w/205/J2j2wNBsCEAm/BuBmtua2hhUOdAMQE47b1c7P9Xmddj0p+X1XVsfHsA==}
    engines: {node: '>=18'}

  '@xhmikosr/bin-wrapper@13.0.5':
    resolution: {integrity: sha512-DT2SAuHDeOw0G5bs7wZbQTbf4hd8pJ14tO0i4cWhRkIJfgRdKmMfkDilpaJ8uZyPA0NVRwasCNAmMJcWA67osw==}
    engines: {node: '>=18'}

  '@xhmikosr/decompress-tar@8.0.1':
    resolution: {integrity: sha512-dpEgs0cQKJ2xpIaGSO0hrzz3Kt8TQHYdizHsgDtLorWajuHJqxzot9Hbi0huRxJuAGG2qiHSQkwyvHHQtlE+fg==}
    engines: {node: '>=18'}

  '@xhmikosr/decompress-tarbz2@8.0.2':
    resolution: {integrity: sha512-p5A2r/AVynTQSsF34Pig6olt9CvRj6J5ikIhzUd3b57pUXyFDGtmBstcw+xXza0QFUh93zJsmY3zGeNDlR2AQQ==}
    engines: {node: '>=18'}

  '@xhmikosr/decompress-targz@8.0.1':
    resolution: {integrity: sha512-mvy5AIDIZjQ2IagMI/wvauEiSNHhu/g65qpdM4EVoYHUJBAmkQWqcPJa8Xzi1aKVTmOA5xLJeDk7dqSjlHq8Mg==}
    engines: {node: '>=18'}

  '@xhmikosr/decompress-unzip@7.0.0':
    resolution: {integrity: sha512-GQMpzIpWTsNr6UZbISawsGI0hJ4KA/mz5nFq+cEoPs12UybAqZWKbyIaZZyLbJebKl5FkLpsGBkrplJdjvUoSQ==}
    engines: {node: '>=18'}

  '@xhmikosr/decompress@10.0.1':
    resolution: {integrity: sha512-6uHnEEt5jv9ro0CDzqWlFgPycdE+H+kbJnwyxgZregIMLQ7unQSCNVsYG255FoqU8cP46DyggI7F7LohzEl8Ag==}
    engines: {node: '>=18'}

  '@xhmikosr/downloader@15.0.1':
    resolution: {integrity: sha512-fiuFHf3Dt6pkX8HQrVBsK0uXtkgkVlhrZEh8b7VgoDqFf+zrgFBPyrwCqE/3nDwn3hLeNz+BsrS7q3mu13Lp1g==}
    engines: {node: '>=18'}

  '@xhmikosr/os-filter-obj@3.0.0':
    resolution: {integrity: sha512-siPY6BD5dQ2SZPl3I0OZBHL27ZqZvLEosObsZRQ1NUB8qcxegwt0T9eKtV96JMFQpIz1elhkzqOg4c/Ri6Dp9A==}
    engines: {node: ^14.14.0 || >=16.0.0}

  '@xtuc/ieee754@1.2.0':
    resolution: {integrity: sha512-DX8nKgqcGwsc0eJSqYt5lwP4DH5FlHnmuWWBRy7X0NcaGR0ZtuyeESgMwTYVEtxmsNGY+qit4QYT/MIYTOTPeA==}

  '@xtuc/long@4.2.2':
    resolution: {integrity: sha512-NuHqBY1PB/D8xU6s/thBgOAiAP7HOYDQ32+BFZILJ8ivkUkAHQnWfn6WhL79Owj1qmUnoN/YPhktdIoucipkAQ==}

  abort-controller@3.0.0:
    resolution: {integrity: sha512-h8lQ8tacZYnR3vNQTgibj+tODHI5/+l06Au2Pcriv/Gmet0eaj4TwWH41sO9wnHDiQsEj19q0drzdWdeAHtweg==}
    engines: {node: '>=6.5'}

  accepts@1.3.8:
    resolution: {integrity: sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==}
    engines: {node: '>= 0.6'}

  accepts@2.0.0:
    resolution: {integrity: sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==}
    engines: {node: '>= 0.6'}

  acorn-jsx@5.3.2:
    resolution: {integrity: sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==}
    peerDependencies:
      acorn: ^6.0.0 || ^7.0.0 || ^8.0.0

  acorn-walk@8.3.4:
    resolution: {integrity: sha512-ueEepnujpqee2o5aIYnvHU6C0A42MNdsIDeqy5BydrkuC5R1ZuUFnm27EeFJGoEHJQgn3uleRvmTXaJgfXbt4g==}
    engines: {node: '>=0.4.0'}

  acorn@8.14.0:
    resolution: {integrity: sha512-cl669nCJTZBsL97OF4kUQm5g5hC2uihk0NxY3WENAC0TYdILVkAyHymAntgxGkl7K+t0cXIrH5siy5S4XkFycA==}
    engines: {node: '>=0.4.0'}
    hasBin: true

  agentkeepalive@4.6.0:
    resolution: {integrity: sha512-kja8j7PjmncONqaTsB8fQ+wE2mSU2DJ9D4XKoJ5PFWIdRMa6SLSN1ff4mOr4jCbfRSsxR4keIiySJU0N9T5hIQ==}
    engines: {node: '>= 8.0.0'}

  ajv-formats@2.1.1:
    resolution: {integrity: sha512-Wx0Kx52hxE7C18hkMEggYlEifqWZtYaRgouJor+WMdPnQyEK13vgEWyVNup7SoeeoLMsr4kf5h6dOW11I15MUA==}
    peerDependencies:
      ajv: ^8.0.0
    peerDependenciesMeta:
      ajv:
        optional: true

  ajv-formats@3.0.1:
    resolution: {integrity: sha512-8iUql50EUR+uUcdRQ3HDqa6EVyo3docL8g5WJ3FNcWmu62IbkGUue/pEyLBW8VGKKucTPgqeks4fIU1DA4yowQ==}
    peerDependencies:
      ajv: ^8.0.0
    peerDependenciesMeta:
      ajv:
        optional: true

  ajv-keywords@3.5.2:
    resolution: {integrity: sha512-5p6WTN0DdTGVQk6VjcEju19IgaHudalcfabD7yhDGeA6bcQnmL+CpveLJq/3hvfwd1aof6L386Ougkx6RfyMIQ==}
    peerDependencies:
      ajv: ^6.9.1

  ajv-keywords@5.1.0:
    resolution: {integrity: sha512-YCS/JNFAUyr5vAuhk1DWm1CBxRHW9LbJ2ozWeemrIqpbsqKjHVxYPyi5GC0rjZIT5JxJ3virVTS8wk4i/Z+krw==}
    peerDependencies:
      ajv: ^8.8.2

  ajv@6.12.6:
    resolution: {integrity: sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==}

  ajv@8.17.1:
    resolution: {integrity: sha512-B/gBuNg5SiMTrPkC+A2+cW0RszwxYmn6VYxB/inlBStS5nx6xHIt/ehKRhIMhqusl7a8LjQoZnjCs5vhwxOQ1g==}

  ansi-colors@4.1.3:
    resolution: {integrity: sha512-/6w/C21Pm1A7aZitlI5Ni/2J6FFQN8i1Cvz3kHABAAbw93v/NlvKdVOqz7CCWz/3iv/JplRSEEZ83XION15ovw==}
    engines: {node: '>=6'}

  ansi-escapes@4.3.2:
    resolution: {integrity: sha512-gKXj5ALrKWQLsYG9jlTRmR/xKluxHV+Z9QEwNIgCfM1/uwPMCuzVVnh5mwTd+OuBZcwSIMbqssNWRm1lE51QaQ==}
    engines: {node: '>=8'}

  ansi-regex@5.0.1:
    resolution: {integrity: sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==}
    engines: {node: '>=8'}

  ansi-regex@6.1.0:
    resolution: {integrity: sha512-7HSX4QQb4CspciLpVFwyRe79O3xsIZDDLER21kERQ71oaPodF8jL725AgJMFAYbooIqolJoRLuM81SpeUkpkvA==}
    engines: {node: '>=12'}

  ansi-styles@4.3.0:
    resolution: {integrity: sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==}
    engines: {node: '>=8'}

  ansi-styles@5.2.0:
    resolution: {integrity: sha512-Cxwpt2SfTzTtXcfOlzGEee8O+c+MmUgGrNiBcXnuWxuFJHe6a5Hz7qwhwe5OgaSYI0IJvkLqWX1ASG+cJOkEiA==}
    engines: {node: '>=10'}

  ansi-styles@6.2.1:
    resolution: {integrity: sha512-bN798gFfQX+viw3R7yrGWRqnrN2oRkEkUjjl4JNn4E8GxxbjtG3FbrEIIY3l8/hrwUwIeCZvi4QuOTP4MErVug==}
    engines: {node: '>=12'}

  ansis@3.9.0:
    resolution: {integrity: sha512-PcDrVe15ldexeZMsVLBAzBwF2KhZgaU0R+CHxH+x5kqn/pO+UWVBZJ+NEXMPpEOLUFeNsnNdoWYc2gwO+MVkDg==}
    engines: {node: '>=16'}

  anymatch@3.1.3:
    resolution: {integrity: sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw==}
    engines: {node: '>= 8'}

  append-field@1.0.0:
    resolution: {integrity: sha512-klpgFSWLW1ZEs8svjfb7g4qWY0YS5imI82dTg+QahUvJ8YqAY0P10Uk8tTyh9ZGuYEZEMaeJYCF5BFuX552hsw==}

  arch@3.0.0:
    resolution: {integrity: sha512-AmIAC+Wtm2AU8lGfTtHsw0Y9Qtftx2YXEEtiBP10xFUtMOA+sHHx6OAddyL52mUKh1vsXQ6/w1mVDptZCyUt4Q==}

  arg@4.1.3:
    resolution: {integrity: sha512-58S9QDqG0Xx27YwPSt9fJxivjYl432YCwfDMfZ+71RAqUrZef7LrKQZ3LHLOwCS4FLNBplP533Zx895SeOCHvA==}

  argparse@1.0.10:
    resolution: {integrity: sha512-o5Roy6tNG4SL/FOkCAN6RzjiakZS25RLYFrcMttJqbdd8BWrnA+fGz57iN5Pb06pvBGvl5gQ0B48dJlslXvoTg==}

  argparse@2.0.1:
    resolution: {integrity: sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==}

  array-timsort@1.0.3:
    resolution: {integrity: sha512-/+3GRL7dDAGEfM6TseQk/U+mi18TU2Ms9I3UlLdUMhz2hbvGNTKdj9xniwXfUqgYhHxRx0+8UnKkvlNwVU+cWQ==}

  asap@2.0.6:
    resolution: {integrity: sha512-BSHWgDSAiKs50o2Re8ppvp3seVHXSRM44cdSsT9FfNEUUZLOGWVCsiWaRPWM1Znn+mqZ1OfVZ3z3DWEzSp7hRA==}

  async@3.2.6:
    resolution: {integrity: sha512-htCUDlxyyCLMgaM3xXg0C0LW2xqfuQ6p05pCEIsXuyQ+a1koYKTuBMzRNwmybfLgvJDMd0r1LTn4+E0Ti6C2AA==}

  asynckit@0.4.0:
    resolution: {integrity: sha512-Oei9OH4tRh0YqU3GxhX79dM/mwVgvbZJaSNaRk+bshkj0S5cfHcgYakreBjrHwatXKbz+IoIdYLxrKim2MjW0Q==}

  b4a@1.6.7:
    resolution: {integrity: sha512-OnAYlL5b7LEkALw87fUVafQw5rVR9RjwGd4KUwNQ6DrrNmaVaUCgLipfVlzrPQ4tWOR9P0IXGNOx50jYCCdSJg==}

  babel-jest@29.7.0:
    resolution: {integrity: sha512-BrvGY3xZSwEcCzKvKsCi2GgHqDqsYkOP4/by5xCgIwGXQxIEh+8ew3gmrE1y7XRR6LHZIj6yLYnUi/mm2KXKBg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    peerDependencies:
      '@babel/core': ^7.8.0

  babel-plugin-istanbul@6.1.1:
    resolution: {integrity: sha512-Y1IQok9821cC9onCx5otgFfRm7Lm+I+wwxOx738M/WLPZ9Q42m4IG5W0FNX8WLL2gYMZo3JkuXIH2DOpWM+qwA==}
    engines: {node: '>=8'}

  babel-plugin-jest-hoist@29.6.3:
    resolution: {integrity: sha512-ESAc/RJvGTFEzRwOTT4+lNDk/GNHMkKbNzsvT0qKRfDyyYTskxB5rnU2njIDYVxXCBHHEI1c0YwHob3WaYujOg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  babel-preset-current-node-syntax@1.1.0:
    resolution: {integrity: sha512-ldYss8SbBlWva1bs28q78Ju5Zq1F+8BrqBZZ0VFhLBvhh6lCpC2o3gDJi/5DRLs9FgYZCnmPYIVFU4lRXCkyUw==}
    peerDependencies:
      '@babel/core': ^7.0.0

  babel-preset-jest@29.6.3:
    resolution: {integrity: sha512-0B3bhxR6snWXJZtR/RliHTDPRgn1sNHOR0yVtq/IiQFyuOVjFS+wuio/R4gSNkyYmKmJB4wGZv2NZanmKmTnNA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    peerDependencies:
      '@babel/core': ^7.0.0

  balanced-match@1.0.2:
    resolution: {integrity: sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==}

  bare-events@2.5.4:
    resolution: {integrity: sha512-+gFfDkR8pj4/TrWCGUGWmJIkBwuxPS5F+a5yWjOHQt2hHvNZd5YLzadjmDUtFmMM4y429bnKLa8bYBMHcYdnQA==}

  base-64@0.1.0:
    resolution: {integrity: sha512-Y5gU45svrR5tI2Vt/X9GPd3L0HNIKzGu202EjxrXMpuc2V2CiKgemAbUUsqYmZJvPtCXoUKjNZwBJzsNScUbXA==}

  base64-js@1.5.1:
    resolution: {integrity: sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==}

  base64id@2.0.0:
    resolution: {integrity: sha512-lGe34o6EHj9y3Kts9R4ZYs/Gr+6N7MCaMlIFA3F1R2O5/m7K06AxfSeO5530PEERE6/WyEg3lsuyw4GHlPZHog==}
    engines: {node: ^4.5.0 || >= 5.9}

  bin-version-check@5.1.0:
    resolution: {integrity: sha512-bYsvMqJ8yNGILLz1KP9zKLzQ6YpljV3ln1gqhuLkUtyfGi3qXKGuK2p+U4NAvjVFzDFiBBtOpCOSFNuYYEGZ5g==}
    engines: {node: '>=12'}

  bin-version@6.0.0:
    resolution: {integrity: sha512-nk5wEsP4RiKjG+vF+uG8lFsEn4d7Y6FVDamzzftSunXOoOcOOkzcWdKVlGgFFwlUQCj63SgnUkLLGF8v7lufhw==}
    engines: {node: '>=12'}

  binary-extensions@2.3.0:
    resolution: {integrity: sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw==}
    engines: {node: '>=8'}

  binary-search@1.3.6:
    resolution: {integrity: sha512-nbE1WxOTTrUWIfsfZ4aHGYu5DOuNkbxGokjV6Z2kxfJK3uaAb8zNK1muzOeipoLHZjInT4Br88BHpzevc681xA==}

  bl@4.1.0:
    resolution: {integrity: sha512-1W07cM9gS6DcLperZfFSj+bWLtaPGSOHWhPiGzXmvVJbRLdG82sH/Kn8EtW1VqWVA54AKf2h5k5BbnIbwF3h6w==}

  body-parser@2.1.0:
    resolution: {integrity: sha512-/hPxh61E+ll0Ujp24Ilm64cykicul1ypfwjVttduAiEdtnJFvLePSrIPk+HMImtNv5270wOGCb1Tns2rybMkoQ==}
    engines: {node: '>=18'}

  boolbase@1.0.0:
    resolution: {integrity: sha512-JZOSA7Mo9sNGB8+UjSgzdLtokWAky1zbztM3WRLCbZ70/3cTANmQmOdR7y2g+J0e2WXywy1yS468tY+IruqEww==}

  brace-expansion@1.1.11:
    resolution: {integrity: sha512-iCuPHDFgrHX7H2vEI/5xpz07zSHB00TpugqhmYtVmMO6518mCuRMoOYFldEBl0g187ufozdaHgWKcYFb61qGiA==}

  brace-expansion@2.0.1:
    resolution: {integrity: sha512-XnAIvQ8eM+kC6aULx6wuQiwVsnzsi9d3WxzV3FpWTGA19F621kwdbsAcFKXgKUHZWsy+mY6iL1sHTxWEFCytDA==}

  braces@3.0.3:
    resolution: {integrity: sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==}
    engines: {node: '>=8'}

  browserslist@4.24.4:
    resolution: {integrity: sha512-KDi1Ny1gSePi1vm0q4oxSF8b4DR44GF4BbmS2YdhPLOEqd8pDviZOGH/GsmRwoWJ2+5Lr085X7naowMwKHDG1A==}
    engines: {node: ^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7}
    hasBin: true

  bs-logger@0.2.6:
    resolution: {integrity: sha512-pd8DCoxmbgc7hyPKOvxtqNcjYoOsABPQdcCUjGp3d42VR2CX1ORhk2A87oqqu5R1kk+76nsxZupkmyd+MVtCog==}
    engines: {node: '>= 6'}

  bser@2.1.1:
    resolution: {integrity: sha512-gQxTNE/GAfIIrmHLUE3oJyp5FO6HRBfhjnw4/wMmA63ZGDJnWBmgY/lyQBpnDUkGmAhbSe39tx2d/iTOAfglwQ==}

  buffer-crc32@0.2.13:
    resolution: {integrity: sha512-VO9Ht/+p3SN7SKWqcrgEzjGbRSJYTx+Q1pTQC0wrWqHx0vpJraQ6GtHx8tvcg1rlK1byhU5gccxgOgj7B0TDkQ==}

  buffer-from@1.1.2:
    resolution: {integrity: sha512-E+XQCRwSbaaiChtv6k6Dwgc+bx+Bs6vuKJHHl5kox/BaKbhiXzqQOwK4cO22yElGp2OCmjwVhT3HmxgyPGnJfQ==}

  buffer@5.7.1:
    resolution: {integrity: sha512-EHcyIPBQ4BSGlvjB16k5KgAJ27CIsHY/2JBmCRReo48y9rQ3MaUzWX3KVlBa4U7MyX02HdVj0K7C3WaB3ju7FQ==}

  busboy@1.6.0:
    resolution: {integrity: sha512-8SFQbg/0hQ9xy3UNTB0YEnsNBbWfhf7RtnzpL7TkBiTBRfrQ9Fxcnz7VJsleJpyp6rVLvXiuORqjlHi5q+PYuA==}
    engines: {node: '>=10.16.0'}

  bytes@3.1.2:
    resolution: {integrity: sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==}
    engines: {node: '>= 0.8'}

  cacheable-lookup@7.0.0:
    resolution: {integrity: sha512-+qJyx4xiKra8mZrcwhjMRMUhD5NR1R8esPkzIYxX96JiecFoxAXFuz/GpR3+ev4PE1WamHip78wV0vcmPQtp8w==}
    engines: {node: '>=14.16'}

  cacheable-request@10.2.14:
    resolution: {integrity: sha512-zkDT5WAF4hSSoUgyfg5tFIxz8XQK+25W/TLVojJTMKBaxevLBBtLxgqguAuVQB8PVW79FVjHcU+GJ9tVbDZ9mQ==}
    engines: {node: '>=14.16'}

  call-bind-apply-helpers@1.0.1:
    resolution: {integrity: sha512-BhYE+WDaywFg2TBWYNXAE+8B1ATnThNBqXHP5nQu0jWJdVvY2hvkpyB3qOmtmDePiS5/BDQ8wASEWGMWRG148g==}
    engines: {node: '>= 0.4'}

  call-bound@1.0.3:
    resolution: {integrity: sha512-YTd+6wGlNlPxSuri7Y6X8tY2dmm12UMH66RpKMhiX6rsk5wXXnYgbUcOt8kiS31/AjfoTOvCsE+w8nZQLQnzHA==}
    engines: {node: '>= 0.4'}

  callsites@3.1.0:
    resolution: {integrity: sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==}
    engines: {node: '>=6'}

  camelcase@5.3.1:
    resolution: {integrity: sha512-L28STB170nwWS63UjtlEOE3dldQApaJXZkOI1uMFfzf3rRuPegHaHesyee+YxQ+W6SvRDQV6UrdOdRiR153wJg==}
    engines: {node: '>=6'}

  camelcase@6.3.0:
    resolution: {integrity: sha512-Gmy6FhYlCY7uOElZUSbxo2UCDH8owEk996gkbrpsgGtrJLM3J7jGxl9Ic7Qwwj4ivOE5AWZWRMecDdF7hqGjFA==}
    engines: {node: '>=10'}

  caniuse-lite@1.0.30001699:
    resolution: {integrity: sha512-b+uH5BakXZ9Do9iK+CkDmctUSEqZl+SP056vc5usa0PL+ev5OHw003rZXcnjNDv3L8P5j6rwT6C0BPKSikW08w==}

  chalk@4.1.2:
    resolution: {integrity: sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==}
    engines: {node: '>=10'}

  char-regex@1.0.2:
    resolution: {integrity: sha512-kWWXztvZ5SBQV+eRgKFeh8q5sLuZY2+8WUIzlxWVTg+oGwY14qylx1KbKzHd8P6ZYkAg0xyIDU9JMHhyJMZ1jw==}
    engines: {node: '>=10'}

  chardet@0.7.0:
    resolution: {integrity: sha512-mT8iDcrh03qDGRRmoA2hmBJnxpllMR+0/0qlzjqZES6NdiWDcZkCNAk4rPFZ9Q85r27unkiNNg8ZOiwZXBHwcA==}

  charenc@0.0.2:
    resolution: {integrity: sha512-yrLQ/yVUFXkzg7EDQsPieE/53+0RlaWTs+wBrvW36cyilJ2SaDWfl4Yj7MtLTXleV9uEKefbAGUPv2/iWSooRA==}

  cheerio-select@2.1.0:
    resolution: {integrity: sha512-9v9kG0LvzrlcungtnJtpGNxY+fzECQKhK4EGJX2vByejiMX84MFNQw4UxPJl3bFbTMw+Dfs37XaIkCwTZfLh4g==}

  cheerio@1.0.0:
    resolution: {integrity: sha512-quS9HgjQpdaXOvsZz82Oz7uxtXiy6UIsIQcpBj7HRw2M63Skasm9qlDocAM7jNuaxdhpPU7c4kJN+gA5MCu4ww==}
    engines: {node: '>=18.17'}

  chokidar@3.6.0:
    resolution: {integrity: sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw==}
    engines: {node: '>= 8.10.0'}

  chokidar@4.0.3:
    resolution: {integrity: sha512-Qgzu8kfBvo+cA4962jnP1KkS6Dop5NS6g7R5LFYJr4b8Ub94PPQXUksCw9PvXoeXPRRddRNC5C1JQUR2SMGtnA==}
    engines: {node: '>= 14.16.0'}

  chrome-trace-event@1.0.4:
    resolution: {integrity: sha512-rNjApaLzuwaOTjCiT8lSDdGN1APCiqkChLMJxJPWLunPAt5fy8xgU9/jNOchV84wfIxrA0lRQB7oCT8jrn/wrQ==}
    engines: {node: '>=6.0'}

  ci-info@3.9.0:
    resolution: {integrity: sha512-NIxF55hv4nSqQswkAeiOi1r83xy8JldOFDTWiug55KBu9Jnblncd2U6ViHmYgHf01TPZS77NJBhBMKdWj9HQMQ==}
    engines: {node: '>=8'}

  cjs-module-lexer@1.4.3:
    resolution: {integrity: sha512-9z8TZaGM1pfswYeXrUpzPrkx8UnWYdhJclsiYMm6x/w5+nN+8Tf/LnAgfLGQCm59qAOxU8WwHEq2vNwF6i4j+Q==}

  cli-cursor@3.1.0:
    resolution: {integrity: sha512-I/zHAwsKf9FqGoXM4WWRACob9+SNukZTd94DWF57E4toouRulbCxcUh6RKUEOQlYTHJnzkPMySvPNaaSLNfLZw==}
    engines: {node: '>=8'}

  cli-spinners@2.9.2:
    resolution: {integrity: sha512-ywqV+5MmyL4E7ybXgKys4DugZbX0FC6LnwrhjuykIjnK9k8OQacQ7axGKnjDXWNhns0xot3bZI5h55H8yo9cJg==}
    engines: {node: '>=6'}

  cli-table3@0.6.5:
    resolution: {integrity: sha512-+W/5efTR7y5HRD7gACw9yQjqMVvEMLBHmboM/kPWam+H+Hmyrgjh6YncVKK122YZkXrLudzTuAukUw9FnMf7IQ==}
    engines: {node: 10.* || >= 12.*}

  cli-width@4.1.0:
    resolution: {integrity: sha512-ouuZd4/dm2Sw5Gmqy6bGyNNNe1qt9RpmxveLSO7KcgsTnU7RXfsw+/bukWGo1abgBiMAic068rclZsO4IWmmxQ==}
    engines: {node: '>= 12'}

  cliui@8.0.1:
    resolution: {integrity: sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==}
    engines: {node: '>=12'}

  clone@1.0.4:
    resolution: {integrity: sha512-JQHZ2QMW6l3aH/j6xCqQThY/9OH4D/9ls34cgkUBiEeocRTU04tHfKPBsUK1PqZCUQM7GiA0IIXJSuXHI64Kbg==}
    engines: {node: '>=0.8'}

  co@4.6.0:
    resolution: {integrity: sha512-QVb0dM5HvG+uaxitm8wONl7jltx8dqhfU33DcqtOZcLSVIKSDDLDi7+0LbAKiyI8hD9u42m2YxXSkMGWThaecQ==}
    engines: {iojs: '>= 1.0.0', node: '>= 0.12.0'}

  collect-v8-coverage@1.0.2:
    resolution: {integrity: sha512-lHl4d5/ONEbLlJvaJNtsF/Lz+WvB07u2ycqTYbdrq7UypDXailES4valYb2eWiJFxZlVmpGekfqoxQhzyFdT4Q==}

  color-convert@2.0.1:
    resolution: {integrity: sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==}
    engines: {node: '>=7.0.0'}

  color-name@1.1.4:
    resolution: {integrity: sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==}

  combined-stream@1.0.8:
    resolution: {integrity: sha512-FQN4MRfuJeHf7cBbBMJFXhKSDq+2kAArBlmRBvcvFE5BB1HZKXtSFASDhdlz9zOYwxh8lDdnvmMOe/+5cdoEdg==}
    engines: {node: '>= 0.8'}

  commander@10.0.1:
    resolution: {integrity: sha512-y4Mg2tXshplEbSGzx7amzPwKKOCGuoSRP/CjEdwwk0FOGlUbq6lKuoyDZTNZkmxHdJtp54hdfY/JUrdL7Xfdug==}
    engines: {node: '>=14'}

  commander@2.20.3:
    resolution: {integrity: sha512-GpVkmM8vF2vQUkj2LvZmD35JxeJOLCwJ9cUkugyk2nuhbv3+mJvpLYYt+0+USMxE+oj+ey/lJEnhZw75x/OMcQ==}

  commander@4.1.1:
    resolution: {integrity: sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA==}
    engines: {node: '>= 6'}

  commander@6.2.1:
    resolution: {integrity: sha512-U7VdrJFnJgo4xjrHpTzu0yrHPGImdsmD95ZlgYSEajAn2JKzDhDTPG9kBTefmObL2w/ngeZnilk+OV9CG3d7UA==}
    engines: {node: '>= 6'}

  commander@8.3.0:
    resolution: {integrity: sha512-OkTL9umf+He2DZkUq8f8J9of7yL6RJKI24dVITBmNfZBmri9zYZQrKkuXiKhyfPSu8tUhnVBB1iKXevvnlR4Ww==}
    engines: {node: '>= 12'}

  comment-json@4.2.5:
    resolution: {integrity: sha512-bKw/r35jR3HGt5PEPm1ljsQQGyCrR8sFGNiN5L+ykDHdpO8Smxkrkla9Yi6NkQyUrb8V54PGhfMs6NrIwtxtdw==}
    engines: {node: '>= 6'}

  component-emitter@1.3.1:
    resolution: {integrity: sha512-T0+barUSQRTUQASh8bx02dl+DhF54GtIDY13Y3m9oWTklKbb3Wv974meRpeZ3lp1JpLVECWWNHC4vaG2XHXouQ==}

  concat-map@0.0.1:
    resolution: {integrity: sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==}

  concat-stream@1.6.2:
    resolution: {integrity: sha512-27HBghJxjiZtIk3Ycvn/4kbJk/1uZuJFfuPEns6LaEvpvG1f0hTea8lilrouyo9mVc2GWdcEZ8OLoGmSADlrCw==}
    engines: {'0': node >= 0.8}

  consola@3.4.0:
    resolution: {integrity: sha512-EiPU8G6dQG0GFHNR8ljnZFki/8a+cQwEQ+7wpxdChl02Q8HXlwEZWD5lqAF8vC2sEC3Tehr8hy7vErz88LHyUA==}
    engines: {node: ^14.18.0 || >=16.10.0}

  console-table-printer@2.12.1:
    resolution: {integrity: sha512-wKGOQRRvdnd89pCeH96e2Fn4wkbenSP6LMHfjfyNLMbGuHEFbMqQNuxXqd0oXG9caIOQ1FTvc5Uijp9/4jujnQ==}

  content-disposition@0.5.4:
    resolution: {integrity: sha512-FveZTNuGw04cxlAiWbzi6zTAL/lhehaWbTtgluJh4/E95DqMwTmha3KZN1aAWA8cFIhHzMZUvLevkw5Rqk+tSQ==}
    engines: {node: '>= 0.6'}

  content-disposition@1.0.0:
    resolution: {integrity: sha512-Au9nRL8VNUut/XSzbQA38+M78dzP4D+eqg3gfJHMIHHYa3bg067xj1KxMUWj+VULbiZMowKngFFbKczUrNJ1mg==}
    engines: {node: '>= 0.6'}

  content-type@1.0.5:
    resolution: {integrity: sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==}
    engines: {node: '>= 0.6'}

  convert-source-map@2.0.0:
    resolution: {integrity: sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==}

  cookie-signature@1.2.2:
    resolution: {integrity: sha512-D76uU73ulSXrD1UXF4KE2TMxVVwhsnCgfAyTg9k8P6KGZjlXKrOLe4dJQKI3Bxi5wjesZoFXJWElNWBjPZMbhg==}
    engines: {node: '>=6.6.0'}

  cookie@0.7.1:
    resolution: {integrity: sha512-6DnInpx7SJ2AK3+CTUE/ZM0vWTUboZCegxhC2xiIydHR9jNuTAASBrfEpHhiGOZw/nX51bHt6YQl8jsGo4y/0w==}
    engines: {node: '>= 0.6'}

  cookie@0.7.2:
    resolution: {integrity: sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==}
    engines: {node: '>= 0.6'}

  cookiejar@2.1.4:
    resolution: {integrity: sha512-LDx6oHrK+PhzLKJU9j5S7/Y3jM/mUHvD/DeI1WQmJn652iPC5Y4TBzC9l+5OMOXlyTTA+SmVUPm0HQUwpD5Jqw==}

  core-util-is@1.0.3:
    resolution: {integrity: sha512-ZQBvi1DcpJ4GDqanjucZ2Hj3wEO5pZDS89BWbkcrvdxksJorwUDDZamX9ldFkp9aw2lmBDLgkObEA4DWNJ9FYQ==}

  cors@2.8.5:
    resolution: {integrity: sha512-KIHbLJqu73RGr/hnbrO9uBeixNGuvSQjul/jdFvS/KFSIH1hWVd1ng7zOHx+YrEfInLG7q4n6GHQ9cDtxv/P6g==}
    engines: {node: '>= 0.10'}

  cosmiconfig@8.3.6:
    resolution: {integrity: sha512-kcZ6+W5QzcJ3P1Mt+83OUv/oHFqZHIx8DuxG6eZ5RGMERoLqp4BuGjhHLYGK+Kf5XVkQvqBSmAy/nGWN3qDgEA==}
    engines: {node: '>=14'}
    peerDependencies:
      typescript: '>=4.9.5'
    peerDependenciesMeta:
      typescript:
        optional: true

  create-jest@29.7.0:
    resolution: {integrity: sha512-Adz2bdH0Vq3F53KEMJOoftQFutWCukm6J24wbPWRO4k1kMY7gS7ds/uoJkNuV8wDCtWWnuwGcJwpWcih+zEW1Q==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    hasBin: true

  create-require@1.1.1:
    resolution: {integrity: sha512-dcKFX3jn0MpIaXjisoRvexIJVEKzaq7z2rZKxf+MSr9TkdmHmsU4m2lcLojrj/FHl8mk5VxMmYA+ftRkP/3oKQ==}

  cross-spawn@7.0.6:
    resolution: {integrity: sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==}
    engines: {node: '>= 8'}

  crypt@0.0.2:
    resolution: {integrity: sha512-mCxBlsHFYh9C+HVpiEacem8FEBnMXgU9gy4zmNC+SXAZNB/1idgp/aulFJ4FgCi7GPEVbfyng092GqL2k2rmow==}

  css-select@5.1.0:
    resolution: {integrity: sha512-nwoRF1rvRRnnCqqY7updORDsuqKzqYJ28+oSMaJMMgOauh3fvwHqMS7EZpIPqK8GL+g9mKxF1vP/ZjSeNjEVHg==}

  css-what@6.1.0:
    resolution: {integrity: sha512-HTUrgRJ7r4dsZKU6GjmpfRK1O76h97Z8MfS1G0FozR+oF2kG6Vfe8JE6zwrkbxigziPHinCJ+gCPjA9EaBDtRw==}
    engines: {node: '>= 6'}

  debug@2.6.9:
    resolution: {integrity: sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@4.3.6:
    resolution: {integrity: sha512-O/09Bd4Z1fBrU4VzkhFqVgpPzaGbw6Sm9FEkBT1A/YBXQFGuuSxa1dN2nxgxS34JmKXqYx8CZAwEVoJFImUXIg==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  debug@4.4.0:
    resolution: {integrity: sha512-6WTZ/IxCY/T6BALoZHaE4ctp9xm+Z5kY/pzYaCHRFeyVhojxlrm+46y68HA6hr0TcwEssoxNiDEUJQjfPZ/RYA==}
    engines: {node: '>=6.0'}
    peerDependencies:
      supports-color: '*'
    peerDependenciesMeta:
      supports-color:
        optional: true

  decamelize@1.2.0:
    resolution: {integrity: sha512-z2S+W9X73hAUUki+N+9Za2lBlun89zigOyGrsax+KUQ6wKW4ZoWpEYBkGhQjwAjjDCkWxhY0VKEhk8wzY7F5cA==}
    engines: {node: '>=0.10.0'}

  decompress-response@6.0.0:
    resolution: {integrity: sha512-aW35yZM6Bb/4oJlZncMH2LCoZtJXTRxES17vE3hoRiowU2kWHaJKFkSBDnDR+cm9J+9QhXmREyIfv0pji9ejCQ==}
    engines: {node: '>=10'}

  dedent@1.5.3:
    resolution: {integrity: sha512-NHQtfOOW68WD8lgypbLA5oT+Bt0xXJhiYvoR6SmmNXZfpzOGXwdKWmcwG8N7PwVVWV3eF/68nmD9BaJSsTBhyQ==}
    peerDependencies:
      babel-plugin-macros: ^3.1.0
    peerDependenciesMeta:
      babel-plugin-macros:
        optional: true

  deep-is@0.1.4:
    resolution: {integrity: sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==}

  deepmerge@4.3.1:
    resolution: {integrity: sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==}
    engines: {node: '>=0.10.0'}

  defaults@1.0.4:
    resolution: {integrity: sha512-eFuaLoy/Rxalv2kr+lqMlUnrDWV+3j4pljOIJgLIhI058IQfWJ7vXhyEIHu+HtC738klGALYxOKDO0bQP3tg8A==}

  defaults@3.0.0:
    resolution: {integrity: sha512-RsqXDEAALjfRTro+IFNKpcPCt0/Cy2FqHSIlnomiJp9YGadpQnrtbRpSgN2+np21qHcIKiva4fiOQGjS9/qR/A==}
    engines: {node: '>=18'}

  defer-to-connect@2.0.1:
    resolution: {integrity: sha512-4tvttepXG1VaYGrRibk5EwJd1t4udunSOVMdLSAL6mId1ix438oPwPZMALY41FCijukO1L0twNcGsdzS7dHgDg==}
    engines: {node: '>=10'}

  delayed-stream@1.0.0:
    resolution: {integrity: sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ==}
    engines: {node: '>=0.4.0'}

  depd@2.0.0:
    resolution: {integrity: sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==}
    engines: {node: '>= 0.8'}

  destroy@1.2.0:
    resolution: {integrity: sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==}
    engines: {node: '>= 0.8', npm: 1.2.8000 || >= 1.4.16}

  detect-newline@3.1.0:
    resolution: {integrity: sha512-TLz+x/vEXm/Y7P7wn1EJFNLxYpUD4TgMosxY6fAVJUnJMbupHBOncxyWUG9OpTaH9EBD7uFI5LfEgmMOc54DsA==}
    engines: {node: '>=8'}

  dezalgo@1.0.4:
    resolution: {integrity: sha512-rXSP0bf+5n0Qonsb+SVVfNfIsimO4HEtmnIpPHY8Q1UCzKlQrDMfdobr8nJOOsRgWCyMRqeSBQzmWUMq7zvVig==}

  diff-sequences@29.6.3:
    resolution: {integrity: sha512-EjePK1srD3P08o2j4f0ExnylqRs5B9tJjcp9t1krH2qRi8CCdsYfwe9JgSLurFBWwq4uOlipzfk5fHNvwFKr8Q==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  diff@4.0.2:
    resolution: {integrity: sha512-58lmxKSA4BNyLz+HHMUzlOEpg09FV+ev6ZMe3vJihgdxzgcwZ8VoEEPmALCZG9LmqfVoNMMKpttIYTVG6uDY7A==}
    engines: {node: '>=0.3.1'}

  digest-fetch@1.3.0:
    resolution: {integrity: sha512-CGJuv6iKNM7QyZlM2T3sPAdZWd/p9zQiRNS9G+9COUCwzWFTs0Xp8NF5iePx7wtvhDykReiRRrSeNb4oMmB8lA==}

  dom-serializer@2.0.0:
    resolution: {integrity: sha512-wIkAryiqt/nV5EQKqQpo3SToSOV9J0DnbJqwK7Wv/Trc92zIAYZ4FlMu+JPFW1DfGFt81ZTCGgDEabffXeLyJg==}

  domelementtype@2.3.0:
    resolution: {integrity: sha512-OLETBj6w0OsagBwdXnPdN0cnMfF9opN69co+7ZrbfPGrdpPVNBUj02spi6B1N7wChLQiPn4CSH/zJvXw56gmHw==}

  domhandler@5.0.3:
    resolution: {integrity: sha512-cgwlv/1iFQiFnU96XXgROh8xTeetsnJiDsTc7TYCLFd9+/WNkIqPTxiM/8pSd8VIrhXGTf1Ny1q1hquVqDJB5w==}
    engines: {node: '>= 4'}

  domutils@3.2.2:
    resolution: {integrity: sha512-6kZKyUajlDuqlHKVX1w7gyslj9MPIXzIFiz/rGu35uC1wMi+kMhQwGhl4lt9unC9Vb9INnY9Z3/ZA3+FhASLaw==}

  dotenv-expand@12.0.1:
    resolution: {integrity: sha512-LaKRbou8gt0RNID/9RoI+J2rvXsBRPMV7p+ElHlPhcSARbCPDYcYG2s1TIzAfWv4YSgyY5taidWzzs31lNV3yQ==}
    engines: {node: '>=12'}

  dotenv@16.4.7:
    resolution: {integrity: sha512-47qPchRCykZC03FhkYAhrvwU4xDBFIj1QPqaarj6mdM/hgUzfPHcpkHJOn3mJAufFeeAxAzeGsr5X0M4k6fLZQ==}
    engines: {node: '>=12'}

  drizzle-orm@0.29.5:
    resolution: {integrity: sha512-jS3+uyzTz4P0Y2CICx8FmRQ1eplURPaIMWDn/yq6k4ShRFj9V7vlJk67lSf2kyYPzQ60GkkNGXcJcwrxZ6QCRw==}
    peerDependencies:
      '@aws-sdk/client-rds-data': '>=3'
      '@cloudflare/workers-types': '>=3'
      '@libsql/client': '*'
      '@neondatabase/serverless': '>=0.1'
      '@opentelemetry/api': ^1.4.1
      '@planetscale/database': '>=1'
      '@types/better-sqlite3': '*'
      '@types/pg': '*'
      '@types/react': '>=18'
      '@types/sql.js': '*'
      '@vercel/postgres': '*'
      better-sqlite3: '>=7'
      bun-types: '*'
      expo-sqlite: '>=13.2.0'
      knex: '*'
      kysely: '*'
      mysql2: '>=2'
      pg: '>=8'
      postgres: '>=3'
      react: '>=18'
      sql.js: '>=1'
      sqlite3: '>=5'
    peerDependenciesMeta:
      '@aws-sdk/client-rds-data':
        optional: true
      '@cloudflare/workers-types':
        optional: true
      '@libsql/client':
        optional: true
      '@neondatabase/serverless':
        optional: true
      '@opentelemetry/api':
        optional: true
      '@planetscale/database':
        optional: true
      '@types/better-sqlite3':
        optional: true
      '@types/pg':
        optional: true
      '@types/react':
        optional: true
      '@types/sql.js':
        optional: true
      '@vercel/postgres':
        optional: true
      better-sqlite3:
        optional: true
      bun-types:
        optional: true
      expo-sqlite:
        optional: true
      knex:
        optional: true
      kysely:
        optional: true
      mysql2:
        optional: true
      pg:
        optional: true
      postgres:
        optional: true
      react:
        optional: true
      sql.js:
        optional: true
      sqlite3:
        optional: true

  dunder-proto@1.0.1:
    resolution: {integrity: sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==}
    engines: {node: '>= 0.4'}

  eastasianwidth@0.2.0:
    resolution: {integrity: sha512-I88TYZWc9XiYHRQ4/3c5rjjfgkjhLyW2luGIheGERbNQ6OY7yTybanSpDXZa8y7VUP9YmDcYa+eyq4ca7iLqWA==}

  ee-first@1.1.1:
    resolution: {integrity: sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==}

  ejs@3.1.10:
    resolution: {integrity: sha512-UeJmFfOrAQS8OJWPZ4qtgHyWExa088/MtK5UEyoJGFH67cDEXkZSviOiKRCZ4Xij0zxI3JECgYs3oKx+AizQBA==}
    engines: {node: '>=0.10.0'}
    hasBin: true

  electron-to-chromium@1.5.97:
    resolution: {integrity: sha512-HKLtaH02augM7ZOdYRuO19rWDeY+QSJ1VxnXFa/XDFLf07HvM90pALIJFgrO+UVaajI3+aJMMpojoUTLZyQ7JQ==}

  emittery@0.13.1:
    resolution: {integrity: sha512-DeWwawk6r5yR9jFgnDKYt4sLS0LmHJJi3ZOnb5/JdbYwj3nW+FxQnHIjhBKz8YLC7oRNPVM9NQ47I3CVx34eqQ==}
    engines: {node: '>=12'}

  emoji-regex@8.0.0:
    resolution: {integrity: sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==}

  emoji-regex@9.2.2:
    resolution: {integrity: sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==}

  encodeurl@1.0.2:
    resolution: {integrity: sha512-TPJXq8JqFaVYm2CWmPvnP2Iyo4ZSM7/QKcSmuMLDObfpH5fi7RUGmd/rTDf+rut/saiDiQEeVTNgAmJEdAOx0w==}
    engines: {node: '>= 0.8'}

  encodeurl@2.0.0:
    resolution: {integrity: sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==}
    engines: {node: '>= 0.8'}

  encoding-sniffer@0.2.0:
    resolution: {integrity: sha512-ju7Wq1kg04I3HtiYIOrUrdfdDvkyO9s5XM8QAj/bN61Yo/Vb4vgJxy5vi4Yxk01gWHbrofpPtpxM8bKger9jhg==}

  engine.io-parser@5.2.3:
    resolution: {integrity: sha512-HqD3yTBfnBxIrbnM1DoD6Pcq8NECnh8d4As1Qgh0z5Gg3jRRIqijury0CL3ghu/edArpUYiYqQiDUQBIs4np3Q==}
    engines: {node: '>=10.0.0'}

  engine.io@6.6.4:
    resolution: {integrity: sha512-ZCkIjSYNDyGn0R6ewHDtXgns/Zre/NT6Agvq1/WobF7JXgFff4SeDroKiCO3fNJreU9YG429Sc81o4w5ok/W5g==}
    engines: {node: '>=10.2.0'}

  enhanced-resolve@5.18.1:
    resolution: {integrity: sha512-ZSW3ma5GkcQBIpwZTSRAI8N71Uuwgs93IezB7mf7R60tC8ZbJideoDNKjHn2O9KIlx6rkGTTEk1xUCK2E1Y2Yg==}
    engines: {node: '>=10.13.0'}

  entities@4.5.0:
    resolution: {integrity: sha512-V0hjH4dGPh9Ao5p0MoRY6BVqtwCjhz6vI5LT8AJ55H+4g9/4vbHx1I54fS0XuclLhDHArPQCiMjDxjaL8fPxhw==}
    engines: {node: '>=0.12'}

  error-ex@1.3.2:
    resolution: {integrity: sha512-7dFHNmqeFSEt2ZBsCriorKnn3Z2pj+fd9kmI6QoWw4//DL+icEBfc0U7qJCisqrTsKTjw4fNFy2pW9OqStD84g==}

  es-define-property@1.0.1:
    resolution: {integrity: sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==}
    engines: {node: '>= 0.4'}

  es-errors@1.3.0:
    resolution: {integrity: sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==}
    engines: {node: '>= 0.4'}

  es-module-lexer@1.6.0:
    resolution: {integrity: sha512-qqnD1yMU6tk/jnaMosogGySTZP8YtUgAffA9nMN+E/rjxcfRQ6IEk7IiozUjgxKoFHBGjTLnrHB/YC45r/59EQ==}

  es-object-atoms@1.1.1:
    resolution: {integrity: sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==}
    engines: {node: '>= 0.4'}

  escalade@3.2.0:
    resolution: {integrity: sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==}
    engines: {node: '>=6'}

  escape-html@1.0.3:
    resolution: {integrity: sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==}

  escape-string-regexp@2.0.0:
    resolution: {integrity: sha512-UpzcLCXolUWcNu5HtVMHYdXJjArjsF9C0aNnquZYY4uW/Vu0miy5YoWvbV345HauVvcAUnpRuhMMcqTcGOY2+w==}
    engines: {node: '>=8'}

  escape-string-regexp@4.0.0:
    resolution: {integrity: sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==}
    engines: {node: '>=10'}

  eslint-config-prettier@10.0.1:
    resolution: {integrity: sha512-lZBts941cyJyeaooiKxAtzoPHTN+GbQTJFAIdQbRhA4/8whaAraEh47Whw/ZFfrjNSnlAxqfm9i0XVAEkULjCw==}
    hasBin: true
    peerDependencies:
      eslint: '>=7.0.0'

  eslint-plugin-prettier@5.2.3:
    resolution: {integrity: sha512-qJ+y0FfCp/mQYQ/vWQ3s7eUlFEL4PyKfAJxsnYTJ4YT73nsJBWqmEpFryxV9OeUiqmsTsYJ5Y+KDNaeP31wrRw==}
    engines: {node: ^14.18.0 || >=16.0.0}
    peerDependencies:
      '@types/eslint': '>=8.0.0'
      eslint: '>=8.0.0'
      eslint-config-prettier: '*'
      prettier: '>=3.0.0'
    peerDependenciesMeta:
      '@types/eslint':
        optional: true
      eslint-config-prettier:
        optional: true

  eslint-scope@5.1.1:
    resolution: {integrity: sha512-2NxwbF/hZ0KpepYN0cNbo+FN6XoK7GaHlQhgx/hIZl6Va0bF45RQOOwhLIy8lQDbuCiadSLCBnH2CFYquit5bw==}
    engines: {node: '>=8.0.0'}

  eslint-scope@8.2.0:
    resolution: {integrity: sha512-PHlWUfG6lvPc3yvP5A4PNyBL1W8fkDUccmI21JUu/+GKZBoH/W5u6usENXUrWFRsyoW5ACUjFGgAFQp5gUlb/A==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  eslint-visitor-keys@3.4.3:
    resolution: {integrity: sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==}
    engines: {node: ^12.22.0 || ^14.17.0 || >=16.0.0}

  eslint-visitor-keys@4.2.0:
    resolution: {integrity: sha512-UyLnSehNt62FFhSwjZlHmeokpRK59rcz29j+F1/aDgbkbRTk7wIc9XzdoasMUbRNKDM0qQt/+BJ4BrpFeABemw==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  eslint@9.20.1:
    resolution: {integrity: sha512-m1mM33o6dBUjxl2qb6wv6nGNwCAsns1eKtaQ4l/NPHeTvhiUPbtdfMyktxN4B3fgHIgsYh1VT3V9txblpQHq+g==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    hasBin: true
    peerDependencies:
      jiti: '*'
    peerDependenciesMeta:
      jiti:
        optional: true

  espree@10.3.0:
    resolution: {integrity: sha512-0QYC8b24HWY8zjRnDTL6RiHfDbAWn63qb4LMj1Z4b076A4une81+z03Kg7l7mn/48PUTqoLptSXez8oknU8Clg==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}

  esprima@4.0.1:
    resolution: {integrity: sha512-eGuFFw7Upda+g4p+QHvnW0RyTX/SVeJBDM/gCtMARO0cLuT2HcEKnTPvhjV6aGeqrCB/sbNop0Kszm0jsaWU4A==}
    engines: {node: '>=4'}
    hasBin: true

  esquery@1.6.0:
    resolution: {integrity: sha512-ca9pw9fomFcKPvFLXhBKUK90ZvGibiGOvRJNbjljY7s7uq/5YO4BOzcYtJqExdx99rF6aAcnRxHmcUHcz6sQsg==}
    engines: {node: '>=0.10'}

  esrecurse@4.3.0:
    resolution: {integrity: sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==}
    engines: {node: '>=4.0'}

  estraverse@4.3.0:
    resolution: {integrity: sha512-39nnKffWz8xN1BU/2c79n9nB9HDzo0niYUqx6xyqUnyoAnQyyWpOTdZEeiCch8BBu515t4wp9ZmgVfVhn9EBpw==}
    engines: {node: '>=4.0'}

  estraverse@5.3.0:
    resolution: {integrity: sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==}
    engines: {node: '>=4.0'}

  esutils@2.0.3:
    resolution: {integrity: sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==}
    engines: {node: '>=0.10.0'}

  etag@1.8.1:
    resolution: {integrity: sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==}
    engines: {node: '>= 0.6'}

  event-target-shim@5.0.1:
    resolution: {integrity: sha512-i/2XbnSz/uxRCU6+NdVJgKWDTM427+MqYbkQzD321DuCQJUqOuJKIA0IM2+W2xtYHdKOmZ4dR6fExsd4SXL+WQ==}
    engines: {node: '>=6'}

  eventemitter3@4.0.7:
    resolution: {integrity: sha512-8guHBZCwKnFhYdHr2ysuRWErTwhoN2X8XELRlrRwpmfeY2jjuUN4taQMsULKUVo1K4DvZl+0pgfyoysHxvmvEw==}

  events@3.3.0:
    resolution: {integrity: sha512-mQw+2fkQbALzQ7V0MY0IqdnXNOeTtP4r0lN9z7AAawCXgqea7bDii20AYrIBrFd/Hx0M2Ocz6S111CaFkUcb0Q==}
    engines: {node: '>=0.8.x'}

  execa@5.1.1:
    resolution: {integrity: sha512-8uSpZZocAZRBAPIEINJj3Lo9HyGitllczc27Eh5YYojjMFMn8yHMDMaUHE2Jqfq05D/wucwI4JGURyXt1vchyg==}
    engines: {node: '>=10'}

  exit@0.1.2:
    resolution: {integrity: sha512-Zk/eNKV2zbjpKzrsQ+n1G6poVbErQxJ0LBOJXaKZ1EViLzH+hrLu9cdXI4zw9dBQJslwBEpbQ2P1oS7nDxs6jQ==}
    engines: {node: '>= 0.8.0'}

  expect@29.7.0:
    resolution: {integrity: sha512-2Zks0hf1VLFYI1kbh0I5jP3KHHyCHpkfyHBzsSXRFgl/Bg9mWYfMW8oD+PdMPlEwy5HNsR9JutYy6pMeOh61nw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  exponential-backoff@3.1.2:
    resolution: {integrity: sha512-8QxYTVXUkuy7fIIoitQkPwGonB8F3Zj8eEO8Sqg9Zv/bkI7RJAzowee4gr81Hak/dUTpA2Z7VfQgoijjPNlUZA==}

  express@5.0.1:
    resolution: {integrity: sha512-ORF7g6qGnD+YtUG9yx4DFoqCShNMmUKiXuT5oWMHiOvt/4WFbHC6yCwQMTSBMno7AqntNCAzzcnnjowRkTL9eQ==}
    engines: {node: '>= 18'}

  ext-list@2.2.2:
    resolution: {integrity: sha512-u+SQgsubraE6zItfVA0tBuCBhfU9ogSRnsvygI7wht9TS510oLkBRXBsqopeUG/GBOIQyKZO9wjTqIu/sf5zFA==}
    engines: {node: '>=0.10.0'}

  ext-name@5.0.0:
    resolution: {integrity: sha512-yblEwXAbGv1VQDmow7s38W77hzAgJAO50ztBLMcUyUBfxv1HC+LGwtiEN+Co6LtlqT/5uwVOxsD4TNIilWhwdQ==}
    engines: {node: '>=4'}

  external-editor@3.1.0:
    resolution: {integrity: sha512-hMQ4CX1p1izmuLYyZqLMO/qGNw10wSv9QDCPfzXfyFrOaCSSoRfqE1Kf1s5an66J5JZC62NewG+mK49jOCtQew==}
    engines: {node: '>=4'}

  fast-deep-equal@3.1.3:
    resolution: {integrity: sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==}

  fast-diff@1.3.0:
    resolution: {integrity: sha512-VxPP4NqbUjj6MaAOafWeUn2cXWLcCtljklUtZf0Ind4XQ+QPtmA0b18zZy0jIQx+ExRVCR/ZQpBmik5lXshNsw==}

  fast-fifo@1.3.2:
    resolution: {integrity: sha512-/d9sfos4yxzpwkDkuN7k2SqFKtYNmCTzgfEpz82x34IM9/zc8KGxQoXg1liNC/izpRM/MBdt44Nmx41ZWqk+FQ==}

  fast-glob@3.3.3:
    resolution: {integrity: sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg==}
    engines: {node: '>=8.6.0'}

  fast-json-stable-stringify@2.1.0:
    resolution: {integrity: sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==}

  fast-levenshtein@2.0.6:
    resolution: {integrity: sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==}

  fast-safe-stringify@2.1.1:
    resolution: {integrity: sha512-W+KJc2dmILlPplD/H4K9l9LcAHAfPtP6BY84uVLXQ6Evcz9Lcg33Y2z1IVblT6xdY54PXYVHEv+0Wpq8Io6zkA==}

  fast-uri@3.0.6:
    resolution: {integrity: sha512-Atfo14OibSv5wAp4VWNsFYE1AchQRTv9cBGWET4pZWHzYshFSS9NQI6I57rdKn9croWVMbYFbLhJ+yJvmZIIHw==}

  fast-xml-parser@4.5.1:
    resolution: {integrity: sha512-y655CeyUQ+jj7KBbYMc4FG01V8ZQqjN+gDYGJ50RtfsUB8iG9AmwmwoAgeKLJdmueKKMrH1RJ7yXHTSoczdv5w==}
    hasBin: true

  fastq@1.19.0:
    resolution: {integrity: sha512-7SFSRCNjBQIZH/xZR3iy5iQYR8aGBE0h3VG6/cwlbrpdciNYBMotQav8c1XI3HjHH+NikUpP53nPdlZSdWmFzA==}

  fb-watchman@2.0.2:
    resolution: {integrity: sha512-p5161BqbuCaSnB8jIbzQHOlpgsPmK5rJVDfDKO91Axs5NC1uu3HRQm6wt9cd9/+GtQQIO53JdGXXoyDpTAsgYA==}

  file-entry-cache@8.0.0:
    resolution: {integrity: sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==}
    engines: {node: '>=16.0.0'}

  file-type@19.6.0:
    resolution: {integrity: sha512-VZR5I7k5wkD0HgFnMsq5hOsSc710MJMu5Nc5QYsbe38NN5iPV/XTObYLc/cpttRTf6lX538+5uO1ZQRhYibiZQ==}
    engines: {node: '>=18'}

  filelist@1.0.4:
    resolution: {integrity: sha512-w1cEuf3S+DrLCQL7ET6kz+gmlJdbq9J7yXCSjK/OZCPA+qEN1WyF4ZAf0YYJa4/shHJra2t/d/r8SV4Ji+x+8Q==}

  filename-reserved-regex@3.0.0:
    resolution: {integrity: sha512-hn4cQfU6GOT/7cFHXBqeBg2TbrMBgdD0kcjLhvSQYYwm3s4B6cjvBfb7nBALJLAXqmU5xajSa7X2NnUud/VCdw==}
    engines: {node: ^12.20.0 || ^14.13.1 || >=16.0.0}

  filenamify@6.0.0:
    resolution: {integrity: sha512-vqIlNogKeyD3yzrm0yhRMQg8hOVwYcYRfjEoODd49iCprMn4HL85gK3HcykQE53EPIpX3HcAbGA5ELQv216dAQ==}
    engines: {node: '>=16'}

  fill-range@7.1.1:
    resolution: {integrity: sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==}
    engines: {node: '>=8'}

  finalhandler@2.0.0:
    resolution: {integrity: sha512-MX6Zo2adDViYh+GcxxB1dpO43eypOGUOL12rLCOTMQv/DfIbpSJUy4oQIIZhVZkH9e+bZWKMon0XHFEju16tkQ==}
    engines: {node: '>= 0.8'}

  find-up@4.1.0:
    resolution: {integrity: sha512-PpOwAdQ/YlXQ2vj8a3h8IipDuYRi3wceVQQGYWxNINccq40Anw7BlsEXCMbt1Zt+OLA6Fq9suIpIWD0OsnISlw==}
    engines: {node: '>=8'}

  find-up@5.0.0:
    resolution: {integrity: sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==}
    engines: {node: '>=10'}

  find-versions@5.1.0:
    resolution: {integrity: sha512-+iwzCJ7C5v5KgcBuueqVoNiHVoQpwiUK5XFLjf0affFTep+Wcw93tPvmb8tqujDNmzhBDPddnWV/qgWSXgq+Hg==}
    engines: {node: '>=12'}

  flat-cache@4.0.1:
    resolution: {integrity: sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==}
    engines: {node: '>=16'}

  flatted@3.3.2:
    resolution: {integrity: sha512-AiwGJM8YcNOaobumgtng+6NHuOqC3A7MixFeDafM3X9cIUM+xUXoS5Vfgf+OihAYe20fxqNM9yPBXJzRtZ/4eA==}

  foreground-child@3.3.0:
    resolution: {integrity: sha512-Ld2g8rrAyMYFXBhEqMz8ZAHBi4J4uS1i/CxGMDnjyFWddMXLVcDp051DZfu+t7+ab7Wv6SMqpWmyFIj5UbfFvg==}
    engines: {node: '>=14'}

  fork-ts-checker-webpack-plugin@9.0.2:
    resolution: {integrity: sha512-Uochze2R8peoN1XqlSi/rGUkDQpRogtLFocP9+PGu68zk1BDAKXfdeCdyVZpgTk8V8WFVQXdEz426VKjXLO1Gg==}
    engines: {node: '>=12.13.0', yarn: '>=1.0.0'}
    peerDependencies:
      typescript: '>3.6.0'
      webpack: ^5.11.0

  form-data-encoder@1.7.2:
    resolution: {integrity: sha512-qfqtYan3rxrnCk1VYaA4H+Ms9xdpPqvLZa6xmMgFvhO32x7/3J/ExcTd6qpxM0vH2GdMI+poehyBZvqfMTto8A==}

  form-data-encoder@2.1.4:
    resolution: {integrity: sha512-yDYSgNMraqvnxiEXO4hi88+YZxaHC6QKzb5N84iRCTDeRO7ZALpir/lVmf/uXUhnwUr2O4HU8s/n6x+yNjQkHw==}
    engines: {node: '>= 14.17'}

  form-data@4.0.1:
    resolution: {integrity: sha512-tzN8e4TX8+kkxGPK8D5u0FNmjPUjw3lwC9lSLxxoB/+GtsJG91CO8bSWy73APlgAZzZbXEYZJuxjkHH2w+Ezhw==}
    engines: {node: '>= 6'}

  formdata-node@4.4.1:
    resolution: {integrity: sha512-0iirZp3uVDjVGt9p49aTaqjk84TrglENEDuqfdlZQ1roC9CWlPk6Avf8EEnZNcAqPonwkG35x4n3ww/1THYAeQ==}
    engines: {node: '>= 12.20'}

  formidable@3.5.2:
    resolution: {integrity: sha512-Jqc1btCy3QzRbJaICGwKcBfGWuLADRerLzDqi2NwSt/UkXLsHJw2TVResiaoBufHVHy9aSgClOHCeJsSsFLTbg==}

  forwarded@0.2.0:
    resolution: {integrity: sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==}
    engines: {node: '>= 0.6'}

  fresh@0.5.2:
    resolution: {integrity: sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==}
    engines: {node: '>= 0.6'}

  fresh@2.0.0:
    resolution: {integrity: sha512-Rx/WycZ60HOaqLKAi6cHRKKI7zxWbJ31MhntmtwMoaTeF7XFH9hhBp8vITaMidfljRQ6eYWCKkaTK+ykVJHP2A==}
    engines: {node: '>= 0.8'}

  fs-extra@10.1.0:
    resolution: {integrity: sha512-oRXApq54ETRj4eMiFzGnHWGy+zo5raudjuxN0b8H7s/RU2oW0Wvsx9O0ACRN/kRq9E8Vu/ReskGB5o3ji+FzHQ==}
    engines: {node: '>=12'}

  fs-monkey@1.0.6:
    resolution: {integrity: sha512-b1FMfwetIKymC0eioW7mTywihSQE4oLzQn1dB6rZB5fx/3NpNEdAWeCSMB+60/AeT0TCXsxzAlcYVEFCTAksWg==}

  fs.realpath@1.0.0:
    resolution: {integrity: sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw==}

  fsevents@2.3.3:
    resolution: {integrity: sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==}
    engines: {node: ^8.16.0 || ^10.6.0 || >=11.0.0}
    os: [darwin]

  function-bind@1.1.2:
    resolution: {integrity: sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==}

  gensync@1.0.0-beta.2:
    resolution: {integrity: sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==}
    engines: {node: '>=6.9.0'}

  get-caller-file@2.0.5:
    resolution: {integrity: sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==}
    engines: {node: 6.* || 8.* || >= 10.*}

  get-intrinsic@1.2.7:
    resolution: {integrity: sha512-VW6Pxhsrk0KAOqs3WEd0klDiF/+V7gQOpAvY1jVU/LHmaD/kQO4523aiJuikX/QAKYiW6x8Jh+RJej1almdtCA==}
    engines: {node: '>= 0.4'}

  get-package-type@0.1.0:
    resolution: {integrity: sha512-pjzuKtY64GYfWizNAJ0fr9VqttZkNiK2iS430LtIHzjBEr6bX8Am2zm4sW4Ro5wjWW5cAlRL1qAMTcXbjNAO2Q==}
    engines: {node: '>=8.0.0'}

  get-proto@1.0.1:
    resolution: {integrity: sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==}
    engines: {node: '>= 0.4'}

  get-stream@6.0.1:
    resolution: {integrity: sha512-ts6Wi+2j3jQjqi70w5AlN8DFnkSwC+MqmxEzdEALB2qXZYV3X/b1CTfgPLGJNMeAWxdPfU8FO1ms3NUfaHCPYg==}
    engines: {node: '>=10'}

  get-stream@9.0.1:
    resolution: {integrity: sha512-kVCxPF3vQM/N0B1PmoqVUqgHP+EeVjmZSQn+1oCRPxd2P21P2F19lIgbR3HBosbB1PUhOAoctJnfEn2GbN2eZA==}
    engines: {node: '>=18'}

  glob-parent@5.1.2:
    resolution: {integrity: sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow==}
    engines: {node: '>= 6'}

  glob-parent@6.0.2:
    resolution: {integrity: sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==}
    engines: {node: '>=10.13.0'}

  glob-to-regexp@0.4.1:
    resolution: {integrity: sha512-lkX1HJXwyMcprw/5YUZc2s7DrpAiHB21/V+E1rHUrVNokkvB6bqMzT0VfV6/86ZNabt1k14YOIaT7nDvOX3Iiw==}

  glob@11.0.1:
    resolution: {integrity: sha512-zrQDm8XPnYEKawJScsnM0QzobJxlT/kHOOlRTio8IH/GrmxRE5fjllkzdaHclIuNjUQTJYH2xHNIGfdpJkDJUw==}
    engines: {node: 20 || >=22}
    hasBin: true

  glob@7.2.3:
    resolution: {integrity: sha512-nFR0zLpU2YCaRxwoCJvL6UvCH2JFyFVIvwTLsIf21AuHlMskA1hhTdk+LlYJtOlYt9v6dvszD2BGRqBL+iQK9Q==}
    deprecated: Glob versions prior to v9 are no longer supported

  globals@11.12.0:
    resolution: {integrity: sha512-WOBp/EEGUiIsJSp7wcv/y6MO+lV9UoncWqxuFfm8eBwzWNgyfBd6Gz+IeKQ9jCmyhoH99g15M3T+QaVHFjizVA==}
    engines: {node: '>=4'}

  globals@14.0.0:
    resolution: {integrity: sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==}
    engines: {node: '>=18'}

  globals@15.15.0:
    resolution: {integrity: sha512-7ACyT3wmyp3I61S4fG682L0VA2RGD9otkqGJIwNUMF1SWUombIIk+af1unuDYgMm082aHYwD+mzJvv9Iu8dsgg==}
    engines: {node: '>=18'}

  gopd@1.2.0:
    resolution: {integrity: sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==}
    engines: {node: '>= 0.4'}

  got@13.0.0:
    resolution: {integrity: sha512-XfBk1CxOOScDcMr9O1yKkNaQyy865NbYs+F7dr4H0LZMVgCj2Le59k6PqbNHoL5ToeaEQUYh6c6yMfVcc6SJxA==}
    engines: {node: '>=16'}

  graceful-fs@4.2.11:
    resolution: {integrity: sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==}

  graphemer@1.4.0:
    resolution: {integrity: sha512-EtKwoO6kxCL9WO5xipiHTZlSzBm7WLT627TqC/uVRd0HKmq8NXyebnNYxDoBi7wt8eTWrUrKXCOVaFq9x1kgag==}

  groq-sdk@0.3.3:
    resolution: {integrity: sha512-wdOeZ2QymPjjP3tmFpUAnfMisoLbt7xF2MfpROeFAngcqWbfTyB9j9pMWSEAMF/E4gZx8f2Y+5zswO0q92CSxA==}

  has-flag@4.0.0:
    resolution: {integrity: sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==}
    engines: {node: '>=8'}

  has-own-prop@2.0.0:
    resolution: {integrity: sha512-Pq0h+hvsVm6dDEa8x82GnLSYHOzNDt7f0ddFa3FqcQlgzEiptPqL+XrOJNavjOzSYiYWIrgeVYYgGlLmnxwilQ==}
    engines: {node: '>=8'}

  has-symbols@1.1.0:
    resolution: {integrity: sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==}
    engines: {node: '>= 0.4'}

  hasown@2.0.2:
    resolution: {integrity: sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==}
    engines: {node: '>= 0.4'}

  hexoid@2.0.0:
    resolution: {integrity: sha512-qlspKUK7IlSQv2o+5I7yhUd7TxlOG2Vr5LTa3ve2XSNVKAL/n/u/7KLvKmFNimomDIKvZFXWHv0T12mv7rT8Aw==}
    engines: {node: '>=8'}

  html-escaper@2.0.2:
    resolution: {integrity: sha512-H2iMtd0I4Mt5eYiapRdIDjp+XzelXQ0tFE4JS7YFwFevXXMmOp9myNrUvCg0D6ws8iqkRPBfKHgbwig1SmlLfg==}

  htmlparser2@9.1.0:
    resolution: {integrity: sha512-5zfg6mHUoaer/97TxnGpxmbR7zJtPwIYFMZ/H5ucTlPZhKvtum05yiPK3Mgai3a0DyVxv7qYqoweaEd2nrYQzQ==}

  http-cache-semantics@4.1.1:
    resolution: {integrity: sha512-er295DKPVsV82j5kw1Gjt+ADA/XYHsajl82cGNQG2eyoPkvgUhX+nDIyelzhIWbbsXP39EHcI6l5tYs2FYqYXQ==}

  http-errors@2.0.0:
    resolution: {integrity: sha512-FtwrG/euBzaEjYeRqOgly7G0qviiXoJWnvEH2Z1plBdXgbyjv34pHTSb9zoeHMyDy33+DWy5Wt9Wo+TURtOYSQ==}
    engines: {node: '>= 0.8'}

  http2-wrapper@2.2.1:
    resolution: {integrity: sha512-V5nVw1PAOgfI3Lmeaj2Exmeg7fenjhRUgz1lPSezy1CuhPYbgQtbQj4jZfEAEMlaL+vupsvhjqCyjzob0yxsmQ==}
    engines: {node: '>=10.19.0'}

  human-signals@2.1.0:
    resolution: {integrity: sha512-B4FFZ6q/T2jhhksgkbEW3HBvWIfDW85snkQgawt07S7J5QXTk6BkNV+0yAeZrM5QpMAdYlocGoljn0sJ/WQkFw==}
    engines: {node: '>=10.17.0'}

  humanize-ms@1.2.1:
    resolution: {integrity: sha512-Fl70vYtsAFb/C06PTS9dZBo7ihau+Tu/DNCk/OyHhea07S+aeMWpFFkUaXRa8fI+ScZbEI8dfSxwY7gxZ9SAVQ==}

  iconv-lite@0.4.24:
    resolution: {integrity: sha512-v3MXnZAcvnywkTUEZomIActle7RXXeedOR31wwl7VlyoXO4Qi9arvSenNQWne1TcRwhCL1HwLI21bEqdpj8/rA==}
    engines: {node: '>=0.10.0'}

  iconv-lite@0.5.2:
    resolution: {integrity: sha512-kERHXvpSaB4aU3eANwidg79K8FlrN77m8G9V+0vOR3HYaRifrlwMEpT7ZBJqLSEIHnEgJTHcWK82wwLwwKwtag==}
    engines: {node: '>=0.10.0'}

  iconv-lite@0.6.3:
    resolution: {integrity: sha512-4fCk79wshMdzMp2rH06qWrJE4iolqLhCUH+OiuIgU++RB0+94NlDL81atO7GX55uUKueo0txHNtvEyI6D7WdMw==}
    engines: {node: '>=0.10.0'}

  ieee754@1.2.1:
    resolution: {integrity: sha512-dcyqhDvX1C46lXZcVqCpK+FtMRQVdIMN6/Df5js2zouUsqG7I6sFxitIC+7KYK29KdXOLHdu9zL4sFnoVQnqaA==}

  ignore@5.3.2:
    resolution: {integrity: sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==}
    engines: {node: '>= 4'}

  import-fresh@3.3.1:
    resolution: {integrity: sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==}
    engines: {node: '>=6'}

  import-local@3.2.0:
    resolution: {integrity: sha512-2SPlun1JUPWoM6t3F0dw0FkCF/jWY8kttcY4f599GLTSjh2OCuuhdTkJQsEcZzBqbXZGKMK2OqW1oZsjtf/gQA==}
    engines: {node: '>=8'}
    hasBin: true

  imurmurhash@0.1.4:
    resolution: {integrity: sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==}
    engines: {node: '>=0.8.19'}

  inflight@1.0.6:
    resolution: {integrity: sha512-k92I/b08q4wvFscXCLvqfsHCrjrF7yiXsQuIVvVE7N82W3+aqpzuUdBbfhWcy/FZR3/4IgflMgKLOsvPDrGCJA==}
    deprecated: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.

  inherits@2.0.4:
    resolution: {integrity: sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==}

  inspect-with-kind@1.0.5:
    resolution: {integrity: sha512-MAQUJuIo7Xqk8EVNP+6d3CKq9c80hi4tjIbIAT6lmGW9W6WzlHiu9PS8uSuUYU+Do+j1baiFp3H25XEVxDIG2g==}

  ipaddr.js@1.9.1:
    resolution: {integrity: sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==}
    engines: {node: '>= 0.10'}

  is-any-array@2.0.1:
    resolution: {integrity: sha512-UtilS7hLRu++wb/WBAw9bNuP1Eg04Ivn1vERJck8zJthEvXCBEBpGR/33u/xLKWEQf95803oalHrVDptcAvFdQ==}

  is-arrayish@0.2.1:
    resolution: {integrity: sha512-zz06S8t0ozoDXMG+ube26zeCTNXcKIPJZJi8hBrF4idCLms4CG9QtK7qBl1boi5ODzFpjswb5JPmHCbMpjaYzg==}

  is-binary-path@2.1.0:
    resolution: {integrity: sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw==}
    engines: {node: '>=8'}

  is-buffer@1.1.6:
    resolution: {integrity: sha512-NcdALwpXkTm5Zvvbk7owOUSvVvBKDgKP5/ewfXEznmQFfs4ZRmanOeKBTjRVjka3QFoN6XJ+9F3USqfHqTaU5w==}

  is-core-module@2.16.1:
    resolution: {integrity: sha512-UfoeMA6fIJ8wTYFEUjelnaGI67v6+N7qXJEvQuIGa99l4xsCruSYOVSQ0uPANn4dAzm8lkYPaKLrrijLq7x23w==}
    engines: {node: '>= 0.4'}

  is-extglob@2.1.1:
    resolution: {integrity: sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==}
    engines: {node: '>=0.10.0'}

  is-fullwidth-code-point@3.0.0:
    resolution: {integrity: sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==}
    engines: {node: '>=8'}

  is-generator-fn@2.1.0:
    resolution: {integrity: sha512-cTIB4yPYL/Grw0EaSzASzg6bBy9gqCofvWN8okThAYIxKJZC+udlRAmGbM0XLeniEJSs8uEgHPGuHSe1XsOLSQ==}
    engines: {node: '>=6'}

  is-glob@4.0.3:
    resolution: {integrity: sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==}
    engines: {node: '>=0.10.0'}

  is-interactive@1.0.0:
    resolution: {integrity: sha512-2HvIEKRoqS62guEC+qBjpvRubdX910WCMuJTZ+I9yvqKU2/12eSL549HMwtabb4oupdj2sMP50k+XJfB/8JE6w==}
    engines: {node: '>=8'}

  is-number@7.0.0:
    resolution: {integrity: sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==}
    engines: {node: '>=0.12.0'}

  is-plain-obj@1.1.0:
    resolution: {integrity: sha512-yvkRyxmFKEOQ4pNXCmJG5AEQNlXJS5LaONXo5/cLdTZdWvsZ1ioJEonLGAosKlMWE8lwUy/bJzMjcw8az73+Fg==}
    engines: {node: '>=0.10.0'}

  is-promise@4.0.0:
    resolution: {integrity: sha512-hvpoI6korhJMnej285dSg6nu1+e6uxs7zG3BYAm5byqDsgJNWwxzM6z6iZiAgQR4TJ30JmBTOwqZUw3WlyH3AQ==}

  is-stream@2.0.1:
    resolution: {integrity: sha512-hFoiJiTl63nn+kstHGBtewWSKnQLpyb155KHheA1l39uvtO9nWIop1p3udqPcUd/xbF1VLMO4n7OI6p7RbngDg==}
    engines: {node: '>=8'}

  is-stream@4.0.1:
    resolution: {integrity: sha512-Dnz92NInDqYckGEUJv689RbRiTSEHCQ7wOVeALbkOz999YpqT46yMRIGtSNl2iCL1waAZSx40+h59NV/EwzV/A==}
    engines: {node: '>=18'}

  is-unicode-supported@0.1.0:
    resolution: {integrity: sha512-knxG2q4UC3u8stRGyAVJCOdxFmv5DZiRcdlIaAQXAbSfJya+OhopNotLQrstBhququ4ZpuKbDc/8S6mgXgPFPw==}
    engines: {node: '>=10'}

  isarray@1.0.0:
    resolution: {integrity: sha512-VLghIWNM6ELQzo7zwmcg0NmTVyWKYjvIeM83yjp0wRDTmUnrM678fQbcKBo6n2CJEF0szoG//ytg+TKla89ALQ==}

  isexe@2.0.0:
    resolution: {integrity: sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==}

  istanbul-lib-coverage@3.2.2:
    resolution: {integrity: sha512-O8dpsF+r0WV/8MNRKfnmrtCWhuKjxrq2w+jpzBL5UZKTi2LeVWnWOmWRxFlesJONmc+wLAGvKQZEOanko0LFTg==}
    engines: {node: '>=8'}

  istanbul-lib-instrument@5.2.1:
    resolution: {integrity: sha512-pzqtp31nLv/XFOzXGuvhCb8qhjmTVo5vjVk19XE4CRlSWz0KoeJ3bw9XsA7nOp9YBf4qHjwBxkDzKcME/J29Yg==}
    engines: {node: '>=8'}

  istanbul-lib-instrument@6.0.3:
    resolution: {integrity: sha512-Vtgk7L/R2JHyyGW07spoFlB8/lpjiOLTjMdms6AFMraYt3BaJauod/NGrfnVG/y4Ix1JEuMRPDPEj2ua+zz1/Q==}
    engines: {node: '>=10'}

  istanbul-lib-report@3.0.1:
    resolution: {integrity: sha512-GCfE1mtsHGOELCU8e/Z7YWzpmybrx/+dSTfLrvY8qRmaY6zXTKWn6WQIjaAFw069icm6GVMNkgu0NzI4iPZUNw==}
    engines: {node: '>=10'}

  istanbul-lib-source-maps@4.0.1:
    resolution: {integrity: sha512-n3s8EwkdFIJCG3BPKBYvskgXGoy88ARzvegkitk60NxRdwltLOTaH7CUiMRXvwYorl0Q712iEjcWB+fK/MrWVw==}
    engines: {node: '>=10'}

  istanbul-reports@3.1.7:
    resolution: {integrity: sha512-BewmUXImeuRk2YY0PVbxgKAysvhRPUQE0h5QRM++nVWyubKGV0l8qQ5op8+B2DOmwSe63Jivj0BjkPQVf8fP5g==}
    engines: {node: '>=8'}

  iterare@1.2.1:
    resolution: {integrity: sha512-RKYVTCjAnRthyJes037NX/IiqeidgN1xc3j1RjFfECFp28A1GVwK9nA+i0rJPaHqSZwygLzRnFlzUuHFoWWy+Q==}
    engines: {node: '>=6'}

  jackspeak@4.0.3:
    resolution: {integrity: sha512-oSwM7q8PTHQWuZAlp995iPpPJ4Vkl7qT0ZRD+9duL9j2oBy6KcTfyxc8mEuHJYC+z/kbps80aJLkaNzTOrf/kw==}
    engines: {node: 20 || >=22}

  jake@10.9.2:
    resolution: {integrity: sha512-2P4SQ0HrLQ+fw6llpLnOaGAvN2Zu6778SJMrCUwns4fOoG9ayrTiZk3VV8sCPkVZF8ab0zksVpS8FDY5pRCNBA==}
    engines: {node: '>=10'}
    hasBin: true

  jest-changed-files@29.7.0:
    resolution: {integrity: sha512-fEArFiwf1BpQ+4bXSprcDc3/x4HSzL4al2tozwVpDFpsxALjLYdyiIK4e5Vz66GQJIbXJ82+35PtysofptNX2w==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-circus@29.7.0:
    resolution: {integrity: sha512-3E1nCMgipcTkCocFwM90XXQab9bS+GMsjdpmPrlelaxwD93Ad8iVEjX/vvHPdLPnFf+L40u+5+iutRdA1N9myw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-cli@29.7.0:
    resolution: {integrity: sha512-OVVobw2IubN/GSYsxETi+gOe7Ka59EFMR/twOU3Jb2GnKKeMGJB5SGUUrEz3SFVmJASUdZUzy83sLNNQ2gZslg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    hasBin: true
    peerDependencies:
      node-notifier: ^8.0.1 || ^9.0.0 || ^10.0.0
    peerDependenciesMeta:
      node-notifier:
        optional: true

  jest-config@29.7.0:
    resolution: {integrity: sha512-uXbpfeQ7R6TZBqI3/TxCU4q4ttk3u0PJeC+E0zbfSoSjq6bJ7buBPxzQPL0ifrkY4DNu4JUdk0ImlBUYi840eQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    peerDependencies:
      '@types/node': '*'
      ts-node: '>=9.0.0'
    peerDependenciesMeta:
      '@types/node':
        optional: true
      ts-node:
        optional: true

  jest-diff@29.7.0:
    resolution: {integrity: sha512-LMIgiIrhigmPrs03JHpxUh2yISK3vLFPkAodPeo0+BuF7wA2FoQbkEg1u8gBYBThncu7e1oEDUfIXVuTqLRUjw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-docblock@29.7.0:
    resolution: {integrity: sha512-q617Auw3A612guyaFgsbFeYpNP5t2aoUNLwBUbc/0kD1R4t9ixDbyFTHd1nok4epoVFpr7PmeWHrhvuV3XaJ4g==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-each@29.7.0:
    resolution: {integrity: sha512-gns+Er14+ZrEoC5fhOfYCY1LOHHr0TI+rQUHZS8Ttw2l7gl+80eHc/gFf2Ktkw0+SIACDTeWvpFcv3B04VembQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-environment-node@29.7.0:
    resolution: {integrity: sha512-DOSwCRqXirTOyheM+4d5YZOrWcdu0LNZ87ewUoywbcb2XR4wKgqiG8vNeYwhjFMbEkfju7wx2GYH0P2gevGvFw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-get-type@29.6.3:
    resolution: {integrity: sha512-zrteXnqYxfQh7l5FHyL38jL39di8H8rHoecLH3JNxH3BwOrBsNeabdap5e0I23lD4HHI8W5VFBZqG4Eaq5LNcw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-haste-map@29.7.0:
    resolution: {integrity: sha512-fP8u2pyfqx0K1rGn1R9pyE0/KTn+G7PxktWidOBTqFPLYX0b9ksaMFkhK5vrS3DVun09pckLdlx90QthlW7AmA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-leak-detector@29.7.0:
    resolution: {integrity: sha512-kYA8IJcSYtST2BY9I+SMC32nDpBT3J2NvWJx8+JCuCdl/CR1I4EKUJROiP8XtCcxqgTTBGJNdbB1A8XRKbTetw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-matcher-utils@29.7.0:
    resolution: {integrity: sha512-sBkD+Xi9DtcChsI3L3u0+N0opgPYnCRPtGcQYrgXmR+hmt/fYfWAL0xRXYU8eWOdfuLgBe0YCW3AFtnRLagq/g==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-message-util@29.7.0:
    resolution: {integrity: sha512-GBEV4GRADeP+qtB2+6u61stea8mGcOT4mCtrYISZwfu9/ISHFJ/5zOMXYbpBE9RsS5+Gb63DW4FgmnKJ79Kf6w==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-mock@29.7.0:
    resolution: {integrity: sha512-ITOMZn+UkYS4ZFh83xYAOzWStloNzJFO2s8DWrE4lhtGD+AorgnbkiKERe4wQVBydIGPx059g6riW5Btp6Llnw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-pnp-resolver@1.2.3:
    resolution: {integrity: sha512-+3NpwQEnRoIBtx4fyhblQDPgJI0H1IEIkX7ShLUjPGA7TtUTvI1oiKi3SR4oBR0hQhQR80l4WAe5RrXBwWMA8w==}
    engines: {node: '>=6'}
    peerDependencies:
      jest-resolve: '*'
    peerDependenciesMeta:
      jest-resolve:
        optional: true

  jest-regex-util@29.6.3:
    resolution: {integrity: sha512-KJJBsRCyyLNWCNBOvZyRDnAIfUiRJ8v+hOBQYGn8gDyF3UegwiP4gwRR3/SDa42g1YbVycTidUF3rKjyLFDWbg==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-resolve-dependencies@29.7.0:
    resolution: {integrity: sha512-un0zD/6qxJ+S0et7WxeI3H5XSe9lTBBR7bOHCHXkKR6luG5mwDDlIzVQ0V5cZCuoTgEdcdwzTghYkTWfubi+nA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-resolve@29.7.0:
    resolution: {integrity: sha512-IOVhZSrg+UvVAshDSDtHyFCCBUl/Q3AAJv8iZ6ZjnZ74xzvwuzLXid9IIIPgTnY62SJjfuupMKZsZQRsCvxEgA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-runner@29.7.0:
    resolution: {integrity: sha512-fsc4N6cPCAahybGBfTRcq5wFR6fpLznMg47sY5aDpsoejOcVYFb07AHuSnR0liMcPTgBsA3ZJL6kFOjPdoNipQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-runtime@29.7.0:
    resolution: {integrity: sha512-gUnLjgwdGqW7B4LvOIkbKs9WGbn+QLqRQQ9juC6HndeDiezIwhDP+mhMwHWCEcfQ5RUXa6OPnFF8BJh5xegwwQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-snapshot@29.7.0:
    resolution: {integrity: sha512-Rm0BMWtxBcioHr1/OX5YCP8Uov4riHvKPknOGs804Zg9JGZgmIBkbtlxJC/7Z4msKYVbIJtfU+tKb8xlYNfdkw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-util@29.7.0:
    resolution: {integrity: sha512-z6EbKajIpqGKU56y5KBUgy1dt1ihhQJgWzUlZHArA/+X2ad7Cb5iF+AK1EWVL/Bo7Rz9uurpqw6SiBCefUbCGA==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-validate@29.7.0:
    resolution: {integrity: sha512-ZB7wHqaRGVw/9hST/OuFUReG7M8vKeq0/J2egIGLdvjHCmYqGARhzXmtgi+gVeZ5uXFF219aOc3Ls2yLg27tkw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-watcher@29.7.0:
    resolution: {integrity: sha512-49Fg7WXkU3Vl2h6LbLtMQ/HyB6rXSIX7SqvBLQmssRBGN9I0PNvPmAmCWSOY6SOvrjhI/F7/bGAv9RtnsPA03g==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest-worker@27.5.1:
    resolution: {integrity: sha512-7vuh85V5cdDofPyxn58nrPjBktZo0u9x1g8WtjQol+jZDaE+fhN+cIvTj11GndBnMnyfrUOG1sZQxCdjKh+DKg==}
    engines: {node: '>= 10.13.0'}

  jest-worker@29.7.0:
    resolution: {integrity: sha512-eIz2msL/EzL9UFTFFx7jBTkeZfku0yUAyZZZmJ93H2TYEiroIx2PQjEXcwYtYl8zXCxb+PAmA2hLIt/6ZEkPHw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  jest@29.7.0:
    resolution: {integrity: sha512-NIy3oAFp9shda19hy4HK0HRTWKtPJmGdnvywu01nOqNC2vZg+Z+fvJDxpMQA88eb2I9EcafcdjYgsDthnYTvGw==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
    hasBin: true
    peerDependencies:
      node-notifier: ^8.0.1 || ^9.0.0 || ^10.0.0
    peerDependenciesMeta:
      node-notifier:
        optional: true

  js-tiktoken@1.0.18:
    resolution: {integrity: sha512-hFYx4xYf6URgcttcGvGuOBJhTxPYZ2R5eIesqCaNRJmYH8sNmsfTeWg4yu//7u1VD/qIUkgKJTpGom9oHXmB4g==}

  js-tokens@4.0.0:
    resolution: {integrity: sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==}

  js-yaml@3.14.1:
    resolution: {integrity: sha512-okMH7OXXJ7YrN9Ok3/SXrnu4iX9yOk+25nqX4imS2npuvTYDmo/QEZoqwZkYaIDk3jVvBOTOIEgEhaLOynBS9g==}
    hasBin: true

  js-yaml@4.1.0:
    resolution: {integrity: sha512-wpxZs9NoxZaJESJGIZTyDEaYpl0FKSA+FB9aJiyemKhMwkxQg63h4T1KJgUGHpTqPDNRcmmYLugrRjJlBtWvRA==}
    hasBin: true

  jsesc@3.1.0:
    resolution: {integrity: sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==}
    engines: {node: '>=6'}
    hasBin: true

  json-buffer@3.0.1:
    resolution: {integrity: sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==}

  json-parse-even-better-errors@2.3.1:
    resolution: {integrity: sha512-xyFwyhro/JEof6Ghe2iz2NcXoj2sloNsWr/XsERDK/oiPCfaNhl5ONfp+jQdAZRQQ0IJWNzH9zIZF7li91kh2w==}

  json-schema-traverse@0.4.1:
    resolution: {integrity: sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==}

  json-schema-traverse@1.0.0:
    resolution: {integrity: sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==}

  json-stable-stringify-without-jsonify@1.0.1:
    resolution: {integrity: sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==}

  json5@2.2.3:
    resolution: {integrity: sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==}
    engines: {node: '>=6'}
    hasBin: true

  jsonc-parser@3.3.1:
    resolution: {integrity: sha512-HUgH65KyejrUFPvHFPbqOY0rsFip3Bo5wb4ngvdi1EpCYWUQDC5V+Y7mZws+DLkr4M//zQJoanu1SP+87Dv1oQ==}

  jsonfile@6.1.0:
    resolution: {integrity: sha512-5dgndWOriYSm5cnYaJNhalLNDKOqFwyDB/rr1E9ZsGciGvKPs8R2xYGCacuf3z6K1YKDz182fd+fY3cn3pMqXQ==}

  keyv@4.5.4:
    resolution: {integrity: sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==}

  kind-of@6.0.3:
    resolution: {integrity: sha512-dcS1ul+9tmeD95T+x28/ehLgd9mENa3LsvDTtzm3vyBEO7RPptvAD+t44WVXaUjTBRcrpFeFlC8WCruUR456hw==}
    engines: {node: '>=0.10.0'}

  kleur@3.0.3:
    resolution: {integrity: sha512-eTIzlVOSUR+JxdDFepEYcBMtZ9Qqdef+rnzWdRZuMbOywu5tO2w2N7rqjoANZ5k9vywhL6Br1VRjUIgTQx4E8w==}
    engines: {node: '>=6'}

  langsmith@0.1.68:
    resolution: {integrity: sha512-otmiysWtVAqzMx3CJ4PrtUBhWRG5Co8Z4o7hSZENPjlit9/j3/vm3TSvbaxpDYakZxtMjhkcJTqrdYFipISEiQ==}
    peerDependencies:
      openai: '*'
    peerDependenciesMeta:
      openai:
        optional: true

  langsmith@0.3.7:
    resolution: {integrity: sha512-wakN1hxGkm1JR2PpAV7fiT7oC99LKcgxiuUrYGZWPbuj7Y8EPF19F7VNr4B+hA219bfaeWTa4Lxy2YrtPSKnQA==}
    peerDependencies:
      openai: '*'
    peerDependenciesMeta:
      openai:
        optional: true

  leven@3.1.0:
    resolution: {integrity: sha512-qsda+H8jTaUaN/x5vzW2rzc+8Rw4TAQ/4KjB46IwK5VH+IlVeeeje/EoZRpiXvIqjFgK84QffqPztGI3VBLG1A==}
    engines: {node: '>=6'}

  levn@0.4.1:
    resolution: {integrity: sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==}
    engines: {node: '>= 0.8.0'}

  lines-and-columns@1.2.4:
    resolution: {integrity: sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg==}

  loader-runner@4.3.0:
    resolution: {integrity: sha512-3R/1M+yS3j5ou80Me59j7F9IMs4PXs3VqRrm0TU3AbKPxlmpoY1TNscJV/oGJXo8qCatFGTfDbY6W6ipGOYXfg==}
    engines: {node: '>=6.11.5'}

  locate-path@5.0.0:
    resolution: {integrity: sha512-t7hw9pI+WvuwNJXwk5zVHpyhIqzg2qTlklJOf0mVxGSbe3Fp2VieZcduNYjaLDoy6p9uGpQEGWG87WpMKlNq8g==}
    engines: {node: '>=8'}

  locate-path@6.0.0:
    resolution: {integrity: sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==}
    engines: {node: '>=10'}

  lodash.memoize@4.1.2:
    resolution: {integrity: sha512-t7j+NzmgnQzTAYXcsHYLgimltOV1MXHtlOWf6GjL9Kj8GK5FInw5JotxvbOs+IvV1/Dzo04/fCGfLVs7aXb4Ag==}

  lodash.merge@4.6.2:
    resolution: {integrity: sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==}

  lodash@4.17.21:
    resolution: {integrity: sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==}

  log-symbols@4.1.0:
    resolution: {integrity: sha512-8XPvpAA8uyhfteu8pIvQxpJZ7SYYdpUivZpGy6sFsBuKRY/7rQGavedeB8aK+Zkyq6upMFVL/9AW6vOYzfRyLg==}
    engines: {node: '>=10'}

  lowercase-keys@3.0.0:
    resolution: {integrity: sha512-ozCC6gdQ+glXOQsveKD0YsDy8DSQFjDTz4zyzEHNV5+JP5D62LmfDZ6o1cycFx9ouG940M5dE8C8CTewdj2YWQ==}
    engines: {node: ^12.20.0 || ^14.13.1 || >=16.0.0}

  lru-cache@11.0.2:
    resolution: {integrity: sha512-123qHRfJBmo2jXDbo/a5YOQrJoHF/GNQTLzQ5+IdK5pWpceK17yRc6ozlWd25FxvGKQbIUs91fDFkXmDHTKcyA==}
    engines: {node: 20 || >=22}

  lru-cache@5.1.1:
    resolution: {integrity: sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==}

  magic-string@0.30.12:
    resolution: {integrity: sha512-Ea8I3sQMVXr8JhN4z+H/d8zwo+tYDgHE9+5G4Wnrwhs0gaK9fXTKx0Tw5Xwsd/bCPTTZNRAdpyzvoeORe9LYpw==}

  magic-string@0.30.17:
    resolution: {integrity: sha512-sNPKHvyjVf7gyjwS4xGTaW/mCnF8wnjtifKBEhxfZ7E/S8tQ0rssrwGNn6q8JH/ohItJfSQp9mBtQYuTlH5QnA==}

  make-dir@4.0.0:
    resolution: {integrity: sha512-hXdUTZYIVOt1Ex//jAQi+wTZZpUpwBj/0QsOzqegb3rGMMeJiSEu5xLHnYfBrRV4RH2+OCSOO95Is/7x1WJ4bw==}
    engines: {node: '>=10'}

  make-error@1.3.6:
    resolution: {integrity: sha512-s8UhlNe7vPKomQhC1qFelMokr/Sc3AgNbso3n74mVPA5LTZwkB9NlXf4XPamLxJE8h0gh73rM94xvwRT2CVInw==}

  makeerror@1.0.12:
    resolution: {integrity: sha512-JmqCvUhmt43madlpFzG4BQzG2Z3m6tvQDNKdClZnO3VbIudJYmxsT0FNJMeiB2+JTSlTQTSbU8QdesVmwJcmLg==}

  math-intrinsics@1.1.0:
    resolution: {integrity: sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==}
    engines: {node: '>= 0.4'}

  md5@2.3.0:
    resolution: {integrity: sha512-T1GITYmFaKuO91vxyoQMFETst+O71VUPEU3ze5GNzDm0OWdP8v1ziTaAEPUr/3kLsY3Sftgz242A1SetQiDL7g==}

  media-typer@0.3.0:
    resolution: {integrity: sha512-dq+qelQ9akHpcOl/gUVRTxVIOkAJ1wR3QAvb4RsVjS8oVoFjDGTc679wJYmUmknUF5HwMLOgb5O+a3KxfWapPQ==}
    engines: {node: '>= 0.6'}

  media-typer@1.1.0:
    resolution: {integrity: sha512-aisnrDP4GNe06UcKFnV5bfMNPBUw4jsLGaWwWfnH3v02GnBuXX2MCVn5RbrWo0j3pczUilYblq7fQ7Nw2t5XKw==}
    engines: {node: '>= 0.8'}

  memfs@3.5.3:
    resolution: {integrity: sha512-UERzLsxzllchadvbPs5aolHh65ISpKpM+ccLbOJ8/vvpBKmAWf+la7dXFy7Mr0ySHbdHrFv5kGFCUHHe6GFEmw==}
    engines: {node: '>= 4.0.0'}

  merge-descriptors@2.0.0:
    resolution: {integrity: sha512-Snk314V5ayFLhp3fkUREub6WtjBfPdCPY1Ln8/8munuLuiYhsABgBVWsozAG+MWMbVEvcdcpbi9R7ww22l9Q3g==}
    engines: {node: '>=18'}

  merge-stream@2.0.0:
    resolution: {integrity: sha512-abv/qOcuPfk3URPfDzmZU1LKmuw8kT+0nIHvKrKgFrwifol/doWcdA4ZqsWQ8ENrFKkd67Mfpo/LovbIUsbt3w==}

  merge2@1.4.1:
    resolution: {integrity: sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==}
    engines: {node: '>= 8'}

  methods@1.1.2:
    resolution: {integrity: sha512-iclAHeNqNm68zFtnZ0e+1L2yUIdvzNoauKU4WBA3VvH/vPFieF7qfRlwUZU+DA9P9bPXIS90ulxoUoCH23sV2w==}
    engines: {node: '>= 0.6'}

  micromatch@4.0.8:
    resolution: {integrity: sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==}
    engines: {node: '>=8.6'}

  mime-db@1.52.0:
    resolution: {integrity: sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==}
    engines: {node: '>= 0.6'}

  mime-db@1.53.0:
    resolution: {integrity: sha512-oHlN/w+3MQ3rba9rqFr6V/ypF10LSkdwUysQL7GkXoTgIWeV+tcXGA852TBxH+gsh8UWoyhR1hKcoMJTuWflpg==}
    engines: {node: '>= 0.6'}

  mime-types@2.1.35:
    resolution: {integrity: sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==}
    engines: {node: '>= 0.6'}

  mime-types@3.0.0:
    resolution: {integrity: sha512-XqoSHeCGjVClAmoGFG3lVFqQFRIrTVw2OH3axRqAcfaw+gHWIfnASS92AV+Rl/mk0MupgZTRHQOjxY6YVnzK5w==}
    engines: {node: '>= 0.6'}

  mime@2.6.0:
    resolution: {integrity: sha512-USPkMeET31rOMiarsBNIHZKLGgvKc/LrjofAnBlOttf5ajRvqiRA8QsenbcooctK6d6Ts6aqZXBA+XbkKthiQg==}
    engines: {node: '>=4.0.0'}
    hasBin: true

  mimic-fn@2.1.0:
    resolution: {integrity: sha512-OqbOk5oEQeAZ8WXWydlu9HJjz9WVdEIvamMCcXmuqUYjTknH/sqsWvhQ3vgwKFRR1HpjvNBKQ37nbJgYzGqGcg==}
    engines: {node: '>=6'}

  mimic-response@3.1.0:
    resolution: {integrity: sha512-z0yWI+4FDrrweS8Zmt4Ej5HdJmky15+L2e6Wgn3+iK5fWzb6T3fhNFq2+MeTRb064c6Wr4N/wv0DzQTjNzHNGQ==}
    engines: {node: '>=10'}

  mimic-response@4.0.0:
    resolution: {integrity: sha512-e5ISH9xMYU0DzrT+jl8q2ze9D6eWBto+I8CNpe+VI+K2J/F/k3PdkdTdz4wvGVH4NTpo+NRYTVIuMQEMMcsLqg==}
    engines: {node: ^12.20.0 || ^14.13.1 || >=16.0.0}

  minimatch@10.0.1:
    resolution: {integrity: sha512-ethXTt3SGGR+95gudmqJ1eNhRO7eGEGIgYA9vnPatK4/etz2MEVDno5GMCibdMTuBMyElzIlgxMna3K94XDIDQ==}
    engines: {node: 20 || >=22}

  minimatch@3.1.2:
    resolution: {integrity: sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==}

  minimatch@5.1.6:
    resolution: {integrity: sha512-lKwV/1brpG6mBUFHtb7NUmtABCb2WZZmm2wNiOA5hAb8VdCS4B3dtMWyvcoViccwAW/COERjXLt0zP1zXUN26g==}
    engines: {node: '>=10'}

  minimatch@9.0.5:
    resolution: {integrity: sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow==}
    engines: {node: '>=16 || 14 >=14.17'}

  minimist@1.2.8:
    resolution: {integrity: sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==}

  minipass@7.1.2:
    resolution: {integrity: sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw==}
    engines: {node: '>=16 || 14 >=14.17'}

  mkdirp@0.5.6:
    resolution: {integrity: sha512-FP+p8RB8OWpF3YZBCrP5gtADmtXApB5AMLn+vdyA+PyxCjrCs00mjyUozssO33cwDeT3wNGdLxJ5M//YqtHAJw==}
    hasBin: true

  ml-array-mean@1.1.6:
    resolution: {integrity: sha512-MIdf7Zc8HznwIisyiJGRH9tRigg3Yf4FldW8DxKxpCCv/g5CafTw0RRu51nojVEOXuCQC7DRVVu5c7XXO/5joQ==}

  ml-array-sum@1.1.6:
    resolution: {integrity: sha512-29mAh2GwH7ZmiRnup4UyibQZB9+ZLyMShvt4cH4eTK+cL2oEMIZFnSyB3SS8MlsTh6q/w/yh48KmqLxmovN4Dw==}

  ml-distance-euclidean@2.0.0:
    resolution: {integrity: sha512-yC9/2o8QF0A3m/0IXqCTXCzz2pNEzvmcE/9HFKOZGnTjatvBbsn4lWYJkxENkA4Ug2fnYl7PXQxnPi21sgMy/Q==}

  ml-distance@4.0.1:
    resolution: {integrity: sha512-feZ5ziXs01zhyFUUUeZV5hwc0f5JW0Sh0ckU1koZe/wdVkJdGxcP06KNQuF0WBTj8FttQUzcvQcpcrOp/XrlEw==}

  ml-tree-similarity@1.0.0:
    resolution: {integrity: sha512-XJUyYqjSuUQkNQHMscr6tcjldsOoAekxADTplt40QKfwW6nd++1wHWV9AArl0Zvw/TIHgNaZZNvr8QGvE8wLRg==}

  ms@2.0.0:
    resolution: {integrity: sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==}

  ms@2.1.2:
    resolution: {integrity: sha512-sGkPx+VjMtmA6MX27oA4FBFELFCZZ4S4XqeGOXCv68tT+jb3vk/RyaKWP0PTKyWtmLSM0b+adUTEvbs1PEaH2w==}

  ms@2.1.3:
    resolution: {integrity: sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==}

  multer@1.4.5-lts.1:
    resolution: {integrity: sha512-ywPWvcDMeH+z9gQq5qYHCCy+ethsk4goepZ45GLD63fOu0YcNecQxi64nDs3qluZB+murG3/D4dJ7+dGctcCQQ==}
    engines: {node: '>= 6.0.0'}

  mustache@4.2.0:
    resolution: {integrity: sha512-71ippSywq5Yb7/tVYyGbkBggbU8H3u5Rz56fH60jGFgr8uHwxs+aSKeqmluIVzM0m0kB7xQjKS6qPfd0b2ZoqQ==}
    hasBin: true

  mute-stream@2.0.0:
    resolution: {integrity: sha512-WWdIxpyjEn+FhQJQQv9aQAYlHoNVdzIzUySNV1gHUPDSdZJ3yZn7pAAbQcV7B56Mvu881q9FZV+0Vx2xC44VWA==}
    engines: {node: ^18.17.0 || >=20.5.0}

  natural-compare@1.4.0:
    resolution: {integrity: sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==}

  negotiator@0.6.3:
    resolution: {integrity: sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==}
    engines: {node: '>= 0.6'}

  negotiator@1.0.0:
    resolution: {integrity: sha512-8Ofs/AUQh8MaEcrlq5xOX0CQ9ypTF5dl78mjlMNfOK08fzpgTHQRQPBxcPlEtIw0yRpws+Zo/3r+5WRby7u3Gg==}
    engines: {node: '>= 0.6'}

  neo-async@2.6.2:
    resolution: {integrity: sha512-Yd3UES5mWCSqR+qNT93S3UoYUkqAZ9lLg8a7g9rimsWmYGK8cVToA4/sF3RrshdyV3sAGMXVUmpMYOw+dLpOuw==}

  node-abort-controller@3.1.1:
    resolution: {integrity: sha512-AGK2yQKIjRuqnc6VkX2Xj5d+QW8xZ87pa1UK6yA6ouUyuxfHuMP6umE5QK7UmTeOAymo+Zx1Fxiuw9rVx8taHQ==}

  node-domexception@1.0.0:
    resolution: {integrity: sha512-/jKZoMpw0F8GRwl4/eLROPA3cfcXtLApP0QzLmUT/HuPCZWyB7IY9ZrMeKw2O/nFIqPQB3PVM9aYm0F312AXDQ==}
    engines: {node: '>=10.5.0'}

  node-emoji@1.11.0:
    resolution: {integrity: sha512-wo2DpQkQp7Sjm2A0cq+sN7EHKO6Sl0ctXeBdFZrL9T9+UywORbufTcTZxom8YqpLQt/FqNMUkOpkZrJVYSKD3A==}

  node-fetch@2.7.0:
    resolution: {integrity: sha512-c4FRfUm/dbcWZ7U+1Wq0AwCyFL+3nt2bEw05wfxSz+DWpWsitgmSgYmy2dQdWyKC1694ELPqMs/YzUSNozLt8A==}
    engines: {node: 4.x || >=6.0.0}
    peerDependencies:
      encoding: ^0.1.0
    peerDependenciesMeta:
      encoding:
        optional: true

  node-int64@0.4.0:
    resolution: {integrity: sha512-O5lz91xSOeoXP6DulyHfllpq+Eg00MWitZIbtPfoSEvqIHdl5gfcY6hYzDWnj0qD5tz52PI08u9qUvSVeUBeHw==}

  node-releases@2.0.19:
    resolution: {integrity: sha512-xxOWJsBKtzAq7DY0J+DTzuz58K8e7sJbdgwkbMWQe8UYB6ekmsQ45q0M/tJDsGaZmbC+l7n57UV8Hl5tHxO9uw==}

  normalize-path@3.0.0:
    resolution: {integrity: sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA==}
    engines: {node: '>=0.10.0'}

  normalize-url@8.0.1:
    resolution: {integrity: sha512-IO9QvjUMWxPQQhs60oOu10CRkWCiZzSUkzbXGGV9pviYl1fXYcvkzQ5jV9z8Y6un8ARoVRl4EtC6v6jNqbaJ/w==}
    engines: {node: '>=14.16'}

  npm-run-path@4.0.1:
    resolution: {integrity: sha512-S48WzZW777zhNIrn7gxOlISNAqi9ZC/uQFnRdbeIHhZhCA6UqpkOT8T1G7BvfdgP4Er8gF4sUbaS0i7QvIfCWw==}
    engines: {node: '>=8'}

  nth-check@2.1.1:
    resolution: {integrity: sha512-lqjrjmaOoAnWfMmBPL+XNnynZh2+swxiX3WUE0s4yEHI6m+AwrK2UZOimIRl3X/4QctVqS8AiZjFqyOGrMXb/w==}

  num-sort@2.1.0:
    resolution: {integrity: sha512-1MQz1Ed8z2yckoBeSfkQHHO9K1yDRxxtotKSJ9yvcTUUxSvfvzEq5GwBrjjHEpMlq/k5gvXdmJ1SbYxWtpNoVg==}
    engines: {node: '>=8'}

  object-assign@4.1.1:
    resolution: {integrity: sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==}
    engines: {node: '>=0.10.0'}

  object-hash@3.0.0:
    resolution: {integrity: sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw==}
    engines: {node: '>= 6'}

  object-inspect@1.13.4:
    resolution: {integrity: sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==}
    engines: {node: '>= 0.4'}

  on-finished@2.4.1:
    resolution: {integrity: sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==}
    engines: {node: '>= 0.8'}

  once@1.4.0:
    resolution: {integrity: sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==}

  onetime@5.1.2:
    resolution: {integrity: sha512-kbpaSSGJTWdAY5KPVeMOKXSrPtr8C8C7wodJbcsd51jRnmD+GZu8Y0VoU6Dm5Z4vWr0Ig/1NKuWRKf7j5aaYSg==}
    engines: {node: '>=6'}

  openai@4.84.0:
    resolution: {integrity: sha512-Smu45QjqWcPXkTHAI7GSeW+sI9ZOqB9VW4wiuhBvWLGHYC9dn/3rIpG8PUysbCT+ciVyDdEdsx0zkgKQDoOx9Q==}
    hasBin: true
    peerDependencies:
      ws: ^8.18.0
      zod: ^3.23.8
    peerDependenciesMeta:
      ws:
        optional: true
      zod:
        optional: true

  optionator@0.9.4:
    resolution: {integrity: sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==}
    engines: {node: '>= 0.8.0'}

  ora@5.4.1:
    resolution: {integrity: sha512-5b6Y85tPxZZ7QytO+BQzysW31HJku27cRIlkbAXaNx+BdcVi+LlRFmVXzeF6a7JCwJpyw5c4b+YSVImQIrBpuQ==}
    engines: {node: '>=10'}

  os-tmpdir@1.0.2:
    resolution: {integrity: sha512-D2FR03Vir7FIu45XBY20mTb+/ZSWB00sjU9jdQXt83gDrI4Ztz5Fs7/yy74g2N5SVQY4xY1qDr4rNddwYRVX0g==}
    engines: {node: '>=0.10.0'}

  p-cancelable@3.0.0:
    resolution: {integrity: sha512-mlVgR3PGuzlo0MmTdk4cXqXWlwQDLnONTAg6sm62XkMJEiRxN3GL3SffkYvqwonbkJBcrI7Uvv5Zh9yjvn2iUw==}
    engines: {node: '>=12.20'}

  p-finally@1.0.0:
    resolution: {integrity: sha512-LICb2p9CB7FS+0eR1oqWnHhp0FljGLZCWBE9aix0Uye9W8LTQPwMTYVGWQWIw9RdQiDg4+epXQODwIYJtSJaow==}
    engines: {node: '>=4'}

  p-limit@2.3.0:
    resolution: {integrity: sha512-//88mFWSJx8lxCzwdAABTJL2MyWB12+eIY7MDL2SqLmAkeKU9qxRvWuSyTjm3FUmpBEMuFfckAIqEaVGUDxb6w==}
    engines: {node: '>=6'}

  p-limit@3.1.0:
    resolution: {integrity: sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==}
    engines: {node: '>=10'}

  p-locate@4.1.0:
    resolution: {integrity: sha512-R79ZZ/0wAxKGu3oYMlz8jy/kbhsNrS7SKZ7PxEHBgJ5+F2mtFW2fK2cOtBh1cHYkQsbzFV7I+EoRKe6Yt0oK7A==}
    engines: {node: '>=8'}

  p-locate@5.0.0:
    resolution: {integrity: sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==}
    engines: {node: '>=10'}

  p-queue@6.6.2:
    resolution: {integrity: sha512-RwFpb72c/BhQLEXIZ5K2e+AhgNVmIejGlTgiB9MzZ0e93GRvqZ7uSi0dvRF7/XIXDeNkra2fNHBxTyPDGySpjQ==}
    engines: {node: '>=8'}

  p-retry@4.6.2:
    resolution: {integrity: sha512-312Id396EbJdvRONlngUx0NydfrIQ5lsYu0znKVUzVvArzEIt08V1qhtyESbGVd1FGX7UKtiFp5uwKZdM8wIuQ==}
    engines: {node: '>=8'}

  p-timeout@3.2.0:
    resolution: {integrity: sha512-rhIwUycgwwKcP9yTOOFK/AKsAopjjCakVqLHePO3CC6Mir1Z99xT+R63jZxAT5lFZLa2inS5h+ZS2GvR99/FBg==}
    engines: {node: '>=8'}

  p-try@2.2.0:
    resolution: {integrity: sha512-R4nPAVTAU0B9D35/Gk3uJf/7XYbQcyohSKdvAxIRSNghFl4e71hVoGnBNQz9cWaXxO2I10KTC+3jMdvvoKw6dQ==}
    engines: {node: '>=6'}

  package-json-from-dist@1.0.1:
    resolution: {integrity: sha512-UEZIS3/by4OC8vL3P2dTXRETpebLI2NiI5vIrjaD/5UtrkFX/tNbwjTSRAGC/+7CAo2pIcBaRgWmcBBHcsaCIw==}

  parent-module@1.0.1:
    resolution: {integrity: sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==}
    engines: {node: '>=6'}

  parse-json@5.2.0:
    resolution: {integrity: sha512-ayCKvm/phCGxOkYRSCM82iDwct8/EonSEgCSxWxD7ve6jHggsFl4fZVQBPRNgQoKiuV/odhFrGzQXZwbifC8Rg==}
    engines: {node: '>=8'}

  parse5-htmlparser2-tree-adapter@7.1.0:
    resolution: {integrity: sha512-ruw5xyKs6lrpo9x9rCZqZZnIUntICjQAd0Wsmp396Ul9lN/h+ifgVV1x1gZHi8euej6wTfpqX8j+BFQxF0NS/g==}

  parse5-parser-stream@7.1.2:
    resolution: {integrity: sha512-JyeQc9iwFLn5TbvvqACIF/VXG6abODeB3Fwmv/TGdLk2LfbWkaySGY72at4+Ty7EkPZj854u4CrICqNk2qIbow==}

  parse5@7.2.1:
    resolution: {integrity: sha512-BuBYQYlv1ckiPdQi/ohiivi9Sagc9JG+Ozs0r7b/0iK3sKmrb0b9FdWdBbOdx6hBCM/F9Ir82ofnBhtZOjCRPQ==}

  parseurl@1.3.3:
    resolution: {integrity: sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==}
    engines: {node: '>= 0.8'}

  path-exists@4.0.0:
    resolution: {integrity: sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==}
    engines: {node: '>=8'}

  path-is-absolute@1.0.1:
    resolution: {integrity: sha512-AVbw3UJ2e9bq64vSaS9Am0fje1Pa8pbGqTTsmXfaIiMpnr5DlDhfJOuLj9Sf95ZPVDAUerDfEk88MPmPe7UCQg==}
    engines: {node: '>=0.10.0'}

  path-key@3.1.1:
    resolution: {integrity: sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==}
    engines: {node: '>=8'}

  path-parse@1.0.7:
    resolution: {integrity: sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==}

  path-scurry@2.0.0:
    resolution: {integrity: sha512-ypGJsmGtdXUOeM5u93TyeIEfEhM6s+ljAhrk5vAvSx8uyY/02OvrZnA0YNGUrPXfpJMgI1ODd3nwz8Npx4O4cg==}
    engines: {node: 20 || >=22}

  path-to-regexp@8.2.0:
    resolution: {integrity: sha512-TdrF7fW9Rphjq4RjrW0Kp2AW0Ahwu9sRGTkS6bvDi0SCwZlEZYmcfDbEsTz8RVk0EHIS/Vd1bv3JhG+1xZuAyQ==}
    engines: {node: '>=16'}

  path-type@4.0.0:
    resolution: {integrity: sha512-gDKb8aZMDeD/tZWs9P6+q0J9Mwkdl6xMV8TjnGP3qJVJ06bdMgkbBlLU8IdfOsIsFz2BW1rNVT3XuNEl8zPAvw==}
    engines: {node: '>=8'}

  peek-readable@5.4.2:
    resolution: {integrity: sha512-peBp3qZyuS6cNIJ2akRNG1uo1WJ1d0wTxg/fxMdZ0BqCVhx242bSFHM9eNqflfJVS9SsgkzgT/1UgnsurBOTMg==}
    engines: {node: '>=14.16'}

  pend@1.2.0:
    resolution: {integrity: sha512-F3asv42UuXchdzt+xXqfW1OGlVBe+mxa2mqI0pg5yAHZPvFmY3Y6drSf/GQ1A86WgWEN9Kzh/WrgKa6iGcHXLg==}

  picocolors@1.1.1:
    resolution: {integrity: sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==}

  picomatch@2.3.1:
    resolution: {integrity: sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA==}
    engines: {node: '>=8.6'}

  picomatch@4.0.2:
    resolution: {integrity: sha512-M7BAV6Rlcy5u+m6oPhAPFgJTzAioX/6B0DxyvDlo9l8+T3nLKbrczg2WLUyzd45L8RqfUMyGPzekbMvX2Ldkwg==}
    engines: {node: '>=12'}

  pirates@4.0.6:
    resolution: {integrity: sha512-saLsH7WeYYPiD25LDuLRRY/i+6HaPYr6G1OUlN39otzkSTxKnubR9RTxS3/Kk50s1g2JTgFwWQDQyplC5/SHZg==}
    engines: {node: '>= 6'}

  piscina@4.8.0:
    resolution: {integrity: sha512-EZJb+ZxDrQf3dihsUL7p42pjNyrNIFJCrRHPMgxu/svsj+P3xS3fuEWp7k2+rfsavfl1N0G29b1HGs7J0m8rZA==}

  pkg-dir@4.2.0:
    resolution: {integrity: sha512-HRDzbaKjC+AOWVXxAU/x54COGeIv9eb+6CkDSQoNTt4XyWoIJvuPsXizxu/Fr23EiekbtZwmh1IcIG/l/a10GQ==}
    engines: {node: '>=8'}

  pluralize@8.0.0:
    resolution: {integrity: sha512-Nc3IT5yHzflTfbjgqWcCPpo7DaKy4FnpB0l/zCAW0Tc7jxAiuqSxHasntB3D7887LSrA93kDJ9IXovxJYxyLCA==}
    engines: {node: '>=4'}

  prelude-ls@1.2.1:
    resolution: {integrity: sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==}
    engines: {node: '>= 0.8.0'}

  prettier-linter-helpers@1.0.0:
    resolution: {integrity: sha512-GbK2cP9nraSSUF9N2XwUwqfzlAFlMNYYl+ShE/V+H8a9uNl/oUqB1w2EL54Jh0OlyRSd8RfWYJ3coVS4TROP2w==}
    engines: {node: '>=6.0.0'}

  prettier@3.5.0:
    resolution: {integrity: sha512-quyMrVt6svPS7CjQ9gKb3GLEX/rl3BCL2oa/QkNcXv4YNVBC9olt3s+H7ukto06q7B1Qz46PbrKLO34PR6vXcA==}
    engines: {node: '>=14'}
    hasBin: true

  pretty-format@29.7.0:
    resolution: {integrity: sha512-Pdlw/oPxN+aXdmM9R00JVC9WVFoCLTKJvDVLgmJ+qAffBMxsV85l/Lu7sNx4zSzPyoL2euImuEwHhOXdEgNFZQ==}
    engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}

  process-nextick-args@2.0.1:
    resolution: {integrity: sha512-3ouUOpQhtgrbOa17J7+uxOTpITYWaGP7/AhoR3+A+/1e9skrzelGi/dXzEYyvbxubEF6Wn2ypscTKiKJFFn1ag==}

  prompts@2.4.2:
    resolution: {integrity: sha512-NxNv/kLguCA7p3jE8oL2aEBsrJWgAakBpgmgK6lpPWV+WuOmY6r2/zbAVnP+T8bQlA0nzHXSJSJW0Hq7ylaD2Q==}
    engines: {node: '>= 6'}

  proxy-addr@2.0.7:
    resolution: {integrity: sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==}
    engines: {node: '>= 0.10'}

  punycode@2.3.1:
    resolution: {integrity: sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==}
    engines: {node: '>=6'}

  pure-rand@6.1.0:
    resolution: {integrity: sha512-bVWawvoZoBYpp6yIoQtQXHZjmz35RSVHnUOTefl8Vcjr8snTPY1wnpSPMWekcFwbxI6gtmT7rSYPFvz71ldiOA==}

  qs@6.13.0:
    resolution: {integrity: sha512-+38qI9SOr8tfZ4QmJNplMUxqjbe7LKvvZgWdExBOmd+egZTtjLB67Gu0HRX3u/XOq7UU2Nx6nsjvS16Z9uwfpg==}
    engines: {node: '>=0.6'}

  qs@6.14.0:
    resolution: {integrity: sha512-YWWTjgABSKcvs/nWBi9PycY/JiPJqOD4JA6o9Sej2AtvSGarXxKC3OQSk4pAarbdQlKAh5D4FCQkJNkW+GAn3w==}
    engines: {node: '>=0.6'}

  queue-microtask@1.2.3:
    resolution: {integrity: sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A==}

  quick-lru@5.1.1:
    resolution: {integrity: sha512-WuyALRjWPDGtt/wzJiadO5AXY+8hZ80hVpe6MyivgraREW751X3SbhRvG3eLKOYN+8VEvqLcf3wdnt44Z4S4SA==}
    engines: {node: '>=10'}

  randombytes@2.1.0:
    resolution: {integrity: sha512-vYl3iOX+4CKUWuxGi9Ukhie6fsqXqS9FE2Zaic4tNFD2N2QQaXOMFbuKK4QmDHC0JO6B1Zp41J0LpT0oR68amQ==}

  range-parser@1.2.1:
    resolution: {integrity: sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==}
    engines: {node: '>= 0.6'}

  raw-body@3.0.0:
    resolution: {integrity: sha512-RmkhL8CAyCRPXCE28MMH0z2PNWQBNk2Q09ZdxM9IOOXwxwZbN+qbWaatPkdkWIKL2ZVDImrN/pK5HTRz2PcS4g==}
    engines: {node: '>= 0.8'}

  react-is@18.3.1:
    resolution: {integrity: sha512-/LLMVyas0ljjAtoYiPqYiL8VWXzUUdThrmU5+n20DZv+a+ClRoevUzw5JxU+Ieh5/c87ytoTBV9G1FiKfNJdmg==}

  readable-stream@2.3.8:
    resolution: {integrity: sha512-8p0AUk4XODgIewSi0l8Epjs+EVnWiK7NoDIEGU0HhE7+ZyY8D1IMY7odu5lRrFXGg71L15KG8QrPmum45RTtdA==}

  readable-stream@3.6.2:
    resolution: {integrity: sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==}
    engines: {node: '>= 6'}

  readdirp@3.6.0:
    resolution: {integrity: sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA==}
    engines: {node: '>=8.10.0'}

  readdirp@4.1.1:
    resolution: {integrity: sha512-h80JrZu/MHUZCyHu5ciuoI0+WxsCxzxJTILn6Fs8rxSnFPh+UVHYfeIxK1nVGugMqkfC4vJcBOYbkfkwYK0+gw==}
    engines: {node: '>= 14.18.0'}

  reflect-metadata@0.2.2:
    resolution: {integrity: sha512-urBwgfrvVP/eAyXx4hluJivBKzuEbSQs9rKWCrCkbSxNv8mxPcUZKeuoF3Uy4mJl3Lwprp6yy5/39VWigZ4K6Q==}

  repeat-string@1.6.1:
    resolution: {integrity: sha512-PV0dzCYDNfRi1jCDbJzpW7jNNDRuCOG/jI5ctQcGKt/clZD+YcPS3yIlWuTJMmESC8aevCFmWJy5wjAFgNqN6w==}
    engines: {node: '>=0.10'}

  require-directory@2.1.1:
    resolution: {integrity: sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==}
    engines: {node: '>=0.10.0'}

  require-from-string@2.0.2:
    resolution: {integrity: sha512-Xf0nWe6RseziFMu+Ap9biiUbmplq6S9/p+7w7YXP/JBHhrUDDUhwa+vANyubuqfZWTveU//DYVGsDG7RKL/vEw==}
    engines: {node: '>=0.10.0'}

  resolve-alpn@1.2.1:
    resolution: {integrity: sha512-0a1F4l73/ZFZOakJnQ3FvkJ2+gSTQWz/r2KE5OdDY0TxPm5h4GkqkWWfM47T7HsbnOtcJVEF4epCVy6u7Q3K+g==}

  resolve-cwd@3.0.0:
    resolution: {integrity: sha512-OrZaX2Mb+rJCpH/6CpSqt9xFVpN++x01XnN2ie9g6P5/3xelLAkXWVADpdz1IHD/KFfEXyE6V0U01OQ3UO2rEg==}
    engines: {node: '>=8'}

  resolve-from@4.0.0:
    resolution: {integrity: sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==}
    engines: {node: '>=4'}

  resolve-from@5.0.0:
    resolution: {integrity: sha512-qYg9KP24dD5qka9J47d0aVky0N+b4fTU89LN9iDnjB5waksiC49rvMB0PrUJQGoTmH50XPiqOvAjDfaijGxYZw==}
    engines: {node: '>=8'}

  resolve.exports@2.0.3:
    resolution: {integrity: sha512-OcXjMsGdhL4XnbShKpAcSqPMzQoYkYyhbEaeSko47MjRP9NfEQMhZkXL1DoFlt9LWQn4YttrdnV6X2OiyzBi+A==}
    engines: {node: '>=10'}

  resolve@1.22.10:
    resolution: {integrity: sha512-NPRy+/ncIMeDlTAsuqwKIiferiawhefFJtkNSW0qZJEqMEb+qBt/77B/jGeeek+F0uOeN05CDa6HXbbIgtVX4w==}
    engines: {node: '>= 0.4'}
    hasBin: true

  responselike@3.0.0:
    resolution: {integrity: sha512-40yHxbNcl2+rzXvZuVkrYohathsSJlMTXKryG5y8uciHv1+xDLHQpgjG64JUO9nrEq2jGLH6IZ8BcZyw3wrweg==}
    engines: {node: '>=14.16'}

  restore-cursor@3.1.0:
    resolution: {integrity: sha512-l+sSefzHpj5qimhFSE5a8nufZYAM3sBSVMAPtYkmC+4EH2anSGaEMXSD0izRQbu9nfyQ9y5JrVmp7E8oZrUjvA==}
    engines: {node: '>=8'}

  retry@0.13.1:
    resolution: {integrity: sha512-XQBQ3I8W1Cge0Seh+6gjj03LbmRFWuoszgK9ooCpwYIrhhoO80pfq4cUkU5DkknwfOfFteRwlZ56PYOGYyFWdg==}
    engines: {node: '>= 4'}

  reusify@1.0.4:
    resolution: {integrity: sha512-U9nH88a3fc/ekCF1l0/UP1IosiuIjyTh7hBvXVMHYgVcfGvt897Xguj2UOLDeI5BG2m7/uwyaLVT6fbtCwTyzw==}
    engines: {iojs: '>=1.0.0', node: '>=0.10.0'}

  robots-parser@3.0.1:
    resolution: {integrity: sha512-s+pyvQeIKIZ0dx5iJiQk1tPLJAWln39+MI5jtM8wnyws+G5azk+dMnMX0qfbqNetKKNgcWWOdi0sfm+FbQbgdQ==}
    engines: {node: '>=10.0.0'}

  router@2.1.0:
    resolution: {integrity: sha512-/m/NSLxeYEgWNtyC+WtNHCF7jbGxOibVWKnn+1Psff4dJGOfoXP+MuC/f2CwSmyiHdOIzYnYFp4W6GxWfekaLA==}
    engines: {node: '>= 18'}

  run-parallel@1.2.0:
    resolution: {integrity: sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA==}

  rxjs@7.8.1:
    resolution: {integrity: sha512-AA3TVj+0A2iuIoQkWEK/tqFjBq2j+6PO6Y0zJcvzLAFhEFIO3HL0vls9hWLncZbAAbK0mar7oZ4V079I/qPMxg==}

  safe-buffer@5.1.2:
    resolution: {integrity: sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g==}

  safe-buffer@5.2.1:
    resolution: {integrity: sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==}

  safer-buffer@2.1.2:
    resolution: {integrity: sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==}

  schema-utils@3.3.0:
    resolution: {integrity: sha512-pN/yOAvcC+5rQ5nERGuwrjLlYvLTbCibnZ1I7B1LaiAz9BRBlE9GMgE/eqV30P7aJQUf7Ddimy/RsbYO/GrVGg==}
    engines: {node: '>= 10.13.0'}

  schema-utils@4.3.0:
    resolution: {integrity: sha512-Gf9qqc58SpCA/xdziiHz35F4GNIWYWZrEshUc/G/r5BnLph6xpKuLeoJoQuj5WfBIx/eQLf+hmVPYHaxJu7V2g==}
    engines: {node: '>= 10.13.0'}

  seek-bzip@2.0.0:
    resolution: {integrity: sha512-SMguiTnYrhpLdk3PwfzHeotrcwi8bNV4iemL9tx9poR/yeaMYwB9VzR1w7b57DuWpuqR8n6oZboi0hj3AxZxQg==}
    hasBin: true

  semver-regex@4.0.5:
    resolution: {integrity: sha512-hunMQrEy1T6Jr2uEVjrAIqjwWcQTgOAcIM52C8MY1EZSD3DDNft04XzvYKPqjED65bNVVko0YI38nYeEHCX3yw==}
    engines: {node: '>=12'}

  semver-truncate@3.0.0:
    resolution: {integrity: sha512-LJWA9kSvMolR51oDE6PN3kALBNaUdkxzAGcexw8gjMA8xr5zUqK0JiR3CgARSqanYF3Z1YHvsErb1KDgh+v7Rg==}
    engines: {node: '>=12'}

  semver@6.3.1:
    resolution: {integrity: sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==}
    hasBin: true

  semver@7.7.1:
    resolution: {integrity: sha512-hlq8tAfn0m/61p4BVRcPzIGr6LKiMwo4VM6dGi6pt4qcRkmNzTcWq6eCEjEh+qXjkMDvPlOFFSGwQjoEa6gyMA==}
    engines: {node: '>=10'}
    hasBin: true

  send@1.1.0:
    resolution: {integrity: sha512-v67WcEouB5GxbTWL/4NeToqcZiAWEq90N888fczVArY8A79J0L4FD7vj5hm3eUMua5EpoQ59wa/oovY6TLvRUA==}
    engines: {node: '>= 18'}

  serialize-javascript@6.0.2:
    resolution: {integrity: sha512-Saa1xPByTTq2gdeFZYLLo+RFE35NHZkAbqZeWNd3BpzppeVisAqpDjcp8dyf6uIvEqJRd46jemmyA4iFIeVk8g==}

  serve-static@2.1.0:
    resolution: {integrity: sha512-A3We5UfEjG8Z7VkDv6uItWw6HY2bBSBJT1KtVESn6EOoOr2jAxNhxWCLY3jDE2WcuHXByWju74ck3ZgLwL8xmA==}
    engines: {node: '>= 18'}

  setprototypeof@1.2.0:
    resolution: {integrity: sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==}

  shebang-command@2.0.0:
    resolution: {integrity: sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==}
    engines: {node: '>=8'}

  shebang-regex@3.0.0:
    resolution: {integrity: sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==}
    engines: {node: '>=8'}

  side-channel-list@1.0.0:
    resolution: {integrity: sha512-FCLHtRD/gnpCiCHEiJLOwdmFP+wzCmDEkc9y7NsYxeF4u7Btsn1ZuwgwJGxImImHicJArLP4R0yX4c2KCrMrTA==}
    engines: {node: '>= 0.4'}

  side-channel-map@1.0.1:
    resolution: {integrity: sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==}
    engines: {node: '>= 0.4'}

  side-channel-weakmap@1.0.2:
    resolution: {integrity: sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==}
    engines: {node: '>= 0.4'}

  side-channel@1.1.0:
    resolution: {integrity: sha512-ZX99e6tRweoUXqR+VBrslhda51Nh5MTQwou5tnUDgbtyM0dBgmhEDtWGP/xbKn6hqfPRHujUNwz5fy/wbbhnpw==}
    engines: {node: '>= 0.4'}

  signal-exit@3.0.7:
    resolution: {integrity: sha512-wnD2ZE+l+SPC/uoS0vXeE9L1+0wuaMqKlfz9AMUo38JsyLSBWSFcHR1Rri62LZc12vLr1gb3jl7iwQhgwpAbGQ==}

  signal-exit@4.1.0:
    resolution: {integrity: sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw==}
    engines: {node: '>=14'}

  simple-wcswidth@1.0.1:
    resolution: {integrity: sha512-xMO/8eNREtaROt7tJvWJqHBDTMFN4eiQ5I4JRMuilwfnFcV5W9u7RUkueNkdw0jPqGMX36iCywelS5yilTuOxg==}

  sisteransi@1.0.5:
    resolution: {integrity: sha512-bLGGlR1QxBcynn2d5YmDX4MGjlZvy2MRBDRNHLJ8VI6l6+9FUiyTFNJ0IveOSP0bcXgVDPRcfGqA0pjaqUpfVg==}

  slash@3.0.0:
    resolution: {integrity: sha512-g9Q1haeby36OSStwb4ntCGGGaKsaVSjQ68fBxoQcutl5fS1vuY18H3wSt3jFyFtrkx+Kz0V1G85A4MyAdDMi2Q==}
    engines: {node: '>=8'}

  socket.io-adapter@2.5.5:
    resolution: {integrity: sha512-eLDQas5dzPgOWCk9GuuJC2lBqItuhKI4uxGgo9aIV7MYbk2h9Q6uULEh8WBzThoI7l+qU9Ast9fVUmkqPP9wYg==}

  socket.io-parser@4.2.4:
    resolution: {integrity: sha512-/GbIKmo8ioc+NIWIhwdecY0ge+qVBSMdgxGygevmdHj24bsfgtCmcUUcQ5ZzcylGFHsN3k4HB4Cgkl96KVnuew==}
    engines: {node: '>=10.0.0'}

  socket.io@4.8.1:
    resolution: {integrity: sha512-oZ7iUCxph8WYRHHcjBEc9unw3adt5CmSNlppj/5Q4k2RIrhl8Z5yY2Xr4j9zj0+wzVZ0bxmYoGSzKJnRl6A4yg==}
    engines: {node: '>=10.2.0'}

  sort-keys-length@1.0.1:
    resolution: {integrity: sha512-GRbEOUqCxemTAk/b32F2xa8wDTs+Z1QHOkbhJDQTvv/6G3ZkbJ+frYWsTcc7cBB3Fu4wy4XlLCuNtJuMn7Gsvw==}
    engines: {node: '>=0.10.0'}

  sort-keys@1.1.2:
    resolution: {integrity: sha512-vzn8aSqKgytVik0iwdBEi+zevbTYZogewTUM6dtpmGwEcdzbub/TX4bCzRhebDCRC3QzXgJsLRKB2V/Oof7HXg==}
    engines: {node: '>=0.10.0'}

  source-map-support@0.5.13:
    resolution: {integrity: sha512-SHSKFHadjVA5oR4PPqhtAVdcBWwRYVd6g6cAXnIbRiIwc2EhPrTuKUBdSLvlEKyIP3GCf89fltvcZiP9MMFA1w==}

  source-map-support@0.5.21:
    resolution: {integrity: sha512-uBHU3L3czsIyYXKX88fdrGovxdSCoTGDRZ6SYXtSRxLZUzHg5P/66Ht6uoUlHu9EZod+inXhKo3qQgwXUT/y1w==}

  source-map@0.6.1:
    resolution: {integrity: sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==}
    engines: {node: '>=0.10.0'}

  source-map@0.7.4:
    resolution: {integrity: sha512-l3BikUxvPOcn5E74dZiq5BGsTb5yEwhaTSzccU6t4sDOH8NWJCstKO5QT2CvtFoK6F0saL7p9xHAqHOlCPJygA==}
    engines: {node: '>= 8'}

  sprintf-js@1.0.3:
    resolution: {integrity: sha512-D9cPgkvLlV3t3IzL0D0YLvGA9Ahk4PcvVwUbN0dSGr1aP0Nrt4AEnTUbuGvquEC0mA64Gqt1fzirlRs5ibXx8g==}

  stack-utils@2.0.6:
    resolution: {integrity: sha512-XlkWvfIm6RmsWtNJx+uqtKLS8eqFbxUg0ZzLXqY0caEy9l7hruX8IpiDnjsLavoBgqCCR71TqWO8MaXYheJ3RQ==}
    engines: {node: '>=10'}

  statuses@2.0.1:
    resolution: {integrity: sha512-RwNA9Z/7PrK06rYLIzFMlaF+l73iwpzsqRIFgbMLbTcLD6cOao82TaWefPXQvB2fOC4AjuYSEndS7N/mTCbkdQ==}
    engines: {node: '>= 0.8'}

  streamsearch@1.1.0:
    resolution: {integrity: sha512-Mcc5wHehp9aXz1ax6bZUyY5afg9u2rv5cqQI3mRrYkGC8rW2hM02jWuwjtL++LS5qinSyhj2QfLyNsuc+VsExg==}
    engines: {node: '>=10.0.0'}

  streamx@2.22.0:
    resolution: {integrity: sha512-sLh1evHOzBy/iWRiR6d1zRcLao4gGZr3C1kzNz4fopCOKJb6xD9ub8Mpi9Mr1R6id5o43S+d93fI48UC5uM9aw==}

  string-length@4.0.2:
    resolution: {integrity: sha512-+l6rNN5fYHNhZZy41RXsYptCjA2Igmq4EG7kZAYFQI1E1VTXarr6ZPXBg6eq7Y6eK4FEhY6AJlyuFIb/v/S0VQ==}
    engines: {node: '>=10'}

  string-width@4.2.3:
    resolution: {integrity: sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==}
    engines: {node: '>=8'}

  string-width@5.1.2:
    resolution: {integrity: sha512-HnLOCR3vjcY8beoNLtcjZ5/nxn2afmME6lhrDrebokqMap+XbeW8n9TXpPDOqdGK5qcI3oT0GKTW6wC7EMiVqA==}
    engines: {node: '>=12'}

  string_decoder@1.1.1:
    resolution: {integrity: sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==}

  string_decoder@1.3.0:
    resolution: {integrity: sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==}

  strip-ansi@6.0.1:
    resolution: {integrity: sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==}
    engines: {node: '>=8'}

  strip-ansi@7.1.0:
    resolution: {integrity: sha512-iq6eVVI64nQQTRYq2KtEg2d2uU7LElhTJwsH4YzIHZshxlgZms/wIc4VoDQTlG/IvVIrBKG06CrZnp0qv7hkcQ==}
    engines: {node: '>=12'}

  strip-bom@3.0.0:
    resolution: {integrity: sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA==}
    engines: {node: '>=4'}

  strip-bom@4.0.0:
    resolution: {integrity: sha512-3xurFv5tEgii33Zi8Jtp55wEIILR9eh34FAW00PZf+JnSsTmV/ioewSgQl97JHvgjoRGwPShsWm+IdrxB35d0w==}
    engines: {node: '>=8'}

  strip-dirs@3.0.0:
    resolution: {integrity: sha512-I0sdgcFTfKQlUPZyAqPJmSG3HLO9rWDFnxonnIbskYNM3DwFOeTNB5KzVq3dA1GdRAc/25b5Y7UO2TQfKWw4aQ==}

  strip-final-newline@2.0.0:
    resolution: {integrity: sha512-BrpvfNAE3dcvq7ll3xVumzjKjZQ5tI1sEUIKr3Uoks0XUl45St3FlatVqef9prk4jRDzhW6WZg+3bk93y6pLjA==}
    engines: {node: '>=6'}

  strip-json-comments@3.1.1:
    resolution: {integrity: sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==}
    engines: {node: '>=8'}

  strnum@1.0.5:
    resolution: {integrity: sha512-J8bbNyKKXl5qYcR36TIO8W3mVGVHrmmxsd5PAItGkmyzwJvybiw2IVq5nqd0i4LSNSkB/sx9VHllbfFdr9k1JA==}

  strtok3@9.1.1:
    resolution: {integrity: sha512-FhwotcEqjr241ZbjFzjlIYg6c5/L/s4yBGWSMvJ9UoExiSqL+FnFA/CaeZx17WGaZMS/4SOZp8wH18jSS4R4lw==}
    engines: {node: '>=16'}

  superagent@9.0.2:
    resolution: {integrity: sha512-xuW7dzkUpcJq7QnhOsnNUgtYp3xRwpt2F7abdRYIpCsAt0hhUqia0EdxyXZQQpNmGtsCzYHryaKSV3q3GJnq7w==}
    engines: {node: '>=14.18.0'}

  supertest@7.0.0:
    resolution: {integrity: sha512-qlsr7fIC0lSddmA3tzojvzubYxvlGtzumcdHgPwbFWMISQwL22MhM2Y3LNt+6w9Yyx7559VW5ab70dgphm8qQA==}
    engines: {node: '>=14.18.0'}

  supports-color@7.2.0:
    resolution: {integrity: sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==}
    engines: {node: '>=8'}

  supports-color@8.1.1:
    resolution: {integrity: sha512-MpUEN2OodtUzxvKQl72cUF7RQ5EiHsGvSsVG0ia9c5RbWGL2CI4C7EpPS8UTBIplnlzZiNuV56w+FuNxy3ty2Q==}
    engines: {node: '>=10'}

  supports-preserve-symlinks-flag@1.0.0:
    resolution: {integrity: sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==}
    engines: {node: '>= 0.4'}

  symbol-observable@4.0.0:
    resolution: {integrity: sha512-b19dMThMV4HVFynSAM1++gBHAbk2Tc/osgLIBZMKsyqh34jb2e8Os7T6ZW/Bt3pJFdBTd2JwAnAAEQV7rSNvcQ==}
    engines: {node: '>=0.10'}

  synckit@0.9.2:
    resolution: {integrity: sha512-vrozgXDQwYO72vHjUb/HnFbQx1exDjoKzqx23aXEg2a9VIg2TSFZ8FmeZpTjUCFMYw7mpX4BE2SFu8wI7asYsw==}
    engines: {node: ^14.18.0 || >=16.0.0}

  tapable@2.2.1:
    resolution: {integrity: sha512-GNzQvQTOIP6RyTfE2Qxb8ZVlNmw0n88vp1szwWRimP02mnTsx3Wtn5qRdqY9w2XduFNUgvOwhNnQsjwCp+kqaQ==}
    engines: {node: '>=6'}

  tar-stream@3.1.7:
    resolution: {integrity: sha512-qJj60CXt7IU1Ffyc3NJMjh6EkuCFej46zUqJ4J7pqYlThyd9bO0XBTmcOIhSzZJVWfsLks0+nle/j538YAW9RQ==}

  terser-webpack-plugin@5.3.11:
    resolution: {integrity: sha512-RVCsMfuD0+cTt3EwX8hSl2Ks56EbFHWmhluwcqoPKtBnfjiT6olaq7PRIRfhyU8nnC2MrnDrBLfrD/RGE+cVXQ==}
    engines: {node: '>= 10.13.0'}
    peerDependencies:
      '@swc/core': '*'
      esbuild: '*'
      uglify-js: '*'
      webpack: ^5.1.0
    peerDependenciesMeta:
      '@swc/core':
        optional: true
      esbuild:
        optional: true
      uglify-js:
        optional: true

  terser@5.38.2:
    resolution: {integrity: sha512-w8CXxxbFA5zfNsR/i8HZq5bvn18AK0O9jj7hyo1YqkovLxEFa0uP0LCVGZRqiRaKRFxXhELBp8SteeAjEnfeJg==}
    engines: {node: '>=10'}
    hasBin: true

  test-exclude@6.0.0:
    resolution: {integrity: sha512-cAGWPIyOHU6zlmg88jwm7VRyXnMN7iV68OGAbYDk/Mh/xC/pzVPlQtY6ngoIH/5/tciuhGfvESU8GrHrcxD56w==}
    engines: {node: '>=8'}

  text-decoder@1.2.3:
    resolution: {integrity: sha512-3/o9z3X0X0fTupwsYvR03pJ/DjWuqqrfwBgTQzdWDiQSm9KitAyz/9WqsT2JQW7KV2m+bC2ol/zqpW37NHxLaA==}

  through@2.3.8:
    resolution: {integrity: sha512-w89qg7PI8wAdvX60bMDP+bFoD5Dvhm9oLheFp5O4a2QF0cSBGsBX4qZmadPMvVqlLJBBci+WqGGOAPvcDeNSVg==}

  tmp@0.0.33:
    resolution: {integrity: sha512-jRCJlojKnZ3addtTOjdIqoRuPEKBvNXcGYqzO6zWZX8KfKEpnGY5jfggJQ3EjKuu8D4bJRr0y+cYJFmYbImXGw==}
    engines: {node: '>=0.6.0'}

  tmpl@1.0.5:
    resolution: {integrity: sha512-3f0uOEAQwIqGuWW2MVzYg8fV/QNnc/IpuJNG837rLuczAaLVHslWHZQj4IGiEl5Hs3kkbhwL9Ab7Hrsmuj+Smw==}

  to-regex-range@5.0.1:
    resolution: {integrity: sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==}
    engines: {node: '>=8.0'}

  toidentifier@1.0.1:
    resolution: {integrity: sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==}
    engines: {node: '>=0.6'}

  token-types@6.0.0:
    resolution: {integrity: sha512-lbDrTLVsHhOMljPscd0yitpozq7Ga2M5Cvez5AjGg8GASBjtt6iERCAJ93yommPmz62fb45oFIXHEZ3u9bfJEA==}
    engines: {node: '>=14.16'}

  tr46@0.0.3:
    resolution: {integrity: sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==}

  tree-kill@1.2.2:
    resolution: {integrity: sha512-L0Orpi8qGpRG//Nd+H90vFB+3iHnue1zSSGmNOOCh1GLJ7rUKVwV2HvijphGQS2UmhUZewS9VgvxYIdgr+fG1A==}
    hasBin: true

  ts-api-utils@2.0.1:
    resolution: {integrity: sha512-dnlgjFSVetynI8nzgJ+qF62efpglpWRk8isUEWZGWlJYySCTD6aKvbUDu+zbPeDakk3bg5H4XpitHukgfL1m9w==}
    engines: {node: '>=18.12'}
    peerDependencies:
      typescript: '>=4.8.4'

  ts-jest@29.2.5:
    resolution: {integrity: sha512-KD8zB2aAZrcKIdGk4OwpJggeLcH1FgrICqDSROWqlnJXGCXK4Mn6FcdK2B6670Xr73lHMG1kHw8R87A0ecZ+vA==}
    engines: {node: ^14.15.0 || ^16.10.0 || ^18.0.0 || >=20.0.0}
    hasBin: true
    peerDependencies:
      '@babel/core': '>=7.0.0-beta.0 <8'
      '@jest/transform': ^29.0.0
      '@jest/types': ^29.0.0
      babel-jest: ^29.0.0
      esbuild: '*'
      jest: ^29.0.0
      typescript: '>=4.3 <6'
    peerDependenciesMeta:
      '@babel/core':
        optional: true
      '@jest/transform':
        optional: true
      '@jest/types':
        optional: true
      babel-jest:
        optional: true
      esbuild:
        optional: true

  ts-loader@9.5.2:
    resolution: {integrity: sha512-Qo4piXvOTWcMGIgRiuFa6nHNm+54HbYaZCKqc9eeZCLRy3XqafQgwX2F7mofrbJG3g7EEb+lkiR+z2Lic2s3Zw==}
    engines: {node: '>=12.0.0'}
    peerDependencies:
      typescript: '*'
      webpack: ^5.0.0

  ts-node@10.9.2:
    resolution: {integrity: sha512-f0FFpIdcHgn8zcPSbf1dRevwt047YMnaiJM3u2w2RewrB+fob/zePZcrOyQoLMMO7aBIddLcQIEK5dYjkLnGrQ==}
    hasBin: true
    peerDependencies:
      '@swc/core': '>=1.2.50'
      '@swc/wasm': '>=1.2.50'
      '@types/node': '*'
      typescript: '>=2.7'
    peerDependenciesMeta:
      '@swc/core':
        optional: true
      '@swc/wasm':
        optional: true

  tsconfig-paths-webpack-plugin@4.2.0:
    resolution: {integrity: sha512-zbem3rfRS8BgeNK50Zz5SIQgXzLafiHjOwUAvk/38/o1jHn/V5QAgVUcz884or7WYcPaH3N2CIfUc2u0ul7UcA==}
    engines: {node: '>=10.13.0'}

  tsconfig-paths@4.2.0:
    resolution: {integrity: sha512-NoZ4roiN7LnbKn9QqE1amc9DJfzvZXxF4xDavcOWt1BPkdx+m+0gJuPM+S0vCe7zTJMYUP0R8pO2XMr+Y8oLIg==}
    engines: {node: '>=6'}

  tslib@2.8.1:
    resolution: {integrity: sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==}

  type-check@0.4.0:
    resolution: {integrity: sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==}
    engines: {node: '>= 0.8.0'}

  type-detect@4.0.8:
    resolution: {integrity: sha512-0fr/mIH1dlO+x7TlcMy+bIDqKPsw/70tVyeHW787goQjhmqaZe10uwLujubK9q9Lg6Fiho1KUKDYz0Z7k7g5/g==}
    engines: {node: '>=4'}

  type-fest@0.21.3:
    resolution: {integrity: sha512-t0rzBq87m3fVcduHDUFhKmyyX+9eo6WQjZvf51Ea/M0Q7+T374Jp1aUiyUl0GKxp8M/OETVHSDvmkyPgvX+X2w==}
    engines: {node: '>=10'}

  type-is@1.6.18:
    resolution: {integrity: sha512-TkRKr9sUTxEH8MdfuCSP7VizJyzRNMjj2J2do2Jr3Kym598JVdEksuzPQCnlFPW4ky9Q+iA+ma9BGm06XQBy8g==}
    engines: {node: '>= 0.6'}

  type-is@2.0.0:
    resolution: {integrity: sha512-gd0sGezQYCbWSbkZr75mln4YBidWUN60+devscpLF5mtRDUpiaTvKpBNrdaCvel1NdR2k6vclXybU5fBd2i+nw==}
    engines: {node: '>= 0.6'}

  typedarray@0.0.6:
    resolution: {integrity: sha512-/aCDEGatGvZ2BIk+HmLf4ifCJFwvKFNb9/JeZPMulfgFracn9QFcAf5GO8B/mweUjSoblS5In0cWhqpfs/5PQA==}

  typescript-eslint@8.24.0:
    resolution: {integrity: sha512-/lmv4366en/qbB32Vz5+kCNZEMf6xYHwh1z48suBwZvAtnXKbP+YhGe8OLE2BqC67LMqKkCNLtjejdwsdW6uOQ==}
    engines: {node: ^18.18.0 || ^20.9.0 || >=21.1.0}
    peerDependencies:
      eslint: ^8.57.0 || ^9.0.0
      typescript: '>=4.8.4 <5.8.0'

  typescript@5.7.3:
    resolution: {integrity: sha512-84MVSjMEHP+FQRPy3pX9sTVV/INIex71s9TL2Gm5FG/WG1SqXeKyZ0k7/blY/4FdOzI12CBy1vGc4og/eus0fw==}
    engines: {node: '>=14.17'}
    hasBin: true

  uid@2.0.2:
    resolution: {integrity: sha512-u3xV3X7uzvi5b1MncmZo3i2Aw222Zk1keqLA1YkHldREkAhAqi65wuPfe7lHx8H/Wzy+8CE7S7uS3jekIM5s8g==}
    engines: {node: '>=8'}

  uint8array-extras@1.4.0:
    resolution: {integrity: sha512-ZPtzy0hu4cZjv3z5NW9gfKnNLjoz4y6uv4HlelAjDK7sY/xOkKZv9xK/WQpcsBB3jEybChz9DPC2U/+cusjJVQ==}
    engines: {node: '>=18'}

  unbzip2-stream@1.4.3:
    resolution: {integrity: sha512-mlExGW4w71ebDJviH16lQLtZS32VKqsSfk80GCfUlwT/4/hNRFsoscrF/c++9xinkMzECL1uL9DDwXqFWkruPg==}

  undici-types@5.26.5:
    resolution: {integrity: sha512-JlCMO+ehdEIKqlFxk6IfVoAUVmgz7cU7zD/h9XZ0qzeosSHmUJVOzSQvvYSYWXkFXC+IfLKSIffhv0sVZup6pA==}

  undici-types@6.19.8:
    resolution: {integrity: sha512-ve2KP6f/JnbPBFyobGHuerC9g1FYGn/F8n1LWTwNxCEzd6IfqTwUQcNXgEtmmQ6DlRrC1hrSrBnCZPokRrDHjw==}

  undici@6.21.1:
    resolution: {integrity: sha512-q/1rj5D0/zayJB2FraXdaWxbhWiNKDvu8naDT2dl1yTlvJp4BLtOcp2a5BvgGNQpYYJzau7tf1WgKv3b+7mqpQ==}
    engines: {node: '>=18.17'}

  universalify@2.0.1:
    resolution: {integrity: sha512-gptHNQghINnc/vTGIk0SOFGFNXw7JVrlRUtConJRlvaw6DuX0wO5Jeko9sWrMBhh+PsYAZ7oXAiOnf/UKogyiw==}
    engines: {node: '>= 10.0.0'}

  unpipe@1.0.0:
    resolution: {integrity: sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==}
    engines: {node: '>= 0.8'}

  update-browserslist-db@1.1.2:
    resolution: {integrity: sha512-PPypAm5qvlD7XMZC3BujecnaOxwhrtoFR+Dqkk5Aa/6DssiH0ibKoketaj9w8LP7Bont1rYeoV5plxD7RTEPRg==}
    hasBin: true
    peerDependencies:
      browserslist: '>= 4.21.0'

  uri-js@4.4.1:
    resolution: {integrity: sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==}

  util-deprecate@1.0.2:
    resolution: {integrity: sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==}

  utils-merge@1.0.1:
    resolution: {integrity: sha512-pMZTvIkT1d+TFGvDOqodOclx0QWkkgi6Tdoa8gC8ffGAAqz9pzPTZWAybbsHHoED/ztMtkv/VoYTYyShUn81hA==}
    engines: {node: '>= 0.4.0'}

  uuid@10.0.0:
    resolution: {integrity: sha512-8XkAphELsDnEGrDxUOHB3RGvXz6TeuYSGEZBOjtTtPm2lwhGBjLgOzLHB63IUWfBpNucQjND6d3AOudO+H3RWQ==}
    hasBin: true

  uuid@9.0.1:
    resolution: {integrity: sha512-b+1eJOlsR9K8HJpow9Ok3fiWOWSIcIzXodvv0rQjVoOVNpWMpxf1wZNpt4y9h10odCNrqnYp1OBzRktckBe3sA==}
    hasBin: true

  v8-compile-cache-lib@3.0.1:
    resolution: {integrity: sha512-wa7YjyUGfNZngI/vtK0UHAN+lgDCxBPCylVXGp0zu59Fz5aiGtNXaq3DhIov063MorB+VfufLh3JlF2KdTK3xg==}

  v8-to-istanbul@9.3.0:
    resolution: {integrity: sha512-kiGUalWN+rgBJ/1OHZsBtU4rXZOfj/7rKQxULKlIzwzQSvMJUUNgPwJEEh7gU6xEVxC0ahoOBvN2YI8GH6FNgA==}
    engines: {node: '>=10.12.0'}

  vary@1.1.2:
    resolution: {integrity: sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==}
    engines: {node: '>= 0.8'}

  walker@1.0.8:
    resolution: {integrity: sha512-ts/8E8l5b7kY0vlWLewOkDXMmPdLcVV4GmOQLyxuSswIJsweeFZtAsMF7k1Nszz+TYBQrlYRmzOnr398y1JemQ==}

  watchpack@2.4.2:
    resolution: {integrity: sha512-TnbFSbcOCcDgjZ4piURLCbJ3nJhznVh9kw6F6iokjiFPl8ONxe9A6nMDVXDiNbrSfLILs6vB07F7wLBrwPYzJw==}
    engines: {node: '>=10.13.0'}

  wcwidth@1.0.1:
    resolution: {integrity: sha512-XHPEwS0q6TaxcvG85+8EYkbiCux2XtWG2mkc47Ng2A77BQu9+DqIOJldST4HgPkuea7dvKSj5VgX3P1d4rW8Tg==}

  web-streams-polyfill@3.3.3:
    resolution: {integrity: sha512-d2JWLCivmZYTSIoge9MsgFCZrt571BikcWGYkjC1khllbTeDlGqZ2D8vD8E/lJa8WGWbb7Plm8/XJYV7IJHZZw==}
    engines: {node: '>= 8'}

  web-streams-polyfill@4.0.0-beta.3:
    resolution: {integrity: sha512-QW95TCTaHmsYfHDybGMwO5IJIM93I/6vTRk+daHTWFPhwh+C8Cg7j7XyKrwrj8Ib6vYXe0ocYNrmzY4xAAN6ug==}
    engines: {node: '>= 14'}

  webidl-conversions@3.0.1:
    resolution: {integrity: sha512-2JAn3z8AR6rjK8Sm8orRC0h/bcl/DqL7tRPdGZ4I1CjdF+EaMLmYxBHyXuKL849eucPFhvBoxMsflfOb8kxaeQ==}

  webpack-node-externals@3.0.0:
    resolution: {integrity: sha512-LnL6Z3GGDPht/AigwRh2dvL9PQPFQ8skEpVrWZXLWBYmqcaojHNN0onvHzie6rq7EWKrrBfPYqNEzTJgiwEQDQ==}
    engines: {node: '>=6'}

  webpack-sources@3.2.3:
    resolution: {integrity: sha512-/DyMEOrDgLKKIG0fmvtz+4dUX/3Ghozwgm6iPp8KRhvn+eQf9+Q7GWxVNMk3+uCPWfdXYC4ExGBckIXdFEfH1w==}
    engines: {node: '>=10.13.0'}

  webpack@5.97.1:
    resolution: {integrity: sha512-EksG6gFY3L1eFMROS/7Wzgrii5mBAFe4rIr3r2BTfo7bcc+DWwFZ4OJ/miOuHJO/A85HwyI4eQ0F6IKXesO7Fg==}
    engines: {node: '>=10.13.0'}
    hasBin: true
    peerDependencies:
      webpack-cli: '*'
    peerDependenciesMeta:
      webpack-cli:
        optional: true

  whatwg-encoding@3.1.1:
    resolution: {integrity: sha512-6qN4hJdMwfYBtE3YBTTHhoeuUrDBPZmbQaxWAqSALV/MeEnR5z1xd8UKud2RAkFoPkmB+hli1TZSnyi84xz1vQ==}
    engines: {node: '>=18'}

  whatwg-mimetype@4.0.0:
    resolution: {integrity: sha512-QaKxh0eNIi2mE9p2vEdzfagOKHCcj1pJ56EEHGQOVxp8r9/iszLUUV7v89x9O1p/T+NlTM5W7jW6+cz4Fq1YVg==}
    engines: {node: '>=18'}

  whatwg-url@5.0.0:
    resolution: {integrity: sha512-saE57nupxk6v3HY35+jzBwYa0rKSy0XR8JSxZPwgLr7ys0IBzhGviA1/TUGJLmSVqs8pb9AnvICXEuOHLprYTw==}

  which@2.0.2:
    resolution: {integrity: sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==}
    engines: {node: '>= 8'}
    hasBin: true

  word-wrap@1.2.5:
    resolution: {integrity: sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==}
    engines: {node: '>=0.10.0'}

  wrap-ansi@6.2.0:
    resolution: {integrity: sha512-r6lPcBGxZXlIcymEu7InxDMhdW0KDxpLgoFLcguasxCaJ/SOIZwINatK9KY/tf+ZrlywOKU0UDj3ATXUBfxJXA==}
    engines: {node: '>=8'}

  wrap-ansi@7.0.0:
    resolution: {integrity: sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==}
    engines: {node: '>=10'}

  wrap-ansi@8.1.0:
    resolution: {integrity: sha512-si7QWI6zUMq56bESFvagtmzMdGOtoxfR+Sez11Mobfc7tm+VkUckk9bW2UeffTGVUbOksxmSw0AA2gs8g71NCQ==}
    engines: {node: '>=12'}

  wrappy@1.0.2:
    resolution: {integrity: sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==}

  write-file-atomic@4.0.2:
    resolution: {integrity: sha512-7KxauUdBmSdWnmpaGFg+ppNjKF8uNLry8LyzjauQDOVONfFLNKrKvQOxZ/VuTIcS/gge/YNahf5RIIQWTSarlg==}
    engines: {node: ^12.13.0 || ^14.15.0 || >=16.0.0}

  ws@8.17.1:
    resolution: {integrity: sha512-6XQFvXTkbfUOZOKKILFG1PDK2NDQs4azKQl26T0YS5CxqWLgXajbPZ+h4gZekJyRqFU8pvnbAbbs/3TgRPy+GQ==}
    engines: {node: '>=10.0.0'}
    peerDependencies:
      bufferutil: ^4.0.1
      utf-8-validate: '>=5.0.2'
    peerDependenciesMeta:
      bufferutil:
        optional: true
      utf-8-validate:
        optional: true

  xtend@4.0.2:
    resolution: {integrity: sha512-LKYU1iAXJXUgAXn9URjiu+MWhyUXHsvfp7mcuYm9dSUKK0/CjtrUwFAxD82/mCWbtLsGjFIad0wIsod4zrTAEQ==}
    engines: {node: '>=0.4'}

  y18n@5.0.8:
    resolution: {integrity: sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==}
    engines: {node: '>=10'}

  yallist@3.1.1:
    resolution: {integrity: sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==}

  yargs-parser@21.1.1:
    resolution: {integrity: sha512-tVpsJW7DdjecAiFpbIB1e3qxIQsE6NoPc5/eTdrbbIC4h0LVsWhnoa3g+m2HclBIujHzsxZ4VJVA+GUuc2/LBw==}
    engines: {node: '>=12'}

  yargs@17.7.2:
    resolution: {integrity: sha512-7dSzzRQ++CKnNI/krKnYRV7JKKPUXMEh61soaHKg9mrWEhzFWhFnxPxGl+69cD1Ou63C13NUPCnmIcrvqCuM6w==}
    engines: {node: '>=12'}

  yauzl@3.2.0:
    resolution: {integrity: sha512-Ow9nuGZE+qp1u4JIPvg+uCiUr7xGQWdff7JQSk5VGYTAZMDe2q8lxJ10ygv10qmSj031Ty/6FNJpLO4o1Sgc+w==}
    engines: {node: '>=12'}

  yn@3.1.1:
    resolution: {integrity: sha512-Ux4ygGWsu2c7isFWe8Yu1YluJmqVhxqK2cLXNQA5AcC3QfbGNpM7fu0Y8b/z16pXLnFxZYvWhd3fhBY9DLmC6Q==}
    engines: {node: '>=6'}

  yocto-queue@0.1.0:
    resolution: {integrity: sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==}
    engines: {node: '>=10'}

  yoctocolors-cjs@2.1.2:
    resolution: {integrity: sha512-cYVsTjKl8b+FrnidjibDWskAv7UKOfcwaVZdp/it9n1s9fU3IkgDbhdIRKCW4JDsAlECJY0ytoVPT3sK6kideA==}
    engines: {node: '>=18'}

  zod-to-json-schema@3.24.1:
    resolution: {integrity: sha512-3h08nf3Vw3Wl3PK+q3ow/lIil81IT2Oa7YpQyUUDsEWbXveMesdfK1xBd2RhCkynwZndAxixji/7SYJJowr62w==}
    peerDependencies:
      zod: ^3.24.1

  zod@3.24.2:
    resolution: {integrity: sha512-lY7CDW43ECgW9u1TcT3IoXHflywfVqDYze4waEz812jR/bZ8FHDsl7pFQoSZTz5N+2NqRXs8GBwnAwo3ZNxqhQ==}

snapshots:

  '@ampproject/remapping@2.3.0':
    dependencies:
      '@jridgewell/gen-mapping': 0.3.8
      '@jridgewell/trace-mapping': 0.3.25

  '@angular-devkit/core@19.0.1(chokidar@4.0.3)':
    dependencies:
      ajv: 8.17.1
      ajv-formats: 3.0.1(ajv@8.17.1)
      jsonc-parser: 3.3.1
      picomatch: 4.0.2
      rxjs: 7.8.1
      source-map: 0.7.4
    optionalDependencies:
      chokidar: 4.0.3

  '@angular-devkit/core@19.1.3(chokidar@4.0.3)':
    dependencies:
      ajv: 8.17.1
      ajv-formats: 3.0.1(ajv@8.17.1)
      jsonc-parser: 3.3.1
      picomatch: 4.0.2
      rxjs: 7.8.1
      source-map: 0.7.4
    optionalDependencies:
      chokidar: 4.0.3

  '@angular-devkit/schematics-cli@19.1.3(@types/node@20.17.17)(chokidar@4.0.3)':
    dependencies:
      '@angular-devkit/core': 19.1.3(chokidar@4.0.3)
      '@angular-devkit/schematics': 19.1.3(chokidar@4.0.3)
      '@inquirer/prompts': 7.2.1(@types/node@20.17.17)
      ansi-colors: 4.1.3
      symbol-observable: 4.0.0
      yargs-parser: 21.1.1
    transitivePeerDependencies:
      - '@types/node'
      - chokidar

  '@angular-devkit/schematics@19.0.1(chokidar@4.0.3)':
    dependencies:
      '@angular-devkit/core': 19.0.1(chokidar@4.0.3)
      jsonc-parser: 3.3.1
      magic-string: 0.30.12
      ora: 5.4.1
      rxjs: 7.8.1
    transitivePeerDependencies:
      - chokidar

  '@angular-devkit/schematics@19.1.3(chokidar@4.0.3)':
    dependencies:
      '@angular-devkit/core': 19.1.3(chokidar@4.0.3)
      jsonc-parser: 3.3.1
      magic-string: 0.30.17
      ora: 5.4.1
      rxjs: 7.8.1
    transitivePeerDependencies:
      - chokidar

  '@babel/code-frame@7.26.2':
    dependencies:
      '@babel/helper-validator-identifier': 7.25.9
      js-tokens: 4.0.0
      picocolors: 1.1.1

  '@babel/compat-data@7.26.8': {}

  '@babel/core@7.26.8':
    dependencies:
      '@ampproject/remapping': 2.3.0
      '@babel/code-frame': 7.26.2
      '@babel/generator': 7.26.8
      '@babel/helper-compilation-targets': 7.26.5
      '@babel/helper-module-transforms': 7.26.0(@babel/core@7.26.8)
      '@babel/helpers': 7.26.7
      '@babel/parser': 7.26.8
      '@babel/template': 7.26.8
      '@babel/traverse': 7.26.8
      '@babel/types': 7.26.8
      '@types/gensync': 1.0.4
      convert-source-map: 2.0.0
      debug: 4.4.0
      gensync: 1.0.0-beta.2
      json5: 2.2.3
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color

  '@babel/generator@7.26.8':
    dependencies:
      '@babel/parser': 7.26.8
      '@babel/types': 7.26.8
      '@jridgewell/gen-mapping': 0.3.8
      '@jridgewell/trace-mapping': 0.3.25
      jsesc: 3.1.0

  '@babel/helper-compilation-targets@7.26.5':
    dependencies:
      '@babel/compat-data': 7.26.8
      '@babel/helper-validator-option': 7.25.9
      browserslist: 4.24.4
      lru-cache: 5.1.1
      semver: 6.3.1

  '@babel/helper-module-imports@7.25.9':
    dependencies:
      '@babel/traverse': 7.26.8
      '@babel/types': 7.26.8
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-module-transforms@7.26.0(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-module-imports': 7.25.9
      '@babel/helper-validator-identifier': 7.25.9
      '@babel/traverse': 7.26.8
    transitivePeerDependencies:
      - supports-color

  '@babel/helper-plugin-utils@7.26.5': {}

  '@babel/helper-string-parser@7.25.9': {}

  '@babel/helper-validator-identifier@7.25.9': {}

  '@babel/helper-validator-option@7.25.9': {}

  '@babel/helpers@7.26.7':
    dependencies:
      '@babel/template': 7.26.8
      '@babel/types': 7.26.8

  '@babel/parser@7.26.8':
    dependencies:
      '@babel/types': 7.26.8

  '@babel/plugin-syntax-async-generators@7.8.4(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-bigint@7.8.3(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-class-properties@7.12.13(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-class-static-block@7.14.5(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-import-attributes@7.26.0(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-import-meta@7.10.4(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-json-strings@7.8.3(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-jsx@7.25.9(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-logical-assignment-operators@7.10.4(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-nullish-coalescing-operator@7.8.3(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-numeric-separator@7.10.4(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-object-rest-spread@7.8.3(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-optional-catch-binding@7.8.3(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-optional-chaining@7.8.3(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-private-property-in-object@7.14.5(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-top-level-await@7.14.5(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/plugin-syntax-typescript@7.25.9(@babel/core@7.26.8)':
    dependencies:
      '@babel/core': 7.26.8
      '@babel/helper-plugin-utils': 7.26.5

  '@babel/template@7.26.8':
    dependencies:
      '@babel/code-frame': 7.26.2
      '@babel/parser': 7.26.8
      '@babel/types': 7.26.8

  '@babel/traverse@7.26.8':
    dependencies:
      '@babel/code-frame': 7.26.2
      '@babel/generator': 7.26.8
      '@babel/parser': 7.26.8
      '@babel/template': 7.26.8
      '@babel/types': 7.26.8
      debug: 4.4.0
      globals: 11.12.0
    transitivePeerDependencies:
      - supports-color

  '@babel/types@7.26.8':
    dependencies:
      '@babel/helper-string-parser': 7.25.9
      '@babel/helper-validator-identifier': 7.25.9

  '@bcoe/v8-coverage@0.2.3': {}

  '@cfworker/json-schema@4.1.1': {}

  '@colors/colors@1.5.0':
    optional: true

  '@cspotcode/source-map-support@0.8.1':
    dependencies:
      '@jridgewell/trace-mapping': 0.3.9

  '@eslint-community/eslint-utils@4.4.1(eslint@9.20.1)':
    dependencies:
      eslint: 9.20.1
      eslint-visitor-keys: 3.4.3

  '@eslint-community/regexpp@4.12.1': {}

  '@eslint/config-array@0.19.2':
    dependencies:
      '@eslint/object-schema': 2.1.6
      debug: 4.4.0
      minimatch: 3.1.2
    transitivePeerDependencies:
      - supports-color

  '@eslint/core@0.10.0':
    dependencies:
      '@types/json-schema': 7.0.15

  '@eslint/core@0.11.0':
    dependencies:
      '@types/json-schema': 7.0.15

  '@eslint/eslintrc@3.2.0':
    dependencies:
      ajv: 6.12.6
      debug: 4.4.0
      espree: 10.3.0
      globals: 14.0.0
      ignore: 5.3.2
      import-fresh: 3.3.1
      js-yaml: 4.1.0
      minimatch: 3.1.2
      strip-json-comments: 3.1.1
    transitivePeerDependencies:
      - supports-color

  '@eslint/js@9.20.0': {}

  '@eslint/object-schema@2.1.6': {}

  '@eslint/plugin-kit@0.2.5':
    dependencies:
      '@eslint/core': 0.10.0
      levn: 0.4.1

  '@google/generative-ai@0.21.0': {}

  '@humanfs/core@0.19.1': {}

  '@humanfs/node@0.16.6':
    dependencies:
      '@humanfs/core': 0.19.1
      '@humanwhocodes/retry': 0.3.1

  '@humanwhocodes/module-importer@1.0.1': {}

  '@humanwhocodes/retry@0.3.1': {}

  '@humanwhocodes/retry@0.4.1': {}

  '@inquirer/checkbox@4.1.1(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/figures': 1.0.10
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
      ansi-escapes: 4.3.2
      yoctocolors-cjs: 2.1.2
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/confirm@5.1.5(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/core@10.1.6(@types/node@20.17.17)':
    dependencies:
      '@inquirer/figures': 1.0.10
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
      ansi-escapes: 4.3.2
      cli-width: 4.1.0
      mute-stream: 2.0.0
      signal-exit: 4.1.0
      wrap-ansi: 6.2.0
      yoctocolors-cjs: 2.1.2
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/editor@4.2.6(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
      external-editor: 3.1.0
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/expand@4.0.8(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
      yoctocolors-cjs: 2.1.2
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/figures@1.0.10': {}

  '@inquirer/input@4.1.5(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/number@3.0.8(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/password@4.0.8(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
      ansi-escapes: 4.3.2
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/prompts@7.2.1(@types/node@20.17.17)':
    dependencies:
      '@inquirer/checkbox': 4.1.1(@types/node@20.17.17)
      '@inquirer/confirm': 5.1.5(@types/node@20.17.17)
      '@inquirer/editor': 4.2.6(@types/node@20.17.17)
      '@inquirer/expand': 4.0.8(@types/node@20.17.17)
      '@inquirer/input': 4.1.5(@types/node@20.17.17)
      '@inquirer/number': 3.0.8(@types/node@20.17.17)
      '@inquirer/password': 4.0.8(@types/node@20.17.17)
      '@inquirer/rawlist': 4.0.8(@types/node@20.17.17)
      '@inquirer/search': 3.0.8(@types/node@20.17.17)
      '@inquirer/select': 4.0.8(@types/node@20.17.17)
      '@types/node': 20.17.17

  '@inquirer/prompts@7.2.3(@types/node@20.17.17)':
    dependencies:
      '@inquirer/checkbox': 4.1.1(@types/node@20.17.17)
      '@inquirer/confirm': 5.1.5(@types/node@20.17.17)
      '@inquirer/editor': 4.2.6(@types/node@20.17.17)
      '@inquirer/expand': 4.0.8(@types/node@20.17.17)
      '@inquirer/input': 4.1.5(@types/node@20.17.17)
      '@inquirer/number': 3.0.8(@types/node@20.17.17)
      '@inquirer/password': 4.0.8(@types/node@20.17.17)
      '@inquirer/rawlist': 4.0.8(@types/node@20.17.17)
      '@inquirer/search': 3.0.8(@types/node@20.17.17)
      '@inquirer/select': 4.0.8(@types/node@20.17.17)
      '@types/node': 20.17.17

  '@inquirer/rawlist@4.0.8(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
      yoctocolors-cjs: 2.1.2
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/search@3.0.8(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/figures': 1.0.10
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
      yoctocolors-cjs: 2.1.2
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/select@4.0.8(@types/node@20.17.17)':
    dependencies:
      '@inquirer/core': 10.1.6(@types/node@20.17.17)
      '@inquirer/figures': 1.0.10
      '@inquirer/type': 3.0.4(@types/node@20.17.17)
      ansi-escapes: 4.3.2
      yoctocolors-cjs: 2.1.2
    optionalDependencies:
      '@types/node': 20.17.17

  '@inquirer/type@3.0.4(@types/node@20.17.17)':
    optionalDependencies:
      '@types/node': 20.17.17

  '@isaacs/cliui@8.0.2':
    dependencies:
      string-width: 5.1.2
      string-width-cjs: string-width@4.2.3
      strip-ansi: 7.1.0
      strip-ansi-cjs: strip-ansi@6.0.1
      wrap-ansi: 8.1.0
      wrap-ansi-cjs: wrap-ansi@7.0.0

  '@istanbuljs/load-nyc-config@1.1.0':
    dependencies:
      camelcase: 5.3.1
      find-up: 4.1.0
      get-package-type: 0.1.0
      js-yaml: 3.14.1
      resolve-from: 5.0.0

  '@istanbuljs/schema@0.1.3': {}

  '@jest/console@29.7.0':
    dependencies:
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      chalk: 4.1.2
      jest-message-util: 29.7.0
      jest-util: 29.7.0
      slash: 3.0.0

  '@jest/core@29.7.0(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))':
    dependencies:
      '@jest/console': 29.7.0
      '@jest/reporters': 29.7.0
      '@jest/test-result': 29.7.0
      '@jest/transform': 29.7.0
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      ansi-escapes: 4.3.2
      chalk: 4.1.2
      ci-info: 3.9.0
      exit: 0.1.2
      graceful-fs: 4.2.11
      jest-changed-files: 29.7.0
      jest-config: 29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))
      jest-haste-map: 29.7.0
      jest-message-util: 29.7.0
      jest-regex-util: 29.6.3
      jest-resolve: 29.7.0
      jest-resolve-dependencies: 29.7.0
      jest-runner: 29.7.0
      jest-runtime: 29.7.0
      jest-snapshot: 29.7.0
      jest-util: 29.7.0
      jest-validate: 29.7.0
      jest-watcher: 29.7.0
      micromatch: 4.0.8
      pretty-format: 29.7.0
      slash: 3.0.0
      strip-ansi: 6.0.1
    transitivePeerDependencies:
      - babel-plugin-macros
      - supports-color
      - ts-node

  '@jest/environment@29.7.0':
    dependencies:
      '@jest/fake-timers': 29.7.0
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      jest-mock: 29.7.0

  '@jest/expect-utils@29.7.0':
    dependencies:
      jest-get-type: 29.6.3

  '@jest/expect@29.7.0':
    dependencies:
      expect: 29.7.0
      jest-snapshot: 29.7.0
    transitivePeerDependencies:
      - supports-color

  '@jest/fake-timers@29.7.0':
    dependencies:
      '@jest/types': 29.6.3
      '@sinonjs/fake-timers': 10.3.0
      '@types/node': 20.17.17
      jest-message-util: 29.7.0
      jest-mock: 29.7.0
      jest-util: 29.7.0

  '@jest/globals@29.7.0':
    dependencies:
      '@jest/environment': 29.7.0
      '@jest/expect': 29.7.0
      '@jest/types': 29.6.3
      jest-mock: 29.7.0
    transitivePeerDependencies:
      - supports-color

  '@jest/reporters@29.7.0':
    dependencies:
      '@bcoe/v8-coverage': 0.2.3
      '@jest/console': 29.7.0
      '@jest/test-result': 29.7.0
      '@jest/transform': 29.7.0
      '@jest/types': 29.6.3
      '@jridgewell/trace-mapping': 0.3.25
      '@types/node': 20.17.17
      chalk: 4.1.2
      collect-v8-coverage: 1.0.2
      exit: 0.1.2
      glob: 7.2.3
      graceful-fs: 4.2.11
      istanbul-lib-coverage: 3.2.2
      istanbul-lib-instrument: 6.0.3
      istanbul-lib-report: 3.0.1
      istanbul-lib-source-maps: 4.0.1
      istanbul-reports: 3.1.7
      jest-message-util: 29.7.0
      jest-util: 29.7.0
      jest-worker: 29.7.0
      slash: 3.0.0
      string-length: 4.0.2
      strip-ansi: 6.0.1
      v8-to-istanbul: 9.3.0
    transitivePeerDependencies:
      - supports-color

  '@jest/schemas@29.6.3':
    dependencies:
      '@sinclair/typebox': 0.27.8

  '@jest/source-map@29.6.3':
    dependencies:
      '@jridgewell/trace-mapping': 0.3.25
      callsites: 3.1.0
      graceful-fs: 4.2.11

  '@jest/test-result@29.7.0':
    dependencies:
      '@jest/console': 29.7.0
      '@jest/types': 29.6.3
      '@types/istanbul-lib-coverage': 2.0.6
      collect-v8-coverage: 1.0.2

  '@jest/test-sequencer@29.7.0':
    dependencies:
      '@jest/test-result': 29.7.0
      graceful-fs: 4.2.11
      jest-haste-map: 29.7.0
      slash: 3.0.0

  '@jest/transform@29.7.0':
    dependencies:
      '@babel/core': 7.26.8
      '@jest/types': 29.6.3
      '@jridgewell/trace-mapping': 0.3.25
      babel-plugin-istanbul: 6.1.1
      chalk: 4.1.2
      convert-source-map: 2.0.0
      fast-json-stable-stringify: 2.1.0
      graceful-fs: 4.2.11
      jest-haste-map: 29.7.0
      jest-regex-util: 29.6.3
      jest-util: 29.7.0
      micromatch: 4.0.8
      pirates: 4.0.6
      slash: 3.0.0
      write-file-atomic: 4.0.2
    transitivePeerDependencies:
      - supports-color

  '@jest/types@29.6.3':
    dependencies:
      '@jest/schemas': 29.6.3
      '@types/istanbul-lib-coverage': 2.0.6
      '@types/istanbul-reports': 3.0.4
      '@types/node': 20.17.17
      '@types/yargs': 17.0.33
      chalk: 4.1.2

  '@jridgewell/gen-mapping@0.3.8':
    dependencies:
      '@jridgewell/set-array': 1.2.1
      '@jridgewell/sourcemap-codec': 1.5.0
      '@jridgewell/trace-mapping': 0.3.25

  '@jridgewell/resolve-uri@3.1.2': {}

  '@jridgewell/set-array@1.2.1': {}

  '@jridgewell/source-map@0.3.6':
    dependencies:
      '@jridgewell/gen-mapping': 0.3.8
      '@jridgewell/trace-mapping': 0.3.25

  '@jridgewell/sourcemap-codec@1.5.0': {}

  '@jridgewell/trace-mapping@0.3.25':
    dependencies:
      '@jridgewell/resolve-uri': 3.1.2
      '@jridgewell/sourcemap-codec': 1.5.0

  '@jridgewell/trace-mapping@0.3.9':
    dependencies:
      '@jridgewell/resolve-uri': 3.1.2
      '@jridgewell/sourcemap-codec': 1.5.0

  '@langchain/core@0.1.63(openai@4.84.0(zod@3.24.2))':
    dependencies:
      ansi-styles: 5.2.0
      camelcase: 6.3.0
      decamelize: 1.2.0
      js-tiktoken: 1.0.18
      langsmith: 0.1.68(openai@4.84.0(zod@3.24.2))
      ml-distance: 4.0.1
      mustache: 4.2.0
      p-queue: 6.6.2
      p-retry: 4.6.2
      uuid: 9.0.1
      zod: 3.24.2
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    transitivePeerDependencies:
      - openai

  '@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2))':
    dependencies:
      '@cfworker/json-schema': 4.1.1
      ansi-styles: 5.2.0
      camelcase: 6.3.0
      decamelize: 1.2.0
      js-tiktoken: 1.0.18
      langsmith: 0.3.7(openai@4.84.0(zod@3.24.2))
      mustache: 4.2.0
      p-queue: 6.6.2
      p-retry: 4.6.2
      uuid: 10.0.0
      zod: 3.24.2
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    transitivePeerDependencies:
      - openai

  '@langchain/google-genai@0.1.8(@langchain/core@0.3.40(openai@4.84.0(zod@3.24.2)))(zod@3.24.2)':
    dependencies:
      '@google/generative-ai': 0.21.0
      '@langchain/core': 0.3.40(openai@4.84.0(zod@3.24.2))
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    transitivePeerDependencies:
      - zod

  '@langchain/groq@0.0.1(openai@4.84.0(zod@3.24.2))':
    dependencies:
      '@langchain/core': 0.1.63(openai@4.84.0(zod@3.24.2))
      '@langchain/openai': 0.0.14
      groq-sdk: 0.3.3
    transitivePeerDependencies:
      - encoding
      - openai
      - ws

  '@langchain/openai@0.0.14':
    dependencies:
      '@langchain/core': 0.1.63(openai@4.84.0(zod@3.24.2))
      js-tiktoken: 1.0.18
      openai: 4.84.0(zod@3.24.2)
      zod: 3.24.2
      zod-to-json-schema: 3.24.1(zod@3.24.2)
    transitivePeerDependencies:
      - encoding
      - ws

  '@lukeed/csprng@1.1.0': {}

  '@napi-rs/nice-android-arm-eabi@1.0.1':
    optional: true

  '@napi-rs/nice-android-arm64@1.0.1':
    optional: true

  '@napi-rs/nice-darwin-arm64@1.0.1':
    optional: true

  '@napi-rs/nice-darwin-x64@1.0.1':
    optional: true

  '@napi-rs/nice-freebsd-x64@1.0.1':
    optional: true

  '@napi-rs/nice-linux-arm-gnueabihf@1.0.1':
    optional: true

  '@napi-rs/nice-linux-arm64-gnu@1.0.1':
    optional: true

  '@napi-rs/nice-linux-arm64-musl@1.0.1':
    optional: true

  '@napi-rs/nice-linux-ppc64-gnu@1.0.1':
    optional: true

  '@napi-rs/nice-linux-riscv64-gnu@1.0.1':
    optional: true

  '@napi-rs/nice-linux-s390x-gnu@1.0.1':
    optional: true

  '@napi-rs/nice-linux-x64-gnu@1.0.1':
    optional: true

  '@napi-rs/nice-linux-x64-musl@1.0.1':
    optional: true

  '@napi-rs/nice-win32-arm64-msvc@1.0.1':
    optional: true

  '@napi-rs/nice-win32-ia32-msvc@1.0.1':
    optional: true

  '@napi-rs/nice-win32-x64-msvc@1.0.1':
    optional: true

  '@napi-rs/nice@1.0.1':
    optionalDependencies:
      '@napi-rs/nice-android-arm-eabi': 1.0.1
      '@napi-rs/nice-android-arm64': 1.0.1
      '@napi-rs/nice-darwin-arm64': 1.0.1
      '@napi-rs/nice-darwin-x64': 1.0.1
      '@napi-rs/nice-freebsd-x64': 1.0.1
      '@napi-rs/nice-linux-arm-gnueabihf': 1.0.1
      '@napi-rs/nice-linux-arm64-gnu': 1.0.1
      '@napi-rs/nice-linux-arm64-musl': 1.0.1
      '@napi-rs/nice-linux-ppc64-gnu': 1.0.1
      '@napi-rs/nice-linux-riscv64-gnu': 1.0.1
      '@napi-rs/nice-linux-s390x-gnu': 1.0.1
      '@napi-rs/nice-linux-x64-gnu': 1.0.1
      '@napi-rs/nice-linux-x64-musl': 1.0.1
      '@napi-rs/nice-win32-arm64-msvc': 1.0.1
      '@napi-rs/nice-win32-ia32-msvc': 1.0.1
      '@napi-rs/nice-win32-x64-msvc': 1.0.1
    optional: true

  '@nestjs/cli@11.0.2(@swc/cli@0.6.0(@swc/core@1.10.16)(chokidar@4.0.3))(@swc/core@1.10.16)(@types/node@20.17.17)':
    dependencies:
      '@angular-devkit/core': 19.1.3(chokidar@4.0.3)
      '@angular-devkit/schematics': 19.1.3(chokidar@4.0.3)
      '@angular-devkit/schematics-cli': 19.1.3(@types/node@20.17.17)(chokidar@4.0.3)
      '@inquirer/prompts': 7.2.3(@types/node@20.17.17)
      '@nestjs/schematics': 11.0.0(chokidar@4.0.3)(typescript@5.7.3)
      ansis: 3.9.0
      chokidar: 4.0.3
      cli-table3: 0.6.5
      commander: 4.1.1
      fork-ts-checker-webpack-plugin: 9.0.2(typescript@5.7.3)(webpack@5.97.1(@swc/core@1.10.16))
      glob: 11.0.1
      node-emoji: 1.11.0
      ora: 5.4.1
      tree-kill: 1.2.2
      tsconfig-paths: 4.2.0
      tsconfig-paths-webpack-plugin: 4.2.0
      typescript: 5.7.3
      webpack: 5.97.1(@swc/core@1.10.16)
      webpack-node-externals: 3.0.0
    optionalDependencies:
      '@swc/cli': 0.6.0(@swc/core@1.10.16)(chokidar@4.0.3)
      '@swc/core': 1.10.16
    transitivePeerDependencies:
      - '@types/node'
      - esbuild
      - uglify-js
      - webpack-cli

  '@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1)':
    dependencies:
      iterare: 1.2.1
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.8.1
      uid: 2.0.2

  '@nestjs/config@4.0.0(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(rxjs@7.8.1)':
    dependencies:
      '@nestjs/common': 11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1)
      dotenv: 16.4.7
      dotenv-expand: 12.0.1
      lodash: 4.17.21
      rxjs: 7.8.1

  '@nestjs/core@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)':
    dependencies:
      '@nestjs/common': 11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nuxt/opencollective': 0.4.1
      fast-safe-stringify: 2.1.1
      iterare: 1.2.1
      path-to-regexp: 8.2.0
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.8.1
      uid: 2.0.2
    optionalDependencies:
      '@nestjs/microservices': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/platform-express': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)
      '@nestjs/websockets': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/platform-socket.io@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)

  '@nestjs/microservices@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)':
    dependencies:
      '@nestjs/common': 11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/core': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      iterare: 1.2.1
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.8.1
    optionalDependencies:
      '@nestjs/websockets': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/platform-socket.io@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)

  '@nestjs/platform-express@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)':
    dependencies:
      '@nestjs/common': 11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/core': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      cors: 2.8.5
      express: 5.0.1
      multer: 1.4.5-lts.1
      path-to-regexp: 8.2.0
      tslib: 2.8.1
    transitivePeerDependencies:
      - supports-color

  '@nestjs/platform-socket.io@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/websockets@11.0.9)(rxjs@7.8.1)':
    dependencies:
      '@nestjs/common': 11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/websockets': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/platform-socket.io@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      rxjs: 7.8.1
      socket.io: 4.8.1
      tslib: 2.8.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  '@nestjs/schematics@11.0.0(chokidar@4.0.3)(typescript@5.7.3)':
    dependencies:
      '@angular-devkit/core': 19.0.1(chokidar@4.0.3)
      '@angular-devkit/schematics': 19.0.1(chokidar@4.0.3)
      comment-json: 4.2.5
      jsonc-parser: 3.3.1
      pluralize: 8.0.0
      typescript: 5.7.3
    transitivePeerDependencies:
      - chokidar

  '@nestjs/testing@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/platform-express@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9))':
    dependencies:
      '@nestjs/common': 11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/core': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      tslib: 2.8.1
    optionalDependencies:
      '@nestjs/microservices': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/platform-express': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)

  '@nestjs/websockets@11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/core@11.0.9)(@nestjs/platform-socket.io@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)':
    dependencies:
      '@nestjs/common': 11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1)
      '@nestjs/core': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/microservices@11.0.9)(@nestjs/platform-express@11.0.9)(@nestjs/websockets@11.0.9)(reflect-metadata@0.2.2)(rxjs@7.8.1)
      iterare: 1.2.1
      object-hash: 3.0.0
      reflect-metadata: 0.2.2
      rxjs: 7.8.1
      tslib: 2.8.1
    optionalDependencies:
      '@nestjs/platform-socket.io': 11.0.9(@nestjs/common@11.0.9(reflect-metadata@0.2.2)(rxjs@7.8.1))(@nestjs/websockets@11.0.9)(rxjs@7.8.1)

  '@nodelib/fs.scandir@2.1.5':
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      run-parallel: 1.2.0

  '@nodelib/fs.stat@2.0.5': {}

  '@nodelib/fs.walk@1.2.8':
    dependencies:
      '@nodelib/fs.scandir': 2.1.5
      fastq: 1.19.0

  '@nuxt/opencollective@0.4.1':
    dependencies:
      consola: 3.4.0

  '@pkgr/core@0.1.1': {}

  '@sec-ant/readable-stream@0.4.1': {}

  '@sinclair/typebox@0.27.8': {}

  '@sindresorhus/is@5.6.0': {}

  '@sinonjs/commons@3.0.1':
    dependencies:
      type-detect: 4.0.8

  '@sinonjs/fake-timers@10.3.0':
    dependencies:
      '@sinonjs/commons': 3.0.1

  '@socket.io/component-emitter@3.1.2': {}

  '@spider-cloud/spider-client@0.1.26':
    dependencies:
      exponential-backoff: 3.1.2

  '@swc/cli@0.6.0(@swc/core@1.10.16)(chokidar@4.0.3)':
    dependencies:
      '@swc/core': 1.10.16
      '@swc/counter': 0.1.3
      '@xhmikosr/bin-wrapper': 13.0.5
      commander: 8.3.0
      fast-glob: 3.3.3
      minimatch: 9.0.5
      piscina: 4.8.0
      semver: 7.7.1
      slash: 3.0.0
      source-map: 0.7.4
    optionalDependencies:
      chokidar: 4.0.3

  '@swc/core-darwin-arm64@1.10.16':
    optional: true

  '@swc/core-darwin-x64@1.10.16':
    optional: true

  '@swc/core-linux-arm-gnueabihf@1.10.16':
    optional: true

  '@swc/core-linux-arm64-gnu@1.10.16':
    optional: true

  '@swc/core-linux-arm64-musl@1.10.16':
    optional: true

  '@swc/core-linux-x64-gnu@1.10.16':
    optional: true

  '@swc/core-linux-x64-musl@1.10.16':
    optional: true

  '@swc/core-win32-arm64-msvc@1.10.16':
    optional: true

  '@swc/core-win32-ia32-msvc@1.10.16':
    optional: true

  '@swc/core-win32-x64-msvc@1.10.16':
    optional: true

  '@swc/core@1.10.16':
    dependencies:
      '@swc/counter': 0.1.3
      '@swc/types': 0.1.17
    optionalDependencies:
      '@swc/core-darwin-arm64': 1.10.16
      '@swc/core-darwin-x64': 1.10.16
      '@swc/core-linux-arm-gnueabihf': 1.10.16
      '@swc/core-linux-arm64-gnu': 1.10.16
      '@swc/core-linux-arm64-musl': 1.10.16
      '@swc/core-linux-x64-gnu': 1.10.16
      '@swc/core-linux-x64-musl': 1.10.16
      '@swc/core-win32-arm64-msvc': 1.10.16
      '@swc/core-win32-ia32-msvc': 1.10.16
      '@swc/core-win32-x64-msvc': 1.10.16

  '@swc/counter@0.1.3': {}

  '@swc/types@0.1.17':
    dependencies:
      '@swc/counter': 0.1.3

  '@szmarczak/http-timer@5.0.1':
    dependencies:
      defer-to-connect: 2.0.1

  '@t3-oss/env-core@0.9.2(typescript@5.7.3)(zod@3.24.2)':
    dependencies:
      zod: 3.24.2
    optionalDependencies:
      typescript: 5.7.3

  '@tokenizer/token@0.3.0': {}

  '@tsconfig/node10@1.0.11': {}

  '@tsconfig/node12@1.0.11': {}

  '@tsconfig/node14@1.0.3': {}

  '@tsconfig/node16@1.0.4': {}

  '@types/babel__core@7.20.5':
    dependencies:
      '@babel/parser': 7.26.8
      '@babel/types': 7.26.8
      '@types/babel__generator': 7.6.8
      '@types/babel__template': 7.4.4
      '@types/babel__traverse': 7.20.6

  '@types/babel__generator@7.6.8':
    dependencies:
      '@babel/types': 7.26.8

  '@types/babel__template@7.4.4':
    dependencies:
      '@babel/parser': 7.26.8
      '@babel/types': 7.26.8

  '@types/babel__traverse@7.20.6':
    dependencies:
      '@babel/types': 7.26.8

  '@types/body-parser@1.19.5':
    dependencies:
      '@types/connect': 3.4.38
      '@types/node': 20.17.17

  '@types/cheerio@0.22.35':
    dependencies:
      '@types/node': 20.17.17

  '@types/connect@3.4.38':
    dependencies:
      '@types/node': 20.17.17

  '@types/cookiejar@2.1.5': {}

  '@types/cors@2.8.17':
    dependencies:
      '@types/node': 20.17.17

  '@types/eslint-scope@3.7.7':
    dependencies:
      '@types/eslint': 9.6.1
      '@types/estree': 1.0.6

  '@types/eslint@9.6.1':
    dependencies:
      '@types/estree': 1.0.6
      '@types/json-schema': 7.0.15

  '@types/estree@1.0.6': {}

  '@types/express-serve-static-core@4.19.6':
    dependencies:
      '@types/node': 20.17.17
      '@types/qs': 6.9.18
      '@types/range-parser': 1.2.7
      '@types/send': 0.17.4

  '@types/express@4.17.21':
    dependencies:
      '@types/body-parser': 1.19.5
      '@types/express-serve-static-core': 4.19.6
      '@types/qs': 6.9.18
      '@types/serve-static': 1.15.7

  '@types/gensync@1.0.4': {}

  '@types/graceful-fs@4.1.9':
    dependencies:
      '@types/node': 20.17.17

  '@types/http-cache-semantics@4.0.4': {}

  '@types/http-errors@2.0.4': {}

  '@types/istanbul-lib-coverage@2.0.6': {}

  '@types/istanbul-lib-report@3.0.3':
    dependencies:
      '@types/istanbul-lib-coverage': 2.0.6

  '@types/istanbul-reports@3.0.4':
    dependencies:
      '@types/istanbul-lib-report': 3.0.3

  '@types/jest@29.5.14':
    dependencies:
      expect: 29.7.0
      pretty-format: 29.7.0

  '@types/json-schema@7.0.15': {}

  '@types/methods@1.1.4': {}

  '@types/mime@1.3.5': {}

  '@types/node-fetch@2.6.12':
    dependencies:
      '@types/node': 20.17.17
      form-data: 4.0.1

  '@types/node@18.19.75':
    dependencies:
      undici-types: 5.26.5

  '@types/node@20.17.17':
    dependencies:
      undici-types: 6.19.8

  '@types/qs@6.9.18': {}

  '@types/range-parser@1.2.7': {}

  '@types/retry@0.12.0': {}

  '@types/send@0.17.4':
    dependencies:
      '@types/mime': 1.3.5
      '@types/node': 20.17.17

  '@types/serve-static@1.15.7':
    dependencies:
      '@types/http-errors': 2.0.4
      '@types/node': 20.17.17
      '@types/send': 0.17.4

  '@types/stack-utils@2.0.3': {}

  '@types/superagent@8.1.9':
    dependencies:
      '@types/cookiejar': 2.1.5
      '@types/methods': 1.1.4
      '@types/node': 20.17.17
      form-data: 4.0.1

  '@types/supertest@6.0.2':
    dependencies:
      '@types/methods': 1.1.4
      '@types/superagent': 8.1.9

  '@types/uuid@10.0.0': {}

  '@types/yargs-parser@21.0.3': {}

  '@types/yargs@17.0.33':
    dependencies:
      '@types/yargs-parser': 21.0.3

  '@typescript-eslint/eslint-plugin@8.24.0(@typescript-eslint/parser@8.24.0(eslint@9.20.1)(typescript@5.7.3))(eslint@9.20.1)(typescript@5.7.3)':
    dependencies:
      '@eslint-community/regexpp': 4.12.1
      '@typescript-eslint/parser': 8.24.0(eslint@9.20.1)(typescript@5.7.3)
      '@typescript-eslint/scope-manager': 8.24.0
      '@typescript-eslint/type-utils': 8.24.0(eslint@9.20.1)(typescript@5.7.3)
      '@typescript-eslint/utils': 8.24.0(eslint@9.20.1)(typescript@5.7.3)
      '@typescript-eslint/visitor-keys': 8.24.0
      eslint: 9.20.1
      graphemer: 1.4.0
      ignore: 5.3.2
      natural-compare: 1.4.0
      ts-api-utils: 2.0.1(typescript@5.7.3)
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/parser@8.24.0(eslint@9.20.1)(typescript@5.7.3)':
    dependencies:
      '@typescript-eslint/scope-manager': 8.24.0
      '@typescript-eslint/types': 8.24.0
      '@typescript-eslint/typescript-estree': 8.24.0(typescript@5.7.3)
      '@typescript-eslint/visitor-keys': 8.24.0
      debug: 4.4.0
      eslint: 9.20.1
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/scope-manager@8.24.0':
    dependencies:
      '@typescript-eslint/types': 8.24.0
      '@typescript-eslint/visitor-keys': 8.24.0

  '@typescript-eslint/type-utils@8.24.0(eslint@9.20.1)(typescript@5.7.3)':
    dependencies:
      '@typescript-eslint/typescript-estree': 8.24.0(typescript@5.7.3)
      '@typescript-eslint/utils': 8.24.0(eslint@9.20.1)(typescript@5.7.3)
      debug: 4.4.0
      eslint: 9.20.1
      ts-api-utils: 2.0.1(typescript@5.7.3)
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/types@8.24.0': {}

  '@typescript-eslint/typescript-estree@8.24.0(typescript@5.7.3)':
    dependencies:
      '@typescript-eslint/types': 8.24.0
      '@typescript-eslint/visitor-keys': 8.24.0
      debug: 4.4.0
      fast-glob: 3.3.3
      is-glob: 4.0.3
      minimatch: 9.0.5
      semver: 7.7.1
      ts-api-utils: 2.0.1(typescript@5.7.3)
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/utils@8.24.0(eslint@9.20.1)(typescript@5.7.3)':
    dependencies:
      '@eslint-community/eslint-utils': 4.4.1(eslint@9.20.1)
      '@typescript-eslint/scope-manager': 8.24.0
      '@typescript-eslint/types': 8.24.0
      '@typescript-eslint/typescript-estree': 8.24.0(typescript@5.7.3)
      eslint: 9.20.1
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  '@typescript-eslint/visitor-keys@8.24.0':
    dependencies:
      '@typescript-eslint/types': 8.24.0
      eslint-visitor-keys: 4.2.0

  '@webassemblyjs/ast@1.14.1':
    dependencies:
      '@webassemblyjs/helper-numbers': 1.13.2
      '@webassemblyjs/helper-wasm-bytecode': 1.13.2

  '@webassemblyjs/floating-point-hex-parser@1.13.2': {}

  '@webassemblyjs/helper-api-error@1.13.2': {}

  '@webassemblyjs/helper-buffer@1.14.1': {}

  '@webassemblyjs/helper-numbers@1.13.2':
    dependencies:
      '@webassemblyjs/floating-point-hex-parser': 1.13.2
      '@webassemblyjs/helper-api-error': 1.13.2
      '@xtuc/long': 4.2.2

  '@webassemblyjs/helper-wasm-bytecode@1.13.2': {}

  '@webassemblyjs/helper-wasm-section@1.14.1':
    dependencies:
      '@webassemblyjs/ast': 1.14.1
      '@webassemblyjs/helper-buffer': 1.14.1
      '@webassemblyjs/helper-wasm-bytecode': 1.13.2
      '@webassemblyjs/wasm-gen': 1.14.1

  '@webassemblyjs/ieee754@1.13.2':
    dependencies:
      '@xtuc/ieee754': 1.2.0

  '@webassemblyjs/leb128@1.13.2':
    dependencies:
      '@xtuc/long': 4.2.2

  '@webassemblyjs/utf8@1.13.2': {}

  '@webassemblyjs/wasm-edit@1.14.1':
    dependencies:
      '@webassemblyjs/ast': 1.14.1
      '@webassemblyjs/helper-buffer': 1.14.1
      '@webassemblyjs/helper-wasm-bytecode': 1.13.2
      '@webassemblyjs/helper-wasm-section': 1.14.1
      '@webassemblyjs/wasm-gen': 1.14.1
      '@webassemblyjs/wasm-opt': 1.14.1
      '@webassemblyjs/wasm-parser': 1.14.1
      '@webassemblyjs/wast-printer': 1.14.1

  '@webassemblyjs/wasm-gen@1.14.1':
    dependencies:
      '@webassemblyjs/ast': 1.14.1
      '@webassemblyjs/helper-wasm-bytecode': 1.13.2
      '@webassemblyjs/ieee754': 1.13.2
      '@webassemblyjs/leb128': 1.13.2
      '@webassemblyjs/utf8': 1.13.2

  '@webassemblyjs/wasm-opt@1.14.1':
    dependencies:
      '@webassemblyjs/ast': 1.14.1
      '@webassemblyjs/helper-buffer': 1.14.1
      '@webassemblyjs/wasm-gen': 1.14.1
      '@webassemblyjs/wasm-parser': 1.14.1

  '@webassemblyjs/wasm-parser@1.14.1':
    dependencies:
      '@webassemblyjs/ast': 1.14.1
      '@webassemblyjs/helper-api-error': 1.13.2
      '@webassemblyjs/helper-wasm-bytecode': 1.13.2
      '@webassemblyjs/ieee754': 1.13.2
      '@webassemblyjs/leb128': 1.13.2
      '@webassemblyjs/utf8': 1.13.2

  '@webassemblyjs/wast-printer@1.14.1':
    dependencies:
      '@webassemblyjs/ast': 1.14.1
      '@xtuc/long': 4.2.2

  '@xhmikosr/archive-type@7.0.0':
    dependencies:
      file-type: 19.6.0

  '@xhmikosr/bin-check@7.0.3':
    dependencies:
      execa: 5.1.1
      isexe: 2.0.0

  '@xhmikosr/bin-wrapper@13.0.5':
    dependencies:
      '@xhmikosr/bin-check': 7.0.3
      '@xhmikosr/downloader': 15.0.1
      '@xhmikosr/os-filter-obj': 3.0.0
      bin-version-check: 5.1.0

  '@xhmikosr/decompress-tar@8.0.1':
    dependencies:
      file-type: 19.6.0
      is-stream: 2.0.1
      tar-stream: 3.1.7

  '@xhmikosr/decompress-tarbz2@8.0.2':
    dependencies:
      '@xhmikosr/decompress-tar': 8.0.1
      file-type: 19.6.0
      is-stream: 2.0.1
      seek-bzip: 2.0.0
      unbzip2-stream: 1.4.3

  '@xhmikosr/decompress-targz@8.0.1':
    dependencies:
      '@xhmikosr/decompress-tar': 8.0.1
      file-type: 19.6.0
      is-stream: 2.0.1

  '@xhmikosr/decompress-unzip@7.0.0':
    dependencies:
      file-type: 19.6.0
      get-stream: 6.0.1
      yauzl: 3.2.0

  '@xhmikosr/decompress@10.0.1':
    dependencies:
      '@xhmikosr/decompress-tar': 8.0.1
      '@xhmikosr/decompress-tarbz2': 8.0.2
      '@xhmikosr/decompress-targz': 8.0.1
      '@xhmikosr/decompress-unzip': 7.0.0
      graceful-fs: 4.2.11
      make-dir: 4.0.0
      strip-dirs: 3.0.0

  '@xhmikosr/downloader@15.0.1':
    dependencies:
      '@xhmikosr/archive-type': 7.0.0
      '@xhmikosr/decompress': 10.0.1
      content-disposition: 0.5.4
      defaults: 3.0.0
      ext-name: 5.0.0
      file-type: 19.6.0
      filenamify: 6.0.0
      get-stream: 6.0.1
      got: 13.0.0

  '@xhmikosr/os-filter-obj@3.0.0':
    dependencies:
      arch: 3.0.0

  '@xtuc/ieee754@1.2.0': {}

  '@xtuc/long@4.2.2': {}

  abort-controller@3.0.0:
    dependencies:
      event-target-shim: 5.0.1

  accepts@1.3.8:
    dependencies:
      mime-types: 2.1.35
      negotiator: 0.6.3

  accepts@2.0.0:
    dependencies:
      mime-types: 3.0.0
      negotiator: 1.0.0

  acorn-jsx@5.3.2(acorn@8.14.0):
    dependencies:
      acorn: 8.14.0

  acorn-walk@8.3.4:
    dependencies:
      acorn: 8.14.0

  acorn@8.14.0: {}

  agentkeepalive@4.6.0:
    dependencies:
      humanize-ms: 1.2.1

  ajv-formats@2.1.1(ajv@8.17.1):
    optionalDependencies:
      ajv: 8.17.1

  ajv-formats@3.0.1(ajv@8.17.1):
    optionalDependencies:
      ajv: 8.17.1

  ajv-keywords@3.5.2(ajv@6.12.6):
    dependencies:
      ajv: 6.12.6

  ajv-keywords@5.1.0(ajv@8.17.1):
    dependencies:
      ajv: 8.17.1
      fast-deep-equal: 3.1.3

  ajv@6.12.6:
    dependencies:
      fast-deep-equal: 3.1.3
      fast-json-stable-stringify: 2.1.0
      json-schema-traverse: 0.4.1
      uri-js: 4.4.1

  ajv@8.17.1:
    dependencies:
      fast-deep-equal: 3.1.3
      fast-uri: 3.0.6
      json-schema-traverse: 1.0.0
      require-from-string: 2.0.2

  ansi-colors@4.1.3: {}

  ansi-escapes@4.3.2:
    dependencies:
      type-fest: 0.21.3

  ansi-regex@5.0.1: {}

  ansi-regex@6.1.0: {}

  ansi-styles@4.3.0:
    dependencies:
      color-convert: 2.0.1

  ansi-styles@5.2.0: {}

  ansi-styles@6.2.1: {}

  ansis@3.9.0: {}

  anymatch@3.1.3:
    dependencies:
      normalize-path: 3.0.0
      picomatch: 2.3.1

  append-field@1.0.0: {}

  arch@3.0.0: {}

  arg@4.1.3: {}

  argparse@1.0.10:
    dependencies:
      sprintf-js: 1.0.3

  argparse@2.0.1: {}

  array-timsort@1.0.3: {}

  asap@2.0.6: {}

  async@3.2.6: {}

  asynckit@0.4.0: {}

  b4a@1.6.7: {}

  babel-jest@29.7.0(@babel/core@7.26.8):
    dependencies:
      '@babel/core': 7.26.8
      '@jest/transform': 29.7.0
      '@types/babel__core': 7.20.5
      babel-plugin-istanbul: 6.1.1
      babel-preset-jest: 29.6.3(@babel/core@7.26.8)
      chalk: 4.1.2
      graceful-fs: 4.2.11
      slash: 3.0.0
    transitivePeerDependencies:
      - supports-color

  babel-plugin-istanbul@6.1.1:
    dependencies:
      '@babel/helper-plugin-utils': 7.26.5
      '@istanbuljs/load-nyc-config': 1.1.0
      '@istanbuljs/schema': 0.1.3
      istanbul-lib-instrument: 5.2.1
      test-exclude: 6.0.0
    transitivePeerDependencies:
      - supports-color

  babel-plugin-jest-hoist@29.6.3:
    dependencies:
      '@babel/template': 7.26.8
      '@babel/types': 7.26.8
      '@types/babel__core': 7.20.5
      '@types/babel__traverse': 7.20.6

  babel-preset-current-node-syntax@1.1.0(@babel/core@7.26.8):
    dependencies:
      '@babel/core': 7.26.8
      '@babel/plugin-syntax-async-generators': 7.8.4(@babel/core@7.26.8)
      '@babel/plugin-syntax-bigint': 7.8.3(@babel/core@7.26.8)
      '@babel/plugin-syntax-class-properties': 7.12.13(@babel/core@7.26.8)
      '@babel/plugin-syntax-class-static-block': 7.14.5(@babel/core@7.26.8)
      '@babel/plugin-syntax-import-attributes': 7.26.0(@babel/core@7.26.8)
      '@babel/plugin-syntax-import-meta': 7.10.4(@babel/core@7.26.8)
      '@babel/plugin-syntax-json-strings': 7.8.3(@babel/core@7.26.8)
      '@babel/plugin-syntax-logical-assignment-operators': 7.10.4(@babel/core@7.26.8)
      '@babel/plugin-syntax-nullish-coalescing-operator': 7.8.3(@babel/core@7.26.8)
      '@babel/plugin-syntax-numeric-separator': 7.10.4(@babel/core@7.26.8)
      '@babel/plugin-syntax-object-rest-spread': 7.8.3(@babel/core@7.26.8)
      '@babel/plugin-syntax-optional-catch-binding': 7.8.3(@babel/core@7.26.8)
      '@babel/plugin-syntax-optional-chaining': 7.8.3(@babel/core@7.26.8)
      '@babel/plugin-syntax-private-property-in-object': 7.14.5(@babel/core@7.26.8)
      '@babel/plugin-syntax-top-level-await': 7.14.5(@babel/core@7.26.8)

  babel-preset-jest@29.6.3(@babel/core@7.26.8):
    dependencies:
      '@babel/core': 7.26.8
      babel-plugin-jest-hoist: 29.6.3
      babel-preset-current-node-syntax: 1.1.0(@babel/core@7.26.8)

  balanced-match@1.0.2: {}

  bare-events@2.5.4:
    optional: true

  base-64@0.1.0: {}

  base64-js@1.5.1: {}

  base64id@2.0.0: {}

  bin-version-check@5.1.0:
    dependencies:
      bin-version: 6.0.0
      semver: 7.7.1
      semver-truncate: 3.0.0

  bin-version@6.0.0:
    dependencies:
      execa: 5.1.1
      find-versions: 5.1.0

  binary-extensions@2.3.0: {}

  binary-search@1.3.6: {}

  bl@4.1.0:
    dependencies:
      buffer: 5.7.1
      inherits: 2.0.4
      readable-stream: 3.6.2

  body-parser@2.1.0:
    dependencies:
      bytes: 3.1.2
      content-type: 1.0.5
      debug: 4.4.0
      http-errors: 2.0.0
      iconv-lite: 0.5.2
      on-finished: 2.4.1
      qs: 6.14.0
      raw-body: 3.0.0
      type-is: 2.0.0
    transitivePeerDependencies:
      - supports-color

  boolbase@1.0.0: {}

  brace-expansion@1.1.11:
    dependencies:
      balanced-match: 1.0.2
      concat-map: 0.0.1

  brace-expansion@2.0.1:
    dependencies:
      balanced-match: 1.0.2

  braces@3.0.3:
    dependencies:
      fill-range: 7.1.1

  browserslist@4.24.4:
    dependencies:
      caniuse-lite: 1.0.30001699
      electron-to-chromium: 1.5.97
      node-releases: 2.0.19
      update-browserslist-db: 1.1.2(browserslist@4.24.4)

  bs-logger@0.2.6:
    dependencies:
      fast-json-stable-stringify: 2.1.0

  bser@2.1.1:
    dependencies:
      node-int64: 0.4.0

  buffer-crc32@0.2.13: {}

  buffer-from@1.1.2: {}

  buffer@5.7.1:
    dependencies:
      base64-js: 1.5.1
      ieee754: 1.2.1

  busboy@1.6.0:
    dependencies:
      streamsearch: 1.1.0

  bytes@3.1.2: {}

  cacheable-lookup@7.0.0: {}

  cacheable-request@10.2.14:
    dependencies:
      '@types/http-cache-semantics': 4.0.4
      get-stream: 6.0.1
      http-cache-semantics: 4.1.1
      keyv: 4.5.4
      mimic-response: 4.0.0
      normalize-url: 8.0.1
      responselike: 3.0.0

  call-bind-apply-helpers@1.0.1:
    dependencies:
      es-errors: 1.3.0
      function-bind: 1.1.2

  call-bound@1.0.3:
    dependencies:
      call-bind-apply-helpers: 1.0.1
      get-intrinsic: 1.2.7

  callsites@3.1.0: {}

  camelcase@5.3.1: {}

  camelcase@6.3.0: {}

  caniuse-lite@1.0.30001699: {}

  chalk@4.1.2:
    dependencies:
      ansi-styles: 4.3.0
      supports-color: 7.2.0

  char-regex@1.0.2: {}

  chardet@0.7.0: {}

  charenc@0.0.2: {}

  cheerio-select@2.1.0:
    dependencies:
      boolbase: 1.0.0
      css-select: 5.1.0
      css-what: 6.1.0
      domelementtype: 2.3.0
      domhandler: 5.0.3
      domutils: 3.2.2

  cheerio@1.0.0:
    dependencies:
      cheerio-select: 2.1.0
      dom-serializer: 2.0.0
      domhandler: 5.0.3
      domutils: 3.2.2
      encoding-sniffer: 0.2.0
      htmlparser2: 9.1.0
      parse5: 7.2.1
      parse5-htmlparser2-tree-adapter: 7.1.0
      parse5-parser-stream: 7.1.2
      undici: 6.21.1
      whatwg-mimetype: 4.0.0

  chokidar@3.6.0:
    dependencies:
      anymatch: 3.1.3
      braces: 3.0.3
      glob-parent: 5.1.2
      is-binary-path: 2.1.0
      is-glob: 4.0.3
      normalize-path: 3.0.0
      readdirp: 3.6.0
    optionalDependencies:
      fsevents: 2.3.3

  chokidar@4.0.3:
    dependencies:
      readdirp: 4.1.1

  chrome-trace-event@1.0.4: {}

  ci-info@3.9.0: {}

  cjs-module-lexer@1.4.3: {}

  cli-cursor@3.1.0:
    dependencies:
      restore-cursor: 3.1.0

  cli-spinners@2.9.2: {}

  cli-table3@0.6.5:
    dependencies:
      string-width: 4.2.3
    optionalDependencies:
      '@colors/colors': 1.5.0

  cli-width@4.1.0: {}

  cliui@8.0.1:
    dependencies:
      string-width: 4.2.3
      strip-ansi: 6.0.1
      wrap-ansi: 7.0.0

  clone@1.0.4: {}

  co@4.6.0: {}

  collect-v8-coverage@1.0.2: {}

  color-convert@2.0.1:
    dependencies:
      color-name: 1.1.4

  color-name@1.1.4: {}

  combined-stream@1.0.8:
    dependencies:
      delayed-stream: 1.0.0

  commander@10.0.1: {}

  commander@2.20.3: {}

  commander@4.1.1: {}

  commander@6.2.1: {}

  commander@8.3.0: {}

  comment-json@4.2.5:
    dependencies:
      array-timsort: 1.0.3
      core-util-is: 1.0.3
      esprima: 4.0.1
      has-own-prop: 2.0.0
      repeat-string: 1.6.1

  component-emitter@1.3.1: {}

  concat-map@0.0.1: {}

  concat-stream@1.6.2:
    dependencies:
      buffer-from: 1.1.2
      inherits: 2.0.4
      readable-stream: 2.3.8
      typedarray: 0.0.6

  consola@3.4.0: {}

  console-table-printer@2.12.1:
    dependencies:
      simple-wcswidth: 1.0.1

  content-disposition@0.5.4:
    dependencies:
      safe-buffer: 5.2.1

  content-disposition@1.0.0:
    dependencies:
      safe-buffer: 5.2.1

  content-type@1.0.5: {}

  convert-source-map@2.0.0: {}

  cookie-signature@1.2.2: {}

  cookie@0.7.1: {}

  cookie@0.7.2: {}

  cookiejar@2.1.4: {}

  core-util-is@1.0.3: {}

  cors@2.8.5:
    dependencies:
      object-assign: 4.1.1
      vary: 1.1.2

  cosmiconfig@8.3.6(typescript@5.7.3):
    dependencies:
      import-fresh: 3.3.1
      js-yaml: 4.1.0
      parse-json: 5.2.0
      path-type: 4.0.0
    optionalDependencies:
      typescript: 5.7.3

  create-jest@29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3)):
    dependencies:
      '@jest/types': 29.6.3
      chalk: 4.1.2
      exit: 0.1.2
      graceful-fs: 4.2.11
      jest-config: 29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))
      jest-util: 29.7.0
      prompts: 2.4.2
    transitivePeerDependencies:
      - '@types/node'
      - babel-plugin-macros
      - supports-color
      - ts-node

  create-require@1.1.1: {}

  cross-spawn@7.0.6:
    dependencies:
      path-key: 3.1.1
      shebang-command: 2.0.0
      which: 2.0.2

  crypt@0.0.2: {}

  css-select@5.1.0:
    dependencies:
      boolbase: 1.0.0
      css-what: 6.1.0
      domhandler: 5.0.3
      domutils: 3.2.2
      nth-check: 2.1.1

  css-what@6.1.0: {}

  debug@2.6.9:
    dependencies:
      ms: 2.0.0

  debug@4.3.6:
    dependencies:
      ms: 2.1.2

  debug@4.4.0:
    dependencies:
      ms: 2.1.3

  decamelize@1.2.0: {}

  decompress-response@6.0.0:
    dependencies:
      mimic-response: 3.1.0

  dedent@1.5.3: {}

  deep-is@0.1.4: {}

  deepmerge@4.3.1: {}

  defaults@1.0.4:
    dependencies:
      clone: 1.0.4

  defaults@3.0.0: {}

  defer-to-connect@2.0.1: {}

  delayed-stream@1.0.0: {}

  depd@2.0.0: {}

  destroy@1.2.0: {}

  detect-newline@3.1.0: {}

  dezalgo@1.0.4:
    dependencies:
      asap: 2.0.6
      wrappy: 1.0.2

  diff-sequences@29.6.3: {}

  diff@4.0.2: {}

  digest-fetch@1.3.0:
    dependencies:
      base-64: 0.1.0
      md5: 2.3.0

  dom-serializer@2.0.0:
    dependencies:
      domelementtype: 2.3.0
      domhandler: 5.0.3
      entities: 4.5.0

  domelementtype@2.3.0: {}

  domhandler@5.0.3:
    dependencies:
      domelementtype: 2.3.0

  domutils@3.2.2:
    dependencies:
      dom-serializer: 2.0.0
      domelementtype: 2.3.0
      domhandler: 5.0.3

  dotenv-expand@12.0.1:
    dependencies:
      dotenv: 16.4.7

  dotenv@16.4.7: {}

  drizzle-orm@0.29.5: {}

  dunder-proto@1.0.1:
    dependencies:
      call-bind-apply-helpers: 1.0.1
      es-errors: 1.3.0
      gopd: 1.2.0

  eastasianwidth@0.2.0: {}

  ee-first@1.1.1: {}

  ejs@3.1.10:
    dependencies:
      jake: 10.9.2

  electron-to-chromium@1.5.97: {}

  emittery@0.13.1: {}

  emoji-regex@8.0.0: {}

  emoji-regex@9.2.2: {}

  encodeurl@1.0.2: {}

  encodeurl@2.0.0: {}

  encoding-sniffer@0.2.0:
    dependencies:
      iconv-lite: 0.6.3
      whatwg-encoding: 3.1.1

  engine.io-parser@5.2.3: {}

  engine.io@6.6.4:
    dependencies:
      '@types/cors': 2.8.17
      '@types/node': 20.17.17
      accepts: 1.3.8
      base64id: 2.0.0
      cookie: 0.7.2
      cors: 2.8.5
      debug: 4.3.6
      engine.io-parser: 5.2.3
      ws: 8.17.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  enhanced-resolve@5.18.1:
    dependencies:
      graceful-fs: 4.2.11
      tapable: 2.2.1

  entities@4.5.0: {}

  error-ex@1.3.2:
    dependencies:
      is-arrayish: 0.2.1

  es-define-property@1.0.1: {}

  es-errors@1.3.0: {}

  es-module-lexer@1.6.0: {}

  es-object-atoms@1.1.1:
    dependencies:
      es-errors: 1.3.0

  escalade@3.2.0: {}

  escape-html@1.0.3: {}

  escape-string-regexp@2.0.0: {}

  escape-string-regexp@4.0.0: {}

  eslint-config-prettier@10.0.1(eslint@9.20.1):
    dependencies:
      eslint: 9.20.1

  eslint-plugin-prettier@5.2.3(@types/eslint@9.6.1)(eslint-config-prettier@10.0.1(eslint@9.20.1))(eslint@9.20.1)(prettier@3.5.0):
    dependencies:
      eslint: 9.20.1
      prettier: 3.5.0
      prettier-linter-helpers: 1.0.0
      synckit: 0.9.2
    optionalDependencies:
      '@types/eslint': 9.6.1
      eslint-config-prettier: 10.0.1(eslint@9.20.1)

  eslint-scope@5.1.1:
    dependencies:
      esrecurse: 4.3.0
      estraverse: 4.3.0

  eslint-scope@8.2.0:
    dependencies:
      esrecurse: 4.3.0
      estraverse: 5.3.0

  eslint-visitor-keys@3.4.3: {}

  eslint-visitor-keys@4.2.0: {}

  eslint@9.20.1:
    dependencies:
      '@eslint-community/eslint-utils': 4.4.1(eslint@9.20.1)
      '@eslint-community/regexpp': 4.12.1
      '@eslint/config-array': 0.19.2
      '@eslint/core': 0.11.0
      '@eslint/eslintrc': 3.2.0
      '@eslint/js': 9.20.0
      '@eslint/plugin-kit': 0.2.5
      '@humanfs/node': 0.16.6
      '@humanwhocodes/module-importer': 1.0.1
      '@humanwhocodes/retry': 0.4.1
      '@types/estree': 1.0.6
      '@types/json-schema': 7.0.15
      ajv: 6.12.6
      chalk: 4.1.2
      cross-spawn: 7.0.6
      debug: 4.4.0
      escape-string-regexp: 4.0.0
      eslint-scope: 8.2.0
      eslint-visitor-keys: 4.2.0
      espree: 10.3.0
      esquery: 1.6.0
      esutils: 2.0.3
      fast-deep-equal: 3.1.3
      file-entry-cache: 8.0.0
      find-up: 5.0.0
      glob-parent: 6.0.2
      ignore: 5.3.2
      imurmurhash: 0.1.4
      is-glob: 4.0.3
      json-stable-stringify-without-jsonify: 1.0.1
      lodash.merge: 4.6.2
      minimatch: 3.1.2
      natural-compare: 1.4.0
      optionator: 0.9.4
    transitivePeerDependencies:
      - supports-color

  espree@10.3.0:
    dependencies:
      acorn: 8.14.0
      acorn-jsx: 5.3.2(acorn@8.14.0)
      eslint-visitor-keys: 4.2.0

  esprima@4.0.1: {}

  esquery@1.6.0:
    dependencies:
      estraverse: 5.3.0

  esrecurse@4.3.0:
    dependencies:
      estraverse: 5.3.0

  estraverse@4.3.0: {}

  estraverse@5.3.0: {}

  esutils@2.0.3: {}

  etag@1.8.1: {}

  event-target-shim@5.0.1: {}

  eventemitter3@4.0.7: {}

  events@3.3.0: {}

  execa@5.1.1:
    dependencies:
      cross-spawn: 7.0.6
      get-stream: 6.0.1
      human-signals: 2.1.0
      is-stream: 2.0.1
      merge-stream: 2.0.0
      npm-run-path: 4.0.1
      onetime: 5.1.2
      signal-exit: 3.0.7
      strip-final-newline: 2.0.0

  exit@0.1.2: {}

  expect@29.7.0:
    dependencies:
      '@jest/expect-utils': 29.7.0
      jest-get-type: 29.6.3
      jest-matcher-utils: 29.7.0
      jest-message-util: 29.7.0
      jest-util: 29.7.0

  exponential-backoff@3.1.2: {}

  express@5.0.1:
    dependencies:
      accepts: 2.0.0
      body-parser: 2.1.0
      content-disposition: 1.0.0
      content-type: 1.0.5
      cookie: 0.7.1
      cookie-signature: 1.2.2
      debug: 4.3.6
      depd: 2.0.0
      encodeurl: 2.0.0
      escape-html: 1.0.3
      etag: 1.8.1
      finalhandler: 2.0.0
      fresh: 2.0.0
      http-errors: 2.0.0
      merge-descriptors: 2.0.0
      methods: 1.1.2
      mime-types: 3.0.0
      on-finished: 2.4.1
      once: 1.4.0
      parseurl: 1.3.3
      proxy-addr: 2.0.7
      qs: 6.13.0
      range-parser: 1.2.1
      router: 2.1.0
      safe-buffer: 5.2.1
      send: 1.1.0
      serve-static: 2.1.0
      setprototypeof: 1.2.0
      statuses: 2.0.1
      type-is: 2.0.0
      utils-merge: 1.0.1
      vary: 1.1.2
    transitivePeerDependencies:
      - supports-color

  ext-list@2.2.2:
    dependencies:
      mime-db: 1.53.0

  ext-name@5.0.0:
    dependencies:
      ext-list: 2.2.2
      sort-keys-length: 1.0.1

  external-editor@3.1.0:
    dependencies:
      chardet: 0.7.0
      iconv-lite: 0.4.24
      tmp: 0.0.33

  fast-deep-equal@3.1.3: {}

  fast-diff@1.3.0: {}

  fast-fifo@1.3.2: {}

  fast-glob@3.3.3:
    dependencies:
      '@nodelib/fs.stat': 2.0.5
      '@nodelib/fs.walk': 1.2.8
      glob-parent: 5.1.2
      merge2: 1.4.1
      micromatch: 4.0.8

  fast-json-stable-stringify@2.1.0: {}

  fast-levenshtein@2.0.6: {}

  fast-safe-stringify@2.1.1: {}

  fast-uri@3.0.6: {}

  fast-xml-parser@4.5.1:
    dependencies:
      strnum: 1.0.5

  fastq@1.19.0:
    dependencies:
      reusify: 1.0.4

  fb-watchman@2.0.2:
    dependencies:
      bser: 2.1.1

  file-entry-cache@8.0.0:
    dependencies:
      flat-cache: 4.0.1

  file-type@19.6.0:
    dependencies:
      get-stream: 9.0.1
      strtok3: 9.1.1
      token-types: 6.0.0
      uint8array-extras: 1.4.0

  filelist@1.0.4:
    dependencies:
      minimatch: 5.1.6

  filename-reserved-regex@3.0.0: {}

  filenamify@6.0.0:
    dependencies:
      filename-reserved-regex: 3.0.0

  fill-range@7.1.1:
    dependencies:
      to-regex-range: 5.0.1

  finalhandler@2.0.0:
    dependencies:
      debug: 2.6.9
      encodeurl: 1.0.2
      escape-html: 1.0.3
      on-finished: 2.4.1
      parseurl: 1.3.3
      statuses: 2.0.1
      unpipe: 1.0.0
    transitivePeerDependencies:
      - supports-color

  find-up@4.1.0:
    dependencies:
      locate-path: 5.0.0
      path-exists: 4.0.0

  find-up@5.0.0:
    dependencies:
      locate-path: 6.0.0
      path-exists: 4.0.0

  find-versions@5.1.0:
    dependencies:
      semver-regex: 4.0.5

  flat-cache@4.0.1:
    dependencies:
      flatted: 3.3.2
      keyv: 4.5.4

  flatted@3.3.2: {}

  foreground-child@3.3.0:
    dependencies:
      cross-spawn: 7.0.6
      signal-exit: 4.1.0

  fork-ts-checker-webpack-plugin@9.0.2(typescript@5.7.3)(webpack@5.97.1(@swc/core@1.10.16)):
    dependencies:
      '@babel/code-frame': 7.26.2
      chalk: 4.1.2
      chokidar: 3.6.0
      cosmiconfig: 8.3.6(typescript@5.7.3)
      deepmerge: 4.3.1
      fs-extra: 10.1.0
      memfs: 3.5.3
      minimatch: 3.1.2
      node-abort-controller: 3.1.1
      schema-utils: 3.3.0
      semver: 7.7.1
      tapable: 2.2.1
      typescript: 5.7.3
      webpack: 5.97.1(@swc/core@1.10.16)

  form-data-encoder@1.7.2: {}

  form-data-encoder@2.1.4: {}

  form-data@4.0.1:
    dependencies:
      asynckit: 0.4.0
      combined-stream: 1.0.8
      mime-types: 2.1.35

  formdata-node@4.4.1:
    dependencies:
      node-domexception: 1.0.0
      web-streams-polyfill: 4.0.0-beta.3

  formidable@3.5.2:
    dependencies:
      dezalgo: 1.0.4
      hexoid: 2.0.0
      once: 1.4.0

  forwarded@0.2.0: {}

  fresh@0.5.2: {}

  fresh@2.0.0: {}

  fs-extra@10.1.0:
    dependencies:
      graceful-fs: 4.2.11
      jsonfile: 6.1.0
      universalify: 2.0.1

  fs-monkey@1.0.6: {}

  fs.realpath@1.0.0: {}

  fsevents@2.3.3:
    optional: true

  function-bind@1.1.2: {}

  gensync@1.0.0-beta.2: {}

  get-caller-file@2.0.5: {}

  get-intrinsic@1.2.7:
    dependencies:
      call-bind-apply-helpers: 1.0.1
      es-define-property: 1.0.1
      es-errors: 1.3.0
      es-object-atoms: 1.1.1
      function-bind: 1.1.2
      get-proto: 1.0.1
      gopd: 1.2.0
      has-symbols: 1.1.0
      hasown: 2.0.2
      math-intrinsics: 1.1.0

  get-package-type@0.1.0: {}

  get-proto@1.0.1:
    dependencies:
      dunder-proto: 1.0.1
      es-object-atoms: 1.1.1

  get-stream@6.0.1: {}

  get-stream@9.0.1:
    dependencies:
      '@sec-ant/readable-stream': 0.4.1
      is-stream: 4.0.1

  glob-parent@5.1.2:
    dependencies:
      is-glob: 4.0.3

  glob-parent@6.0.2:
    dependencies:
      is-glob: 4.0.3

  glob-to-regexp@0.4.1: {}

  glob@11.0.1:
    dependencies:
      foreground-child: 3.3.0
      jackspeak: 4.0.3
      minimatch: 10.0.1
      minipass: 7.1.2
      package-json-from-dist: 1.0.1
      path-scurry: 2.0.0

  glob@7.2.3:
    dependencies:
      fs.realpath: 1.0.0
      inflight: 1.0.6
      inherits: 2.0.4
      minimatch: 3.1.2
      once: 1.4.0
      path-is-absolute: 1.0.1

  globals@11.12.0: {}

  globals@14.0.0: {}

  globals@15.15.0: {}

  gopd@1.2.0: {}

  got@13.0.0:
    dependencies:
      '@sindresorhus/is': 5.6.0
      '@szmarczak/http-timer': 5.0.1
      cacheable-lookup: 7.0.0
      cacheable-request: 10.2.14
      decompress-response: 6.0.0
      form-data-encoder: 2.1.4
      get-stream: 6.0.1
      http2-wrapper: 2.2.1
      lowercase-keys: 3.0.0
      p-cancelable: 3.0.0
      responselike: 3.0.0

  graceful-fs@4.2.11: {}

  graphemer@1.4.0: {}

  groq-sdk@0.3.3:
    dependencies:
      '@types/node': 18.19.75
      '@types/node-fetch': 2.6.12
      abort-controller: 3.0.0
      agentkeepalive: 4.6.0
      digest-fetch: 1.3.0
      form-data-encoder: 1.7.2
      formdata-node: 4.4.1
      node-fetch: 2.7.0
      web-streams-polyfill: 3.3.3
    transitivePeerDependencies:
      - encoding

  has-flag@4.0.0: {}

  has-own-prop@2.0.0: {}

  has-symbols@1.1.0: {}

  hasown@2.0.2:
    dependencies:
      function-bind: 1.1.2

  hexoid@2.0.0: {}

  html-escaper@2.0.2: {}

  htmlparser2@9.1.0:
    dependencies:
      domelementtype: 2.3.0
      domhandler: 5.0.3
      domutils: 3.2.2
      entities: 4.5.0

  http-cache-semantics@4.1.1: {}

  http-errors@2.0.0:
    dependencies:
      depd: 2.0.0
      inherits: 2.0.4
      setprototypeof: 1.2.0
      statuses: 2.0.1
      toidentifier: 1.0.1

  http2-wrapper@2.2.1:
    dependencies:
      quick-lru: 5.1.1
      resolve-alpn: 1.2.1

  human-signals@2.1.0: {}

  humanize-ms@1.2.1:
    dependencies:
      ms: 2.1.3

  iconv-lite@0.4.24:
    dependencies:
      safer-buffer: 2.1.2

  iconv-lite@0.5.2:
    dependencies:
      safer-buffer: 2.1.2

  iconv-lite@0.6.3:
    dependencies:
      safer-buffer: 2.1.2

  ieee754@1.2.1: {}

  ignore@5.3.2: {}

  import-fresh@3.3.1:
    dependencies:
      parent-module: 1.0.1
      resolve-from: 4.0.0

  import-local@3.2.0:
    dependencies:
      pkg-dir: 4.2.0
      resolve-cwd: 3.0.0

  imurmurhash@0.1.4: {}

  inflight@1.0.6:
    dependencies:
      once: 1.4.0
      wrappy: 1.0.2

  inherits@2.0.4: {}

  inspect-with-kind@1.0.5:
    dependencies:
      kind-of: 6.0.3

  ipaddr.js@1.9.1: {}

  is-any-array@2.0.1: {}

  is-arrayish@0.2.1: {}

  is-binary-path@2.1.0:
    dependencies:
      binary-extensions: 2.3.0

  is-buffer@1.1.6: {}

  is-core-module@2.16.1:
    dependencies:
      hasown: 2.0.2

  is-extglob@2.1.1: {}

  is-fullwidth-code-point@3.0.0: {}

  is-generator-fn@2.1.0: {}

  is-glob@4.0.3:
    dependencies:
      is-extglob: 2.1.1

  is-interactive@1.0.0: {}

  is-number@7.0.0: {}

  is-plain-obj@1.1.0: {}

  is-promise@4.0.0: {}

  is-stream@2.0.1: {}

  is-stream@4.0.1: {}

  is-unicode-supported@0.1.0: {}

  isarray@1.0.0: {}

  isexe@2.0.0: {}

  istanbul-lib-coverage@3.2.2: {}

  istanbul-lib-instrument@5.2.1:
    dependencies:
      '@babel/core': 7.26.8
      '@babel/parser': 7.26.8
      '@istanbuljs/schema': 0.1.3
      istanbul-lib-coverage: 3.2.2
      semver: 6.3.1
    transitivePeerDependencies:
      - supports-color

  istanbul-lib-instrument@6.0.3:
    dependencies:
      '@babel/core': 7.26.8
      '@babel/parser': 7.26.8
      '@istanbuljs/schema': 0.1.3
      istanbul-lib-coverage: 3.2.2
      semver: 7.7.1
    transitivePeerDependencies:
      - supports-color

  istanbul-lib-report@3.0.1:
    dependencies:
      istanbul-lib-coverage: 3.2.2
      make-dir: 4.0.0
      supports-color: 7.2.0

  istanbul-lib-source-maps@4.0.1:
    dependencies:
      debug: 4.4.0
      istanbul-lib-coverage: 3.2.2
      source-map: 0.6.1
    transitivePeerDependencies:
      - supports-color

  istanbul-reports@3.1.7:
    dependencies:
      html-escaper: 2.0.2
      istanbul-lib-report: 3.0.1

  iterare@1.2.1: {}

  jackspeak@4.0.3:
    dependencies:
      '@isaacs/cliui': 8.0.2

  jake@10.9.2:
    dependencies:
      async: 3.2.6
      chalk: 4.1.2
      filelist: 1.0.4
      minimatch: 3.1.2

  jest-changed-files@29.7.0:
    dependencies:
      execa: 5.1.1
      jest-util: 29.7.0
      p-limit: 3.1.0

  jest-circus@29.7.0:
    dependencies:
      '@jest/environment': 29.7.0
      '@jest/expect': 29.7.0
      '@jest/test-result': 29.7.0
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      chalk: 4.1.2
      co: 4.6.0
      dedent: 1.5.3
      is-generator-fn: 2.1.0
      jest-each: 29.7.0
      jest-matcher-utils: 29.7.0
      jest-message-util: 29.7.0
      jest-runtime: 29.7.0
      jest-snapshot: 29.7.0
      jest-util: 29.7.0
      p-limit: 3.1.0
      pretty-format: 29.7.0
      pure-rand: 6.1.0
      slash: 3.0.0
      stack-utils: 2.0.6
    transitivePeerDependencies:
      - babel-plugin-macros
      - supports-color

  jest-cli@29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3)):
    dependencies:
      '@jest/core': 29.7.0(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))
      '@jest/test-result': 29.7.0
      '@jest/types': 29.6.3
      chalk: 4.1.2
      create-jest: 29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))
      exit: 0.1.2
      import-local: 3.2.0
      jest-config: 29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))
      jest-util: 29.7.0
      jest-validate: 29.7.0
      yargs: 17.7.2
    transitivePeerDependencies:
      - '@types/node'
      - babel-plugin-macros
      - supports-color
      - ts-node

  jest-config@29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3)):
    dependencies:
      '@babel/core': 7.26.8
      '@jest/test-sequencer': 29.7.0
      '@jest/types': 29.6.3
      babel-jest: 29.7.0(@babel/core@7.26.8)
      chalk: 4.1.2
      ci-info: 3.9.0
      deepmerge: 4.3.1
      glob: 7.2.3
      graceful-fs: 4.2.11
      jest-circus: 29.7.0
      jest-environment-node: 29.7.0
      jest-get-type: 29.6.3
      jest-regex-util: 29.6.3
      jest-resolve: 29.7.0
      jest-runner: 29.7.0
      jest-util: 29.7.0
      jest-validate: 29.7.0
      micromatch: 4.0.8
      parse-json: 5.2.0
      pretty-format: 29.7.0
      slash: 3.0.0
      strip-json-comments: 3.1.1
    optionalDependencies:
      '@types/node': 20.17.17
      ts-node: 10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3)
    transitivePeerDependencies:
      - babel-plugin-macros
      - supports-color

  jest-diff@29.7.0:
    dependencies:
      chalk: 4.1.2
      diff-sequences: 29.6.3
      jest-get-type: 29.6.3
      pretty-format: 29.7.0

  jest-docblock@29.7.0:
    dependencies:
      detect-newline: 3.1.0

  jest-each@29.7.0:
    dependencies:
      '@jest/types': 29.6.3
      chalk: 4.1.2
      jest-get-type: 29.6.3
      jest-util: 29.7.0
      pretty-format: 29.7.0

  jest-environment-node@29.7.0:
    dependencies:
      '@jest/environment': 29.7.0
      '@jest/fake-timers': 29.7.0
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      jest-mock: 29.7.0
      jest-util: 29.7.0

  jest-get-type@29.6.3: {}

  jest-haste-map@29.7.0:
    dependencies:
      '@jest/types': 29.6.3
      '@types/graceful-fs': 4.1.9
      '@types/node': 20.17.17
      anymatch: 3.1.3
      fb-watchman: 2.0.2
      graceful-fs: 4.2.11
      jest-regex-util: 29.6.3
      jest-util: 29.7.0
      jest-worker: 29.7.0
      micromatch: 4.0.8
      walker: 1.0.8
    optionalDependencies:
      fsevents: 2.3.3

  jest-leak-detector@29.7.0:
    dependencies:
      jest-get-type: 29.6.3
      pretty-format: 29.7.0

  jest-matcher-utils@29.7.0:
    dependencies:
      chalk: 4.1.2
      jest-diff: 29.7.0
      jest-get-type: 29.6.3
      pretty-format: 29.7.0

  jest-message-util@29.7.0:
    dependencies:
      '@babel/code-frame': 7.26.2
      '@jest/types': 29.6.3
      '@types/stack-utils': 2.0.3
      chalk: 4.1.2
      graceful-fs: 4.2.11
      micromatch: 4.0.8
      pretty-format: 29.7.0
      slash: 3.0.0
      stack-utils: 2.0.6

  jest-mock@29.7.0:
    dependencies:
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      jest-util: 29.7.0

  jest-pnp-resolver@1.2.3(jest-resolve@29.7.0):
    optionalDependencies:
      jest-resolve: 29.7.0

  jest-regex-util@29.6.3: {}

  jest-resolve-dependencies@29.7.0:
    dependencies:
      jest-regex-util: 29.6.3
      jest-snapshot: 29.7.0
    transitivePeerDependencies:
      - supports-color

  jest-resolve@29.7.0:
    dependencies:
      chalk: 4.1.2
      graceful-fs: 4.2.11
      jest-haste-map: 29.7.0
      jest-pnp-resolver: 1.2.3(jest-resolve@29.7.0)
      jest-util: 29.7.0
      jest-validate: 29.7.0
      resolve: 1.22.10
      resolve.exports: 2.0.3
      slash: 3.0.0

  jest-runner@29.7.0:
    dependencies:
      '@jest/console': 29.7.0
      '@jest/environment': 29.7.0
      '@jest/test-result': 29.7.0
      '@jest/transform': 29.7.0
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      chalk: 4.1.2
      emittery: 0.13.1
      graceful-fs: 4.2.11
      jest-docblock: 29.7.0
      jest-environment-node: 29.7.0
      jest-haste-map: 29.7.0
      jest-leak-detector: 29.7.0
      jest-message-util: 29.7.0
      jest-resolve: 29.7.0
      jest-runtime: 29.7.0
      jest-util: 29.7.0
      jest-watcher: 29.7.0
      jest-worker: 29.7.0
      p-limit: 3.1.0
      source-map-support: 0.5.13
    transitivePeerDependencies:
      - supports-color

  jest-runtime@29.7.0:
    dependencies:
      '@jest/environment': 29.7.0
      '@jest/fake-timers': 29.7.0
      '@jest/globals': 29.7.0
      '@jest/source-map': 29.6.3
      '@jest/test-result': 29.7.0
      '@jest/transform': 29.7.0
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      chalk: 4.1.2
      cjs-module-lexer: 1.4.3
      collect-v8-coverage: 1.0.2
      glob: 7.2.3
      graceful-fs: 4.2.11
      jest-haste-map: 29.7.0
      jest-message-util: 29.7.0
      jest-mock: 29.7.0
      jest-regex-util: 29.6.3
      jest-resolve: 29.7.0
      jest-snapshot: 29.7.0
      jest-util: 29.7.0
      slash: 3.0.0
      strip-bom: 4.0.0
    transitivePeerDependencies:
      - supports-color

  jest-snapshot@29.7.0:
    dependencies:
      '@babel/core': 7.26.8
      '@babel/generator': 7.26.8
      '@babel/plugin-syntax-jsx': 7.25.9(@babel/core@7.26.8)
      '@babel/plugin-syntax-typescript': 7.25.9(@babel/core@7.26.8)
      '@babel/types': 7.26.8
      '@jest/expect-utils': 29.7.0
      '@jest/transform': 29.7.0
      '@jest/types': 29.6.3
      babel-preset-current-node-syntax: 1.1.0(@babel/core@7.26.8)
      chalk: 4.1.2
      expect: 29.7.0
      graceful-fs: 4.2.11
      jest-diff: 29.7.0
      jest-get-type: 29.6.3
      jest-matcher-utils: 29.7.0
      jest-message-util: 29.7.0
      jest-util: 29.7.0
      natural-compare: 1.4.0
      pretty-format: 29.7.0
      semver: 7.7.1
    transitivePeerDependencies:
      - supports-color

  jest-util@29.7.0:
    dependencies:
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      chalk: 4.1.2
      ci-info: 3.9.0
      graceful-fs: 4.2.11
      picomatch: 2.3.1

  jest-validate@29.7.0:
    dependencies:
      '@jest/types': 29.6.3
      camelcase: 6.3.0
      chalk: 4.1.2
      jest-get-type: 29.6.3
      leven: 3.1.0
      pretty-format: 29.7.0

  jest-watcher@29.7.0:
    dependencies:
      '@jest/test-result': 29.7.0
      '@jest/types': 29.6.3
      '@types/node': 20.17.17
      ansi-escapes: 4.3.2
      chalk: 4.1.2
      emittery: 0.13.1
      jest-util: 29.7.0
      string-length: 4.0.2

  jest-worker@27.5.1:
    dependencies:
      '@types/node': 20.17.17
      merge-stream: 2.0.0
      supports-color: 8.1.1

  jest-worker@29.7.0:
    dependencies:
      '@types/node': 20.17.17
      jest-util: 29.7.0
      merge-stream: 2.0.0
      supports-color: 8.1.1

  jest@29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3)):
    dependencies:
      '@jest/core': 29.7.0(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))
      '@jest/types': 29.6.3
      import-local: 3.2.0
      jest-cli: 29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))
    transitivePeerDependencies:
      - '@types/node'
      - babel-plugin-macros
      - supports-color
      - ts-node

  js-tiktoken@1.0.18:
    dependencies:
      base64-js: 1.5.1

  js-tokens@4.0.0: {}

  js-yaml@3.14.1:
    dependencies:
      argparse: 1.0.10
      esprima: 4.0.1

  js-yaml@4.1.0:
    dependencies:
      argparse: 2.0.1

  jsesc@3.1.0: {}

  json-buffer@3.0.1: {}

  json-parse-even-better-errors@2.3.1: {}

  json-schema-traverse@0.4.1: {}

  json-schema-traverse@1.0.0: {}

  json-stable-stringify-without-jsonify@1.0.1: {}

  json5@2.2.3: {}

  jsonc-parser@3.3.1: {}

  jsonfile@6.1.0:
    dependencies:
      universalify: 2.0.1
    optionalDependencies:
      graceful-fs: 4.2.11

  keyv@4.5.4:
    dependencies:
      json-buffer: 3.0.1

  kind-of@6.0.3: {}

  kleur@3.0.3: {}

  langsmith@0.1.68(openai@4.84.0(zod@3.24.2)):
    dependencies:
      '@types/uuid': 10.0.0
      commander: 10.0.1
      p-queue: 6.6.2
      p-retry: 4.6.2
      semver: 7.7.1
      uuid: 10.0.0
    optionalDependencies:
      openai: 4.84.0(zod@3.24.2)

  langsmith@0.3.7(openai@4.84.0(zod@3.24.2)):
    dependencies:
      '@types/uuid': 10.0.0
      chalk: 4.1.2
      console-table-printer: 2.12.1
      p-queue: 6.6.2
      p-retry: 4.6.2
      semver: 7.7.1
      uuid: 10.0.0
    optionalDependencies:
      openai: 4.84.0(zod@3.24.2)

  leven@3.1.0: {}

  levn@0.4.1:
    dependencies:
      prelude-ls: 1.2.1
      type-check: 0.4.0

  lines-and-columns@1.2.4: {}

  loader-runner@4.3.0: {}

  locate-path@5.0.0:
    dependencies:
      p-locate: 4.1.0

  locate-path@6.0.0:
    dependencies:
      p-locate: 5.0.0

  lodash.memoize@4.1.2: {}

  lodash.merge@4.6.2: {}

  lodash@4.17.21: {}

  log-symbols@4.1.0:
    dependencies:
      chalk: 4.1.2
      is-unicode-supported: 0.1.0

  lowercase-keys@3.0.0: {}

  lru-cache@11.0.2: {}

  lru-cache@5.1.1:
    dependencies:
      yallist: 3.1.1

  magic-string@0.30.12:
    dependencies:
      '@jridgewell/sourcemap-codec': 1.5.0

  magic-string@0.30.17:
    dependencies:
      '@jridgewell/sourcemap-codec': 1.5.0

  make-dir@4.0.0:
    dependencies:
      semver: 7.7.1

  make-error@1.3.6: {}

  makeerror@1.0.12:
    dependencies:
      tmpl: 1.0.5

  math-intrinsics@1.1.0: {}

  md5@2.3.0:
    dependencies:
      charenc: 0.0.2
      crypt: 0.0.2
      is-buffer: 1.1.6

  media-typer@0.3.0: {}

  media-typer@1.1.0: {}

  memfs@3.5.3:
    dependencies:
      fs-monkey: 1.0.6

  merge-descriptors@2.0.0: {}

  merge-stream@2.0.0: {}

  merge2@1.4.1: {}

  methods@1.1.2: {}

  micromatch@4.0.8:
    dependencies:
      braces: 3.0.3
      picomatch: 2.3.1

  mime-db@1.52.0: {}

  mime-db@1.53.0: {}

  mime-types@2.1.35:
    dependencies:
      mime-db: 1.52.0

  mime-types@3.0.0:
    dependencies:
      mime-db: 1.53.0

  mime@2.6.0: {}

  mimic-fn@2.1.0: {}

  mimic-response@3.1.0: {}

  mimic-response@4.0.0: {}

  minimatch@10.0.1:
    dependencies:
      brace-expansion: 2.0.1

  minimatch@3.1.2:
    dependencies:
      brace-expansion: 1.1.11

  minimatch@5.1.6:
    dependencies:
      brace-expansion: 2.0.1

  minimatch@9.0.5:
    dependencies:
      brace-expansion: 2.0.1

  minimist@1.2.8: {}

  minipass@7.1.2: {}

  mkdirp@0.5.6:
    dependencies:
      minimist: 1.2.8

  ml-array-mean@1.1.6:
    dependencies:
      ml-array-sum: 1.1.6

  ml-array-sum@1.1.6:
    dependencies:
      is-any-array: 2.0.1

  ml-distance-euclidean@2.0.0: {}

  ml-distance@4.0.1:
    dependencies:
      ml-array-mean: 1.1.6
      ml-distance-euclidean: 2.0.0
      ml-tree-similarity: 1.0.0

  ml-tree-similarity@1.0.0:
    dependencies:
      binary-search: 1.3.6
      num-sort: 2.1.0

  ms@2.0.0: {}

  ms@2.1.2: {}

  ms@2.1.3: {}

  multer@1.4.5-lts.1:
    dependencies:
      append-field: 1.0.0
      busboy: 1.6.0
      concat-stream: 1.6.2
      mkdirp: 0.5.6
      object-assign: 4.1.1
      type-is: 1.6.18
      xtend: 4.0.2

  mustache@4.2.0: {}

  mute-stream@2.0.0: {}

  natural-compare@1.4.0: {}

  negotiator@0.6.3: {}

  negotiator@1.0.0: {}

  neo-async@2.6.2: {}

  node-abort-controller@3.1.1: {}

  node-domexception@1.0.0: {}

  node-emoji@1.11.0:
    dependencies:
      lodash: 4.17.21

  node-fetch@2.7.0:
    dependencies:
      whatwg-url: 5.0.0

  node-int64@0.4.0: {}

  node-releases@2.0.19: {}

  normalize-path@3.0.0: {}

  normalize-url@8.0.1: {}

  npm-run-path@4.0.1:
    dependencies:
      path-key: 3.1.1

  nth-check@2.1.1:
    dependencies:
      boolbase: 1.0.0

  num-sort@2.1.0: {}

  object-assign@4.1.1: {}

  object-hash@3.0.0: {}

  object-inspect@1.13.4: {}

  on-finished@2.4.1:
    dependencies:
      ee-first: 1.1.1

  once@1.4.0:
    dependencies:
      wrappy: 1.0.2

  onetime@5.1.2:
    dependencies:
      mimic-fn: 2.1.0

  openai@4.84.0(zod@3.24.2):
    dependencies:
      '@types/node': 18.19.75
      '@types/node-fetch': 2.6.12
      abort-controller: 3.0.0
      agentkeepalive: 4.6.0
      form-data-encoder: 1.7.2
      formdata-node: 4.4.1
      node-fetch: 2.7.0
    optionalDependencies:
      zod: 3.24.2
    transitivePeerDependencies:
      - encoding

  optionator@0.9.4:
    dependencies:
      deep-is: 0.1.4
      fast-levenshtein: 2.0.6
      levn: 0.4.1
      prelude-ls: 1.2.1
      type-check: 0.4.0
      word-wrap: 1.2.5

  ora@5.4.1:
    dependencies:
      bl: 4.1.0
      chalk: 4.1.2
      cli-cursor: 3.1.0
      cli-spinners: 2.9.2
      is-interactive: 1.0.0
      is-unicode-supported: 0.1.0
      log-symbols: 4.1.0
      strip-ansi: 6.0.1
      wcwidth: 1.0.1

  os-tmpdir@1.0.2: {}

  p-cancelable@3.0.0: {}

  p-finally@1.0.0: {}

  p-limit@2.3.0:
    dependencies:
      p-try: 2.2.0

  p-limit@3.1.0:
    dependencies:
      yocto-queue: 0.1.0

  p-locate@4.1.0:
    dependencies:
      p-limit: 2.3.0

  p-locate@5.0.0:
    dependencies:
      p-limit: 3.1.0

  p-queue@6.6.2:
    dependencies:
      eventemitter3: 4.0.7
      p-timeout: 3.2.0

  p-retry@4.6.2:
    dependencies:
      '@types/retry': 0.12.0
      retry: 0.13.1

  p-timeout@3.2.0:
    dependencies:
      p-finally: 1.0.0

  p-try@2.2.0: {}

  package-json-from-dist@1.0.1: {}

  parent-module@1.0.1:
    dependencies:
      callsites: 3.1.0

  parse-json@5.2.0:
    dependencies:
      '@babel/code-frame': 7.26.2
      error-ex: 1.3.2
      json-parse-even-better-errors: 2.3.1
      lines-and-columns: 1.2.4

  parse5-htmlparser2-tree-adapter@7.1.0:
    dependencies:
      domhandler: 5.0.3
      parse5: 7.2.1

  parse5-parser-stream@7.1.2:
    dependencies:
      parse5: 7.2.1

  parse5@7.2.1:
    dependencies:
      entities: 4.5.0

  parseurl@1.3.3: {}

  path-exists@4.0.0: {}

  path-is-absolute@1.0.1: {}

  path-key@3.1.1: {}

  path-parse@1.0.7: {}

  path-scurry@2.0.0:
    dependencies:
      lru-cache: 11.0.2
      minipass: 7.1.2

  path-to-regexp@8.2.0: {}

  path-type@4.0.0: {}

  peek-readable@5.4.2: {}

  pend@1.2.0: {}

  picocolors@1.1.1: {}

  picomatch@2.3.1: {}

  picomatch@4.0.2: {}

  pirates@4.0.6: {}

  piscina@4.8.0:
    optionalDependencies:
      '@napi-rs/nice': 1.0.1

  pkg-dir@4.2.0:
    dependencies:
      find-up: 4.1.0

  pluralize@8.0.0: {}

  prelude-ls@1.2.1: {}

  prettier-linter-helpers@1.0.0:
    dependencies:
      fast-diff: 1.3.0

  prettier@3.5.0: {}

  pretty-format@29.7.0:
    dependencies:
      '@jest/schemas': 29.6.3
      ansi-styles: 5.2.0
      react-is: 18.3.1

  process-nextick-args@2.0.1: {}

  prompts@2.4.2:
    dependencies:
      kleur: 3.0.3
      sisteransi: 1.0.5

  proxy-addr@2.0.7:
    dependencies:
      forwarded: 0.2.0
      ipaddr.js: 1.9.1

  punycode@2.3.1: {}

  pure-rand@6.1.0: {}

  qs@6.13.0:
    dependencies:
      side-channel: 1.1.0

  qs@6.14.0:
    dependencies:
      side-channel: 1.1.0

  queue-microtask@1.2.3: {}

  quick-lru@5.1.1: {}

  randombytes@2.1.0:
    dependencies:
      safe-buffer: 5.2.1

  range-parser@1.2.1: {}

  raw-body@3.0.0:
    dependencies:
      bytes: 3.1.2
      http-errors: 2.0.0
      iconv-lite: 0.6.3
      unpipe: 1.0.0

  react-is@18.3.1: {}

  readable-stream@2.3.8:
    dependencies:
      core-util-is: 1.0.3
      inherits: 2.0.4
      isarray: 1.0.0
      process-nextick-args: 2.0.1
      safe-buffer: 5.1.2
      string_decoder: 1.1.1
      util-deprecate: 1.0.2

  readable-stream@3.6.2:
    dependencies:
      inherits: 2.0.4
      string_decoder: 1.3.0
      util-deprecate: 1.0.2

  readdirp@3.6.0:
    dependencies:
      picomatch: 2.3.1

  readdirp@4.1.1: {}

  reflect-metadata@0.2.2: {}

  repeat-string@1.6.1: {}

  require-directory@2.1.1: {}

  require-from-string@2.0.2: {}

  resolve-alpn@1.2.1: {}

  resolve-cwd@3.0.0:
    dependencies:
      resolve-from: 5.0.0

  resolve-from@4.0.0: {}

  resolve-from@5.0.0: {}

  resolve.exports@2.0.3: {}

  resolve@1.22.10:
    dependencies:
      is-core-module: 2.16.1
      path-parse: 1.0.7
      supports-preserve-symlinks-flag: 1.0.0

  responselike@3.0.0:
    dependencies:
      lowercase-keys: 3.0.0

  restore-cursor@3.1.0:
    dependencies:
      onetime: 5.1.2
      signal-exit: 3.0.7

  retry@0.13.1: {}

  reusify@1.0.4: {}

  robots-parser@3.0.1: {}

  router@2.1.0:
    dependencies:
      is-promise: 4.0.0
      parseurl: 1.3.3
      path-to-regexp: 8.2.0

  run-parallel@1.2.0:
    dependencies:
      queue-microtask: 1.2.3

  rxjs@7.8.1:
    dependencies:
      tslib: 2.8.1

  safe-buffer@5.1.2: {}

  safe-buffer@5.2.1: {}

  safer-buffer@2.1.2: {}

  schema-utils@3.3.0:
    dependencies:
      '@types/json-schema': 7.0.15
      ajv: 6.12.6
      ajv-keywords: 3.5.2(ajv@6.12.6)

  schema-utils@4.3.0:
    dependencies:
      '@types/json-schema': 7.0.15
      ajv: 8.17.1
      ajv-formats: 2.1.1(ajv@8.17.1)
      ajv-keywords: 5.1.0(ajv@8.17.1)

  seek-bzip@2.0.0:
    dependencies:
      commander: 6.2.1

  semver-regex@4.0.5: {}

  semver-truncate@3.0.0:
    dependencies:
      semver: 7.7.1

  semver@6.3.1: {}

  semver@7.7.1: {}

  send@1.1.0:
    dependencies:
      debug: 4.3.6
      destroy: 1.2.0
      encodeurl: 2.0.0
      escape-html: 1.0.3
      etag: 1.8.1
      fresh: 0.5.2
      http-errors: 2.0.0
      mime-types: 2.1.35
      ms: 2.1.3
      on-finished: 2.4.1
      range-parser: 1.2.1
      statuses: 2.0.1
    transitivePeerDependencies:
      - supports-color

  serialize-javascript@6.0.2:
    dependencies:
      randombytes: 2.1.0

  serve-static@2.1.0:
    dependencies:
      encodeurl: 2.0.0
      escape-html: 1.0.3
      parseurl: 1.3.3
      send: 1.1.0
    transitivePeerDependencies:
      - supports-color

  setprototypeof@1.2.0: {}

  shebang-command@2.0.0:
    dependencies:
      shebang-regex: 3.0.0

  shebang-regex@3.0.0: {}

  side-channel-list@1.0.0:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4

  side-channel-map@1.0.1:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      get-intrinsic: 1.2.7
      object-inspect: 1.13.4

  side-channel-weakmap@1.0.2:
    dependencies:
      call-bound: 1.0.3
      es-errors: 1.3.0
      get-intrinsic: 1.2.7
      object-inspect: 1.13.4
      side-channel-map: 1.0.1

  side-channel@1.1.0:
    dependencies:
      es-errors: 1.3.0
      object-inspect: 1.13.4
      side-channel-list: 1.0.0
      side-channel-map: 1.0.1
      side-channel-weakmap: 1.0.2

  signal-exit@3.0.7: {}

  signal-exit@4.1.0: {}

  simple-wcswidth@1.0.1: {}

  sisteransi@1.0.5: {}

  slash@3.0.0: {}

  socket.io-adapter@2.5.5:
    dependencies:
      debug: 4.3.6
      ws: 8.17.1
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  socket.io-parser@4.2.4:
    dependencies:
      '@socket.io/component-emitter': 3.1.2
      debug: 4.3.6
    transitivePeerDependencies:
      - supports-color

  socket.io@4.8.1:
    dependencies:
      accepts: 1.3.8
      base64id: 2.0.0
      cors: 2.8.5
      debug: 4.3.6
      engine.io: 6.6.4
      socket.io-adapter: 2.5.5
      socket.io-parser: 4.2.4
    transitivePeerDependencies:
      - bufferutil
      - supports-color
      - utf-8-validate

  sort-keys-length@1.0.1:
    dependencies:
      sort-keys: 1.1.2

  sort-keys@1.1.2:
    dependencies:
      is-plain-obj: 1.1.0

  source-map-support@0.5.13:
    dependencies:
      buffer-from: 1.1.2
      source-map: 0.6.1

  source-map-support@0.5.21:
    dependencies:
      buffer-from: 1.1.2
      source-map: 0.6.1

  source-map@0.6.1: {}

  source-map@0.7.4: {}

  sprintf-js@1.0.3: {}

  stack-utils@2.0.6:
    dependencies:
      escape-string-regexp: 2.0.0

  statuses@2.0.1: {}

  streamsearch@1.1.0: {}

  streamx@2.22.0:
    dependencies:
      fast-fifo: 1.3.2
      text-decoder: 1.2.3
    optionalDependencies:
      bare-events: 2.5.4

  string-length@4.0.2:
    dependencies:
      char-regex: 1.0.2
      strip-ansi: 6.0.1

  string-width@4.2.3:
    dependencies:
      emoji-regex: 8.0.0
      is-fullwidth-code-point: 3.0.0
      strip-ansi: 6.0.1

  string-width@5.1.2:
    dependencies:
      eastasianwidth: 0.2.0
      emoji-regex: 9.2.2
      strip-ansi: 7.1.0

  string_decoder@1.1.1:
    dependencies:
      safe-buffer: 5.1.2

  string_decoder@1.3.0:
    dependencies:
      safe-buffer: 5.2.1

  strip-ansi@6.0.1:
    dependencies:
      ansi-regex: 5.0.1

  strip-ansi@7.1.0:
    dependencies:
      ansi-regex: 6.1.0

  strip-bom@3.0.0: {}

  strip-bom@4.0.0: {}

  strip-dirs@3.0.0:
    dependencies:
      inspect-with-kind: 1.0.5
      is-plain-obj: 1.1.0

  strip-final-newline@2.0.0: {}

  strip-json-comments@3.1.1: {}

  strnum@1.0.5: {}

  strtok3@9.1.1:
    dependencies:
      '@tokenizer/token': 0.3.0
      peek-readable: 5.4.2

  superagent@9.0.2:
    dependencies:
      component-emitter: 1.3.1
      cookiejar: 2.1.4
      debug: 4.4.0
      fast-safe-stringify: 2.1.1
      form-data: 4.0.1
      formidable: 3.5.2
      methods: 1.1.2
      mime: 2.6.0
      qs: 6.14.0
    transitivePeerDependencies:
      - supports-color

  supertest@7.0.0:
    dependencies:
      methods: 1.1.2
      superagent: 9.0.2
    transitivePeerDependencies:
      - supports-color

  supports-color@7.2.0:
    dependencies:
      has-flag: 4.0.0

  supports-color@8.1.1:
    dependencies:
      has-flag: 4.0.0

  supports-preserve-symlinks-flag@1.0.0: {}

  symbol-observable@4.0.0: {}

  synckit@0.9.2:
    dependencies:
      '@pkgr/core': 0.1.1
      tslib: 2.8.1

  tapable@2.2.1: {}

  tar-stream@3.1.7:
    dependencies:
      b4a: 1.6.7
      fast-fifo: 1.3.2
      streamx: 2.22.0

  terser-webpack-plugin@5.3.11(@swc/core@1.10.16)(webpack@5.97.1(@swc/core@1.10.16)):
    dependencies:
      '@jridgewell/trace-mapping': 0.3.25
      jest-worker: 27.5.1
      schema-utils: 4.3.0
      serialize-javascript: 6.0.2
      terser: 5.38.2
      webpack: 5.97.1(@swc/core@1.10.16)
    optionalDependencies:
      '@swc/core': 1.10.16

  terser@5.38.2:
    dependencies:
      '@jridgewell/source-map': 0.3.6
      acorn: 8.14.0
      commander: 2.20.3
      source-map-support: 0.5.21

  test-exclude@6.0.0:
    dependencies:
      '@istanbuljs/schema': 0.1.3
      glob: 7.2.3
      minimatch: 3.1.2

  text-decoder@1.2.3:
    dependencies:
      b4a: 1.6.7

  through@2.3.8: {}

  tmp@0.0.33:
    dependencies:
      os-tmpdir: 1.0.2

  tmpl@1.0.5: {}

  to-regex-range@5.0.1:
    dependencies:
      is-number: 7.0.0

  toidentifier@1.0.1: {}

  token-types@6.0.0:
    dependencies:
      '@tokenizer/token': 0.3.0
      ieee754: 1.2.1

  tr46@0.0.3: {}

  tree-kill@1.2.2: {}

  ts-api-utils@2.0.1(typescript@5.7.3):
    dependencies:
      typescript: 5.7.3

  ts-jest@29.2.5(@babel/core@7.26.8)(@jest/transform@29.7.0)(@jest/types@29.6.3)(babel-jest@29.7.0(@babel/core@7.26.8))(jest@29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3)))(typescript@5.7.3):
    dependencies:
      bs-logger: 0.2.6
      ejs: 3.1.10
      fast-json-stable-stringify: 2.1.0
      jest: 29.7.0(@types/node@20.17.17)(ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3))
      jest-util: 29.7.0
      json5: 2.2.3
      lodash.memoize: 4.1.2
      make-error: 1.3.6
      semver: 7.7.1
      typescript: 5.7.3
      yargs-parser: 21.1.1
    optionalDependencies:
      '@babel/core': 7.26.8
      '@jest/transform': 29.7.0
      '@jest/types': 29.6.3
      babel-jest: 29.7.0(@babel/core@7.26.8)

  ts-loader@9.5.2(typescript@5.7.3)(webpack@5.97.1(@swc/core@1.10.16)):
    dependencies:
      chalk: 4.1.2
      enhanced-resolve: 5.18.1
      micromatch: 4.0.8
      semver: 7.7.1
      source-map: 0.7.4
      typescript: 5.7.3
      webpack: 5.97.1(@swc/core@1.10.16)

  ts-node@10.9.2(@swc/core@1.10.16)(@types/node@20.17.17)(typescript@5.7.3):
    dependencies:
      '@cspotcode/source-map-support': 0.8.1
      '@tsconfig/node10': 1.0.11
      '@tsconfig/node12': 1.0.11
      '@tsconfig/node14': 1.0.3
      '@tsconfig/node16': 1.0.4
      '@types/node': 20.17.17
      acorn: 8.14.0
      acorn-walk: 8.3.4
      arg: 4.1.3
      create-require: 1.1.1
      diff: 4.0.2
      make-error: 1.3.6
      typescript: 5.7.3
      v8-compile-cache-lib: 3.0.1
      yn: 3.1.1
    optionalDependencies:
      '@swc/core': 1.10.16

  tsconfig-paths-webpack-plugin@4.2.0:
    dependencies:
      chalk: 4.1.2
      enhanced-resolve: 5.18.1
      tapable: 2.2.1
      tsconfig-paths: 4.2.0

  tsconfig-paths@4.2.0:
    dependencies:
      json5: 2.2.3
      minimist: 1.2.8
      strip-bom: 3.0.0

  tslib@2.8.1: {}

  type-check@0.4.0:
    dependencies:
      prelude-ls: 1.2.1

  type-detect@4.0.8: {}

  type-fest@0.21.3: {}

  type-is@1.6.18:
    dependencies:
      media-typer: 0.3.0
      mime-types: 2.1.35

  type-is@2.0.0:
    dependencies:
      content-type: 1.0.5
      media-typer: 1.1.0
      mime-types: 3.0.0

  typedarray@0.0.6: {}

  typescript-eslint@8.24.0(eslint@9.20.1)(typescript@5.7.3):
    dependencies:
      '@typescript-eslint/eslint-plugin': 8.24.0(@typescript-eslint/parser@8.24.0(eslint@9.20.1)(typescript@5.7.3))(eslint@9.20.1)(typescript@5.7.3)
      '@typescript-eslint/parser': 8.24.0(eslint@9.20.1)(typescript@5.7.3)
      '@typescript-eslint/utils': 8.24.0(eslint@9.20.1)(typescript@5.7.3)
      eslint: 9.20.1
      typescript: 5.7.3
    transitivePeerDependencies:
      - supports-color

  typescript@5.7.3: {}

  uid@2.0.2:
    dependencies:
      '@lukeed/csprng': 1.1.0

  uint8array-extras@1.4.0: {}

  unbzip2-stream@1.4.3:
    dependencies:
      buffer: 5.7.1
      through: 2.3.8

  undici-types@5.26.5: {}

  undici-types@6.19.8: {}

  undici@6.21.1: {}

  universalify@2.0.1: {}

  unpipe@1.0.0: {}

  update-browserslist-db@1.1.2(browserslist@4.24.4):
    dependencies:
      browserslist: 4.24.4
      escalade: 3.2.0
      picocolors: 1.1.1

  uri-js@4.4.1:
    dependencies:
      punycode: 2.3.1

  util-deprecate@1.0.2: {}

  utils-merge@1.0.1: {}

  uuid@10.0.0: {}

  uuid@9.0.1: {}

  v8-compile-cache-lib@3.0.1: {}

  v8-to-istanbul@9.3.0:
    dependencies:
      '@jridgewell/trace-mapping': 0.3.25
      '@types/istanbul-lib-coverage': 2.0.6
      convert-source-map: 2.0.0

  vary@1.1.2: {}

  walker@1.0.8:
    dependencies:
      makeerror: 1.0.12

  watchpack@2.4.2:
    dependencies:
      glob-to-regexp: 0.4.1
      graceful-fs: 4.2.11

  wcwidth@1.0.1:
    dependencies:
      defaults: 1.0.4

  web-streams-polyfill@3.3.3: {}

  web-streams-polyfill@4.0.0-beta.3: {}

  webidl-conversions@3.0.1: {}

  webpack-node-externals@3.0.0: {}

  webpack-sources@3.2.3: {}

  webpack@5.97.1(@swc/core@1.10.16):
    dependencies:
      '@types/eslint-scope': 3.7.7
      '@types/estree': 1.0.6
      '@webassemblyjs/ast': 1.14.1
      '@webassemblyjs/wasm-edit': 1.14.1
      '@webassemblyjs/wasm-parser': 1.14.1
      acorn: 8.14.0
      browserslist: 4.24.4
      chrome-trace-event: 1.0.4
      enhanced-resolve: 5.18.1
      es-module-lexer: 1.6.0
      eslint-scope: 5.1.1
      events: 3.3.0
      glob-to-regexp: 0.4.1
      graceful-fs: 4.2.11
      json-parse-even-better-errors: 2.3.1
      loader-runner: 4.3.0
      mime-types: 2.1.35
      neo-async: 2.6.2
      schema-utils: 3.3.0
      tapable: 2.2.1
      terser-webpack-plugin: 5.3.11(@swc/core@1.10.16)(webpack@5.97.1(@swc/core@1.10.16))
      watchpack: 2.4.2
      webpack-sources: 3.2.3
    transitivePeerDependencies:
      - '@swc/core'
      - esbuild
      - uglify-js

  whatwg-encoding@3.1.1:
    dependencies:
      iconv-lite: 0.6.3

  whatwg-mimetype@4.0.0: {}

  whatwg-url@5.0.0:
    dependencies:
      tr46: 0.0.3
      webidl-conversions: 3.0.1

  which@2.0.2:
    dependencies:
      isexe: 2.0.0

  word-wrap@1.2.5: {}

  wrap-ansi@6.2.0:
    dependencies:
      ansi-styles: 4.3.0
      string-width: 4.2.3
      strip-ansi: 6.0.1

  wrap-ansi@7.0.0:
    dependencies:
      ansi-styles: 4.3.0
      string-width: 4.2.3
      strip-ansi: 6.0.1

  wrap-ansi@8.1.0:
    dependencies:
      ansi-styles: 6.2.1
      string-width: 5.1.2
      strip-ansi: 7.1.0

  wrappy@1.0.2: {}

  write-file-atomic@4.0.2:
    dependencies:
      imurmurhash: 0.1.4
      signal-exit: 3.0.7

  ws@8.17.1: {}

  xtend@4.0.2: {}

  y18n@5.0.8: {}

  yallist@3.1.1: {}

  yargs-parser@21.1.1: {}

  yargs@17.7.2:
    dependencies:
      cliui: 8.0.1
      escalade: 3.2.0
      get-caller-file: 2.0.5
      require-directory: 2.1.1
      string-width: 4.2.3
      y18n: 5.0.8
      yargs-parser: 21.1.1

  yauzl@3.2.0:
    dependencies:
      buffer-crc32: 0.2.13
      pend: 1.2.0

  yn@3.1.1: {}

  yocto-queue@0.1.0: {}

  yoctocolors-cjs@2.1.2: {}

  zod-to-json-schema@3.24.1(zod@3.24.2):
    dependencies:
      zod: 3.24.2

  zod@3.24.2: {}
-e 
```
-e 

# src/microservices/src/.env.example
```
# Environment
NODE_ENV=development

# API Keys
SPIDER_API_KEY=your_spider_api_key
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
VALUESERP_API_KEY=your_valueserp_api_key

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sagelytics

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
REDIS_USERNAME=your_redis_username
REDIS_DB=0
REDIS_TLS=false

# Microservice
MICROSERVICE_HOST=localhost
MICROSERVICE_PORT=3001 -e 
```
-e 

# src/microservices/src/app.controller.spec.ts
```
import { Test, type TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
-e 
```
-e 

# src/microservices/src/app.controller.ts
```
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
-e 
```
-e 

# src/microservices/src/app.module.ts
```
import { Module } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { SharedModule } from '@shared/shared.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompetitorModule } from './competitor/competitor.module';
import { WebsiteModule } from './website/website.module';
import { validateEnv } from './env';
import { SmartCrawlerService } from './website/services/smart-crawler.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
    }),
    ClientsModule.registerAsync([
      {
        name: 'WEBSITE_SERVICE',
        useFactory: (configService: ConfigService) => {
          const redisUrl = configService.getOrThrow<string>('REDIS_URL');
          const url = new URL(redisUrl);
          return {
            transport: Transport.REDIS,
            options: {
              host: url.hostname,
              port: Number(url.port),
              retryAttempts: 5,
              retryDelay: 3000,
            },
          };
        },
        inject: [ConfigService],
      },
      {
        name: 'COMPETITOR_SERVICE',
        useFactory: (configService: ConfigService) => {
          const redisUrl = configService.getOrThrow<string>('REDIS_URL');
          const url = new URL(redisUrl);
          return {
            transport: Transport.REDIS,
            options: {
              host: url.hostname,
              port: Number(url.port),
              retryAttempts: 5,
              retryDelay: 3000,
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
    SharedModule,
    CompetitorModule,
    WebsiteModule,
  ],
  controllers: [AppController],
  providers: [AppService, SmartCrawlerService, ModelManagerService],
})
export class AppModule {}

const modelManager = new ModelManagerService(new ConfigService());
void modelManager.getLLM('test');
-e 
```
-e 

# src/microservices/src/app.service.ts
```
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
-e 
```
-e 

# src/microservices/src/competitor/competitor.controller.ts
```
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CompetitorService } from './competitor.service';
import type { DiscoveryResult } from './interfaces/discovery-result.interface';
import type { BusinessContext } from './interfaces/business-context.interface';

@Controller()
export class CompetitorController {
  constructor(private readonly competitorService: CompetitorService) {}

  @MessagePattern('discover_competitors')
  async discoverCompetitors(data: {
    domain: string;
    userId: string;
    businessType: string;
    knownCompetitors?: string[];
    productCatalogUrl: string;
  }): Promise<DiscoveryResult> {
    return this.competitorService.discoverCompetitors(
      data.domain,
      data.userId,
      data.businessType,
      data.knownCompetitors,
      data.productCatalogUrl,
    );
  }

  @MessagePattern('analyze_competitor')
  async analyzeCompetitor(data: {
    competitorDomain: string;
    businessContext: BusinessContext;
    serpMetadata?: {
      title?: string;
      snippet?: string;
      rating?: number;
      reviewCount?: number;
      priceRange?: {
        min: number;
        max: number;
        currency: string;
      };
    };
  }) {
    return this.competitorService.analyzeCompetitor(
      data.competitorDomain,
      data.businessContext,
      data.serpMetadata,
    );
  }
}
-e 
```
-e 

# src/microservices/src/competitor/competitor.module.ts
```
import { Module } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { CompetitorController } from './competitor.controller';
import { CompetitorService } from './competitor.service';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import { AgentToolsService } from './services/agent-tools.service';
import { WebsiteModule } from '../website/website.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [WebsiteModule, ConfigModule],
  controllers: [CompetitorController],
  providers: [
    CompetitorService,
    ModelManagerService,
    AgentToolsService,
    IntelligentAgentService,
    {
      provide: 'AGENT_TOOLS',
      useFactory: (agentToolsService: AgentToolsService) => ({
        analysis: agentToolsService.analysis,
        navigation: agentToolsService.navigation,
        web: agentToolsService.web,
        search: agentToolsService.search,
      }),
      inject: [AgentToolsService],
    },
  ],
})
export class CompetitorModule {}
-e 
```
-e 

# src/microservices/src/competitor/competitor.service.ts
```
import { Injectable } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { IntelligentAgentService } from './services/intelligent-agent.service';
import type { DiscoveryResult } from './interfaces/discovery-result.interface';
import type { CompetitorInsight } from './interfaces/competitor-insight.interface';
import { ConfigService } from '@nestjs/config';
import type { BusinessContext } from './interfaces/business-context.interface';
import { NestFactory } from '@nestjs/core';
import { CompetitorModule } from './competitor.module';
import { WebsiteDiscoveryService } from '../website/services/website-discovery.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class CompetitorService {
  private readonly logger = new Logger(CompetitorService.name);

  constructor(
    private readonly agent: IntelligentAgentService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
  ) {}

  static getOptions(configService: ConfigService): MicroserviceOptions {
    const redisUrl = configService.getOrThrow<string>('REDIS_URL');
    const url = new URL(redisUrl);
    return {
      transport: Transport.REDIS,
      options: {
        host: url.hostname,
        port: Number(url.port),
        retryAttempts: 5,
        retryDelay: 3000,
      },
    };
  }

  async discoverCompetitors(
    domain: string,
    userId: string,
    businessType: string,
    knownCompetitors: string[] = [],
    productCatalogUrl: string,
  ): Promise<DiscoveryResult> {
    this.logger.log(`Starting competitor discovery for ${domain}`);
    this.logger.debug({
      domain,
      userId,
      businessType,
      knownCompetitorsCount: knownCompetitors.length,
      productCatalogUrl,
    });

    try {
      // Create a business context that can be passed to the agent
      const businessContext: BusinessContext = {
        businessType,
        userProducts: [],
      };

      // Get website content first to understand user products
      const websiteContent =
        await this.websiteDiscovery.discoverWebsiteContent(domain);

      // Default empty catalog content
      const catalogContent = {
        products: [] as {
          name: string;
          url?: string;
          price?: number;
          currency?: string;
          description?: string;
          category?: string;
          lastUpdated?: string;
        }[],
      };

      // Get products from catalog if provided
      if (productCatalogUrl) {
        try {
          const catalogData =
            await this.websiteDiscovery.discoverWebsiteContent(
              productCatalogUrl,
            );
          catalogContent.products = catalogData.products;
        } catch (err) {
          this.logger.warn(
            `Failed to fetch product catalog from ${productCatalogUrl}:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }

      // Combine products from both sources
      const userProducts = [
        ...websiteContent.products,
        ...catalogContent.products,
      ].map((p) => ({
        name: p.name,
        description: p.description ?? '',
        price: p.price ?? 0,
        currency: p.currency ?? 'USD',
      }));

      // Discover competitors
      const discoveredCompetitors = await this.agent.discoverCompetitors(
        domain,
        businessType,
        userProducts,
      );

      // Combine with known competitors if provided
      let allCompetitors = [...discoveredCompetitors];

      // Add known competitors if they're not already in the list
      if (knownCompetitors.length > 0) {
        this.logger.log(
          `Processing ${knownCompetitors.length} known competitors`,
        );

        const knownDomains = new Set(
          discoveredCompetitors.map((c) => c.domain),
        );

        const additionalCompetitors = await Promise.all(
          knownCompetitors
            .filter((competitorDomain) => !knownDomains.has(competitorDomain))
            .map(async (competitorDomain) => {
              try {
                const businessContext: BusinessContext = {
                  businessType,
                  userProducts,
                };

                return await this.agent.analyzeCompetitor(
                  competitorDomain,
                  businessContext,
                );
              } catch (error) {
                this.logger.warn(
                  `Failed to analyze known competitor ${competitorDomain}:`,
                  error,
                );
                return null;
              }
            }),
        );

        // Add valid analyzed competitors to the results
        allCompetitors = [
          ...allCompetitors,
          ...additionalCompetitors.filter(
            (c): c is CompetitorInsight => c !== null,
          ),
        ];
      }

      return {
        competitors: allCompetitors,
        recommendedSources: [],
        searchStrategy: {
          searchType: 'organic',
          searchQuery: '',
          locationContext: {
            location: {
              address: '',
              country: 'United States',
              region: '',
              city: '',
              latitude: 0,
              longitude: 0,
              formattedAddress: '',
              postalCode: '',
            },
            radius: 50,
          },
          businessAttributes: {
            size: 'small',
            focus: [],
            businessCategory: businessType,
            onlinePresence: 'moderate',
            serviceType: 'product',
            uniqueFeatures: [],
            priceRange: {
              min: 0,
              max: 0,
              currency: 'USD',
            },
            targetMarket: [],
            competitiveAdvantages: [],
          },
        },
        stats: {
          totalDiscovered: allCompetitors.length,
          newCompetitors: discoveredCompetitors.length,
          existingCompetitors: knownCompetitors.length,
          failedAnalyses: 0,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to discover competitors for ${domain}:`, error);
      throw error;
    }
  }

  async analyzeCompetitor(
    competitorDomain: string,
    businessContext: BusinessContext,
    serpMetadata?: {
      title?: string;
      snippet?: string;
      rating?: number;
      reviewCount?: number;
      priceRange?: {
        min: number;
        max: number;
        currency: string;
      };
    },
  ): Promise<CompetitorInsight> {
    return this.agent.analyzeCompetitor(
      competitorDomain,
      businessContext,
      serpMetadata,
    );
  }
}

// Bootstrap the microservice if running standalone
if (require.main === module) {
  async function bootstrap(): Promise<void> {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      CompetitorModule,
      CompetitorService.getOptions(new ConfigService()),
    );
    await app.listen();
  }
  void bootstrap();
}
-e 
```
-e 

# src/microservices/src/competitor/interfaces/agent-tools.interface.ts
```
export interface AgentTools {
  search: {
    serpSearch: (
      query: string,
      type: 'shopping' | 'maps' | 'local' | 'organic',
    ) => Promise<
      {
        url: string;
        title?: string;
        snippet?: string;
        rating?: number;
        reviewCount?: number;
        priceRange?: {
          min: number;
          max: number;
          currency: string;
        };
      }[]
    >;
  };
  web: {
    fetchContent: (url: string) => Promise<string>;
    extractText: (html: string) => string;
    extractStructuredData: (html: string) => Record<string, unknown>[];
    extractPricing: (html: string) => {
      price: number;
      currency: string;
      source: string;
    }[];
    extractMetaTags: (html: string) => {
      title: string;
      description: string;
      keywords: string[];
    };
  };
  analysis: {
    compareProducts: (a: string, b: string) => Promise<number>;
    extractFeatures: (text: string) => Promise<string[]>;
    categorizeOffering: (
      text: string,
      businessContext?: {
        businessType: string;
        offeringNomenclature?: string;
      },
    ) => Promise<{
      type: string;
      category: string;
      features: string[];
      name: string;
      pricing: {
        value: number | null;
        currency: string;
        unit: string;
      };
    }>;
    detectBusinessType: (
      text: string,
      url: string,
    ) => Promise<{
      businessType: string;
      specificType: string;
      mainOfferings: string[];
      extractionStrategy: {
        keyPages: string[];
        offeringNomenclature: string;
        pricingTerms: string[];
      };
    }>;
    extractPricesForBusinessType: (
      html: string,
      businessType: string,
    ) => Promise<
      {
        value: number;
        currency: string;
        unit: string;
        context: string;
        source: string;
      }[]
    >;
  };
  navigation: {
    findRelevantPages: (baseUrl: string, html: string) => Promise<string[]>;
    checkRobotsRules: (url: string) => Promise<boolean>;
  };
}
-e 
```
-e 

# src/microservices/src/competitor/interfaces/analysis-result.interface.ts
```
export interface AnalysisResult {
  searchType: 'organic' | 'local' | 'maps' | 'shopping';
  searchQuery: string;
  locationContext: {
    location: {
      address: string;
      country: string;
      region: string;
      city: string;
      latitude: number;
      longitude: number;
      formattedAddress: string;
      postalCode: string;
    };
    radius: number;
  };
  businessAttributes: {
    size: 'small' | 'medium' | 'large';
    focus: string[];
    businessCategory: string;
    onlinePresence: 'low' | 'moderate' | 'high';
    serviceType: 'product' | 'service' | 'hybrid';
    uniqueFeatures: string[];
    priceRange: {
      min: number;
      max: number;
      currency: string;
    };
    targetMarket: string[];
    competitiveAdvantages: string[];
  };
}
-e 
```
-e 

# src/microservices/src/competitor/interfaces/business-context.interface.ts
```
import { BusinessProduct } from '../services/intelligent-agent.service';

export interface BusinessContext {
  domain: string;
  businessType?: string;
  specificType?: string;
  offeringNomenclature?: string;
  products?: BusinessProduct[];
  extractionStrategy?: {
    offeringNomenclature?: string;
    [key: string]: unknown;
  };
}
-e 
```
-e 

# src/microservices/src/competitor/interfaces/competitor-insight.interface.ts
```
export interface ProductMatch {
  name: string;
  url: string | null;
  price: number | null;
  currency: string | null;
  matchedProducts: Array<{
    name: string;
    url: string | null;
    matchScore: number;
    priceDiff: number | null;
  }>;
  lastUpdated: string;
}

export interface CompetitorInsight {
  domain: string;
  matchScore: number;
  matchReasons: string[];
  suggestedApproach: string;
  dataGaps: string[];
  listingPlatforms: Array<{
    platform: string;
    url: string;
    rating: number | null;
    reviewCount: number | null;
    priceRange?: {
      min: number;
      max: number;
      currency: string;
    };
  }>;
  products: Array<{
    name: string;
    url: string;
    price: number | null;
    currency: string;
    matchedProducts: Array<{
      name: string;
      url: string;
      matchScore: number;
      priceDiff: number | null;
    }>;
    lastUpdated: string;
  }>;
}
-e 
```
-e 

# src/microservices/src/competitor/interfaces/discovery-result.interface.ts
```
import type { CompetitorInsight } from './competitor-insight.interface';
import type { AnalysisResult } from './analysis-result.interface';

export interface DiscoveryResult {
  competitors: CompetitorInsight[];
  recommendedSources: string[];
  searchStrategy: AnalysisResult;
  stats: {
    totalDiscovered: number;
    newCompetitors: number;
    existingCompetitors: number;
    failedAnalyses: number;
  };
}
-e 
```
-e 

# src/microservices/src/competitor/interfaces/enhanced-website-content.interface.ts
```
import type { WebsiteContent } from '../../interfaces/website-content.interface';

export interface EnhancedWebsiteContent extends WebsiteContent {
  products: Array<{
    name: string;
    url?: string;
    price?: number;
    currency?: string;
    description?: string;
    category?: string;
    lastUpdated?: string;
    type?: 'physical' | 'digital';
  }>;
  services: Array<{
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    category?: string;
    type?: string;
  }>;
  metadata?: {
    structuredData?: Record<string, unknown>[];
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
      postalCode?: string;
    };
    prices?: Array<{
      price: number;
      currency: string;
      timestamp: Date;
      source: string;
    }>;
    hasPhysicalLocation?: boolean;
    hasOnlineServices?: boolean;
    hasOnlineBooking?: boolean;
    socialMedia?: string[];
    hasApp?: boolean;
    employeeCount?: number;
    locationCount?: number;
    priceRange?: string;
    qualityIndicators?: string[];
    marketPosition?: string;
    serviceRadius?: number;
    deliveryRadius?: number;
    uniqueFeatures?: string[];
    capabilities?: string[];
    targetDemographics?: string[];
    marketSegments?: string[];
    usp?: string[];
    strengths?: string[];
  };
}
-e 
```
-e 

# src/microservices/src/competitor/interfaces/valueserp-response.interface.ts
```
// Define reusable interfaces for SERP result items
export interface SerpResultItem {
  link: string;
  title?: string;
  snippet?: string;
  rich_snippet?: {
    top?: {
      detected_extensions?: {
        price?: string;
        currency?: {
          code?: string;
          symbol?: string;
        };
      };
      extensions?: string[];
    };
  };
}

export interface LocalResultItem {
  website?: string;
  title?: string;
  rating?: number;
  reviews?: number;
  snippet?: string;
}

export interface ValueserpResponse {
  organic_results?: Array<SerpResultItem>;
  shopping_results?: Array<SerpResultItem>;
  local_results?: Array<LocalResultItem>;

  search_parameters?: {
    q: string;
    [key: string]: unknown;
  };

  search_information?: {
    total_results: number;
    [key: string]: unknown;
  };

  knowledge_graph?: {
    title: string;
    website?: string;
    [key: string]: unknown;
  };

  related_questions?: Array<{
    question: string;
    source?: {
      link?: string;
      title?: string;
    };
    answer?: string;
    [key: string]: unknown;
  }>;

  [key: string]: unknown;
}
-e 
```
-e 

# src/microservices/src/competitor/services/agent-tools.service.ts
```
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import { ModelManagerService } from '@shared/services/model-manager.service';
import type { AgentTools } from '../interfaces/agent-tools.interface';
import type { Env } from '../../env';
import { JsonUtils } from '@shared/utils';
import type {
  ValueserpResponse,
  SerpResultItem,
  LocalResultItem,
} from '../interfaces/valueserp-response.interface';

@Injectable()
export class AgentToolsService implements AgentTools {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly modelManager: ModelManagerService,
  ) {}

  search = {
    serpSearch: async (
      query: string,
      type: 'shopping' | 'maps' | 'local' | 'organic',
    ) => {
      const apiKey = this.configService.get<string>('VALUESERP_API_KEY');
      if (!apiKey) {
        throw new Error('VALUESERP_API_KEY is not configured');
      }

      // Validate query
      if (typeof query !== 'string') {
        throw new Error(`Query must be a string, received ${typeof query}`);
      }

      const baseParams = new URLSearchParams({
        api_key: apiKey,
        google_domain: 'google.com',
        gl: 'us',
        hl: 'en',
        q: query,
      });

      // Add type-specific parameters
      switch (type) {
        case 'maps':
        case 'local':
          baseParams.append('tbm', 'lcl');
          baseParams.append('num', '20');
          break;
        case 'shopping':
          baseParams.append('tbm', 'shop');
          baseParams.append('num', '15');
          break;
        case 'organic':
          baseParams.append('num', '20');
          break;
      }

      const url = new URL('/search', 'https://api.valueserp.com');
      url.search = baseParams.toString();

      try {
        console.log('Making ValueSERP request to:', url.toString());
        const response = await fetch(url.toString(), {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Sagelytics/1.0',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`ValueSERP API Error [${response.status}]:`, errorText);
          if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid ValueSERP API key or unauthorized access');
          } else if (response.status === 429) {
            throw new Error('ValueSERP API rate limit exceeded');
          } else {
            throw new Error(`ValueSERP API error: ${response.status}`);
          }
        }

        const data = (await response.json()) as ValueserpResponse;
        return this.extractUrlsFromResponse(data, type);
      } catch (error) {
        console.error('ValueSERP API request failed:', error);
        throw error;
      }
    },
  };

  web = {
    fetchContent: async (url: string) => {
      // Ensure URL has a protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      try {
        // Validate URL format
        new URL(url);

        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        });
        if (!response.ok)
          throw new Error(`Failed to fetch ${url}: ${response.status}`);
        return response.text();
      } catch (error) {
        // If HTTPS fails, try HTTP
        if (url.startsWith('https://')) {
          const httpUrl = url.replace('https://', 'http://');
          const response = await fetch(httpUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
          });
          if (!response.ok)
            throw new Error(`Failed to fetch ${httpUrl}: ${response.status}`);
          return response.text();
        }
        throw error;
      }
    },

    extractText: (html: string) => {
      const $ = cheerio.load(html);
      $('script, style, noscript, iframe').remove();
      return $('body')
        .text()
        .replace(/[\n\r\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    extractStructuredData: (html: string) => {
      const $ = cheerio.load(html);
      const data: Array<Record<string, unknown>> = [];

      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const content = $(el).html();
          if (!content) return;
          const parsed = JSON.parse(content) as
            | Record<string, unknown>
            | Record<string, unknown>[];
          if (Array.isArray(parsed)) data.push(...parsed);
          else data.push(parsed);
        } catch (error) {
          console.warn('Failed to parse JSON-LD:', error);
        }
      });

      return data;
    },

    extractPricing: (html: string) => {
      const $ = cheerio.load(html);
      const prices: { price: number; currency: string; source: string }[] = [];

      const priceSelectors = [
        '[itemprop="price"]',
        '.price',
        '[data-price]',
        '[class*="price"]',
        '[id*="price"]',
        'span:contains("$"), span:contains("â‚¬"), span:contains("Â£")',
        'div:contains("USD"), div:contains("EUR"), div:contains("GBP")',
      ];

      const priceRegex =
        /(?<!\S)(?<currency>[$â‚¬Â£]|USD|EUR|GBP)?\s*([\d,.]*?\d+[\d,.]*)(?:\s*(?<currencySuffix>[$â‚¬Â£]|USD|EUR|GBP))?(?!\S)/;

      priceSelectors.forEach((selector) => {
        $(selector).each((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();

          if (
            $el.closest('nav, footer, header, script, style').length > 0 ||
            $el.css('display') === 'none' ||
            $el.css('visibility') === 'hidden' ||
            text.includes('@')
          )
            return;

          const match = priceRegex.exec(text);
          if (match?.groups) {
            const numericValue = match[2].replace(/[,]/g, '');
            const price = parseFloat(numericValue);
            const currency = (
              match.groups.currency ||
              match.groups.currencySuffix ||
              '$'
            )
              .replace('USD', '$')
              .replace('EUR', 'â‚¬')
              .replace('GBP', 'Â£');

            if (!isNaN(price) && price > 0 && price < 1000000) {
              prices.push({
                price: Number(price.toFixed(2)),
                currency,
                source: $el.closest('[id]').attr('id') ?? selector,
              });
            }
          }
        });
      });

      return prices;
    },

    extractMetaTags: (html: string) => {
      const $ = cheerio.load(html);

      return {
        title:
          $('title').text() ??
          $('meta[property="og:title"]').attr('content') ??
          $('meta[name="twitter:title"]').attr('content') ??
          '',
        description:
          $('meta[name="description"]').attr('content') ??
          $('meta[property="og:description"]').attr('content') ??
          $('meta[name="twitter:description"]').attr('content') ??
          '',
        keywords: ($('meta[name="keywords"]').attr('content') ?? '')
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      };
    },
  };

  analysis = {
    compareProducts: async (a: string, b: string) => {
      const prompt = `Compare these two product descriptions and return a similarity score between 0-100:
      Product A: ${a}
      Product B: ${b}
      Return ONLY a number between 0 and 100.`;

      const result = await this.modelManager.withBatchProcessing(
        async (llm) => llm.invoke(prompt),
        prompt,
      );

      const resultText = JsonUtils.safeStringify(result.content);
      const score = parseInt(resultText.trim());
      return isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
    },

    detectBusinessType: async (text: string, url: string) => {
      const prompt = `Analyze this website content and URL to determine the business type.
      
      URL: ${url}
      Content: ${text.substring(0, 1500)}...
      
      Classify the business into one of these categories:
      - ecommerce: Online store selling physical products
      - software: SaaS, applications, or digital products
      - hospitality: Hotels, accommodations, or lodging
      - restaurant: Food service business
      - professional_service: Consulting, legal, financial services
      - healthcare: Medical services or products
      - education: Educational institutions or services
      - marketplace: Platform connecting buyers and sellers
      - media: Content, news, or entertainment
      - other: (specify)
      
      For each type, extract the most relevant offerings.
      
      Return ONLY a JSON object with:
      {
        "businessType": "one of the categories above",
        "specificType": "more specific description",
        "mainOfferings": ["offering1", "offering2"],
        "extractionStrategy": {
          "keyPages": ["about", "products", "services", "pricing", etc.],
          "offeringNomenclature": "what offerings are called (e.g., rooms, plans, products)",
          "pricingTerms": ["terms to look for when finding pricing"]
        }
      }`;

      try {
        const result = await this.modelManager.withBatchProcessing(
          async (llm) => llm.invoke(prompt),
          prompt,
        );

        const resultText = JsonUtils.safeStringify(result.content);

        try {
          const jsonStr = JsonUtils.extractJSON(resultText, 'object');
          const parsed = JSON.parse(jsonStr) as {
            businessType?: string;
            specificType?: string;
            mainOfferings?: string[];
            extractionStrategy?: {
              keyPages?: string[];
              offeringNomenclature?: string;
              pricingTerms?: string[];
            };
          };

          if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Response is not an object');
          }

          return {
            businessType:
              typeof parsed.businessType === 'string'
                ? parsed.businessType
                : 'other',
            specificType:
              typeof parsed.specificType === 'string'
                ? parsed.specificType
                : '',
            mainOfferings: Array.isArray(parsed.mainOfferings)
              ? parsed.mainOfferings
              : [],
            extractionStrategy: {
              keyPages: Array.isArray(parsed.extractionStrategy?.keyPages)
                ? parsed.extractionStrategy.keyPages
                : ['products', 'services', 'pricing'],
              offeringNomenclature:
                typeof parsed.extractionStrategy?.offeringNomenclature ===
                'string'
                  ? parsed.extractionStrategy.offeringNomenclature
                  : 'products',
              pricingTerms: Array.isArray(
                parsed.extractionStrategy?.pricingTerms,
              )
                ? parsed.extractionStrategy.pricingTerms
                : ['price', 'cost', 'rate'],
            },
          };
        } catch (parseError) {
          console.warn(
            `Failed to parse detectBusinessType response: ${parseError.message}`,
          );

          // Make a best guess based on URL and text
          const lowerText = text.toLowerCase();
          const lowerUrl = url.toLowerCase();

          if (
            lowerUrl.includes('hotel') ||
            lowerText.includes('room') ||
            lowerText.includes('accommodation') ||
            lowerText.includes('stay')
          ) {
            return {
              businessType: 'hospitality',
              specificType: 'hotel',
              mainOfferings: ['rooms', 'accommodations'],
              extractionStrategy: {
                keyPages: ['rooms', 'accommodations', 'booking', 'rates'],
                offeringNomenclature: 'rooms',
                pricingTerms: ['rate', 'per night', 'booking'],
              },
            };
          }

          return {
            businessType: 'other',
            specificType: '',
            mainOfferings: [],
            extractionStrategy: {
              keyPages: ['products', 'services', 'pricing'],
              offeringNomenclature: 'products',
              pricingTerms: ['price', 'cost', 'rate'],
            },
          };
        }
      } catch (error) {
        console.error(`Error in detectBusinessType: ${error.message}`);
        return {
          businessType: 'other',
          specificType: '',
          mainOfferings: [],
          extractionStrategy: {
            keyPages: ['products', 'services', 'pricing'],
            offeringNomenclature: 'products',
            pricingTerms: ['price', 'cost', 'rate'],
          },
        };
      }
    },

    extractFeatures: async (text: string) => {
      const prompt = `Extract key features from this text:
      ${text}
      Return ONLY a JSON array of feature strings.
      
      Example of correct format:
      ["feature1", "feature2", "feature3"]`;

      try {
        const result = await this.modelManager.withBatchProcessing(
          async (llm) => llm.invoke(prompt),
          prompt,
        );

        const resultText = JsonUtils.safeStringify(result.content);

        try {
          // Extract and parse the JSON array
          const jsonStr = JsonUtils.extractJSON(resultText, 'array');
          const parsed = JSON.parse(jsonStr) as unknown;

          // Ensure it's an array of strings
          if (!Array.isArray(parsed)) {
            return [];
          }

          return parsed.filter(
            (item): item is string => typeof item === 'string',
          );
        } catch (parseError) {
          console.warn(
            `Failed to parse extractFeatures response: ${parseError.message}`,
          );

          // Try to extract features using regex as fallback
          const featureRegex =
            /"([^"]+)"|'([^']+)'|-\s*([^,\n]+)|â€¢\s*([^,\n]+)/g;
          const content = JsonUtils.safeStringify(result.content);
          const matches = [...content.matchAll(featureRegex)];

          return matches
            .map((match) => match[1] || match[2] || match[3] || match[4])
            .filter(Boolean)
            .map((feature) => feature.trim());
        }
      } catch (error) {
        console.error(`Error in extractFeatures: ${error.message}`);
        return [];
      }
    },

    categorizeOffering: async (
      text: string,
      businessContext?: { businessType: string; offeringNomenclature?: string },
    ) => {
      const businessType = businessContext?.businessType || 'unknown';

      // Adapt the prompt based on business type
      let typeOptions = '"product" or "service"';
      let categoryPrompt = 'specific category';
      let featuresPrompt = 'general features';

      if (businessType === 'hospitality') {
        typeOptions = '"room", "package", "service"';
        categoryPrompt =
          'room type (e.g., "standard", "deluxe", "suite") or service category';
        featuresPrompt = 'amenities, features, or benefits';
      } else if (businessType === 'software') {
        typeOptions = '"subscription", "license", "service"';
        categoryPrompt = 'plan tier or product category';
        featuresPrompt = 'features, capabilities, or benefits';
      } else if (businessType === 'restaurant') {
        typeOptions = '"food", "drink", "service"';
        categoryPrompt =
          'menu category (e.g., "appetizer", "entree", "dessert")';
        featuresPrompt =
          'ingredients, preparation style, or special attributes';
      }

      const prompt = `Categorize this offering for a ${businessType} business:
      ${text}
      Return ONLY a JSON object with:
      {
        "type": ${typeOptions},
        "category": "${categoryPrompt}",
        "features": ["${featuresPrompt}"],
        "name": "specific name of the offering",
        "pricing": {
          "value": number or null,
          "currency": "USD",
          "unit": "per unit" (e.g., "per night", "per month", "one-time")
        }
      }
      
      Example of correct format for a ${businessType} business:
      ${this.getExampleForBusinessType(businessType)}`;

      try {
        const result = await this.modelManager.withBatchProcessing(
          async (llm) => llm.invoke(prompt),
          prompt,
        );

        const resultText = JsonUtils.safeStringify(result.content);

        try {
          // Extract and parse the JSON
          const jsonStr = JsonUtils.extractJSON(resultText, 'object');
          const parsed = JSON.parse(jsonStr) as {
            type?: string;
            category?: string;
            features?: string[];
            name?: string;
            pricing?: {
              value?: number | null;
              currency?: string;
              unit?: string;
            };
          };

          // Validate the structure
          if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Response is not an object');
          }

          // Ensure required fields with fallbacks
          return {
            type: this.validateOfferingType(parsed.type, businessType),
            category:
              typeof parsed.category === 'string' ? parsed.category : 'general',
            features: Array.isArray(parsed.features) ? parsed.features : [],
            name:
              typeof parsed.name === 'string'
                ? parsed.name
                : typeof parsed.category === 'string'
                  ? parsed.category
                  : 'unknown',
            pricing: {
              value:
                typeof parsed.pricing?.value === 'number'
                  ? parsed.pricing.value
                  : null,
              currency:
                typeof parsed.pricing?.currency === 'string'
                  ? parsed.pricing.currency
                  : 'USD',
              unit:
                typeof parsed.pricing?.unit === 'string'
                  ? parsed.pricing.unit
                  : this.getDefaultPricingUnit(businessType),
            },
          };
        } catch (parseError) {
          console.warn(
            `Failed to parse categorizeOffering response: ${parseError.message}`,
          );

          // Make a best guess based on keywords
          const lowerText = text.toLowerCase();
          let inferredType = 'product';
          let inferredCategory = 'general';
          let pricingUnit = 'per item';

          // Detect type and category based on business type
          if (businessType === 'hospitality') {
            if (
              lowerText.includes('room') ||
              lowerText.includes('suite') ||
              lowerText.includes('accommodation')
            ) {
              inferredType = 'room';
              pricingUnit = 'per night';

              if (lowerText.includes('deluxe')) inferredCategory = 'deluxe';
              else if (lowerText.includes('suite')) inferredCategory = 'suite';
              else if (lowerText.includes('standard'))
                inferredCategory = 'standard';
              else inferredCategory = 'room';
            } else if (
              lowerText.includes('package') ||
              lowerText.includes('deal')
            ) {
              inferredType = 'package';
              inferredCategory = 'package';
              pricingUnit = 'per package';
            } else {
              inferredType = 'service';
              inferredCategory = 'service';
              pricingUnit = 'per service';
            }
          } else if (businessType === 'software') {
            if (
              lowerText.includes('subscription') ||
              lowerText.includes('plan')
            ) {
              inferredType = 'subscription';
              pricingUnit = 'per month';
            } else {
              inferredType = 'service';
              pricingUnit = 'per service';
            }
          } else {
            inferredType = lowerText.includes('service')
              ? 'service'
              : 'product';
            pricingUnit =
              inferredType === 'service' ? 'per service' : 'per item';
          }

          // Try to extract price using regex
          const priceMatch =
            /\$(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:usd|dollars|â‚¬|euro|Â£|gbp)/i.exec(
              lowerText,
            );
          const price = priceMatch
            ? parseFloat(priceMatch[1] || priceMatch[2])
            : null;

          return {
            type: inferredType,
            category: inferredCategory,
            features: [],
            name: inferredCategory,
            pricing: {
              value: price,
              currency: 'USD',
              unit: pricingUnit,
            },
          };
        }
      } catch (error) {
        console.error(`Error in categorizeOffering: ${error.message}`);
        return {
          type: 'product',
          category: 'unknown',
          features: [],
          name: 'unknown',
          pricing: {
            value: null,
            currency: 'USD',
            unit: 'per item',
          },
        };
      }
    },

    // Helper method for detecting prices in different business contexts
    extractPricesForBusinessType: async (
      html: string,
      businessType: string,
    ) => {
      // Implement a small delay to make this truly async and satisfy the linter
      await new Promise((resolve) => setTimeout(resolve, 0));

      const $ = cheerio.load(html);
      const prices: Array<{
        value: number;
        currency: string;
        unit: string;
        context: string;
        source: string;
      }> = [];

      // Common price selectors
      let priceSelectors = [
        '[itemprop="price"]',
        '.price',
        '[data-price]',
        '[class*="price"]',
        '[id*="price"]',
        'span:contains("$"), span:contains("â‚¬"), span:contains("Â£")',
        'div:contains("USD"), div:contains("EUR"), div:contains("GBP")',
      ];

      // Add business-specific selectors
      if (businessType === 'hospitality') {
        priceSelectors = [
          ...priceSelectors,
          '[class*="rate"]',
          '[class*="tariff"]',
          '[class*="room-price"]',
          '[class*="booking"]',
          'span:contains("per night")',
          'div:contains("per night")',
          'span:contains("night")',
          'div:contains("night")',
        ];
      } else if (businessType === 'software') {
        priceSelectors = [
          ...priceSelectors,
          '[class*="plan"]',
          '[class*="subscription"]',
          '[class*="pricing"]',
          'span:contains("per month")',
          'div:contains("per month")',
          'span:contains("per user")',
          'div:contains("per user")',
        ];
      }

      // Define price regex patterns based on business type
      const priceRegexes = [
        /(?<!\S)(?<currency>[$â‚¬Â£]|USD|EUR|GBP)?\s*([\d,.]*?\d+[\d,.]*)(?:\s*(?<currencySuffix>[$â‚¬Â£]|USD|EUR|GBP))?(?!\S)/,
      ];

      if (businessType === 'hospitality') {
        priceRegexes.push(
          /(\d+[\d,.]*)\s*(?:per night|per room|\/night|\/room)/i,
          /(?:rate|price)[^\d]*?(\d+[\d,.]*)/i,
        );
      } else if (businessType === 'software') {
        priceRegexes.push(
          /(\d+[\d,.]*)\s*(?:per month|per user|\/month|\/user)/i,
          /(?:plan|subscription)[^\d]*?(\d+[\d,.]*)/i,
        );
      }

      // Process selectors
      priceSelectors.forEach((selector) => {
        $(selector).each((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();

          if (
            $el.closest('nav, footer, header, script, style').length > 0 ||
            $el.css('display') === 'none' ||
            $el.css('visibility') === 'hidden' ||
            text.includes('@')
          )
            return;

          // Try all regex patterns
          for (const regex of priceRegexes) {
            const match = text.match(regex);
            if (match) {
              let numericPrice: number;
              let currencySymbol: string;
              let pricingUnit: string;

              if (match.groups) {
                // For the main regex with named groups
                const numericValue = match[2].replace(/[,]/g, '');
                numericPrice = parseFloat(numericValue);
                currencySymbol = (
                  match.groups.currency ||
                  match.groups.currencySuffix ||
                  '$'
                )
                  .replace('USD', '$')
                  .replace('EUR', 'â‚¬')
                  .replace('GBP', 'Â£');
              } else {
                // For business-specific regexes
                numericPrice = parseFloat(match[1].replace(/[,]/g, ''));
                currencySymbol = '$';
              }

              // Determine the unit based on context
              if (businessType === 'hospitality') {
                pricingUnit = /per night|\/night/i.test(text)
                  ? 'per night'
                  : 'per stay';
              } else if (businessType === 'software') {
                if (/per month|\/month/i.test(text)) {
                  pricingUnit = 'per month';
                } else if (/per year|\/year/i.test(text)) {
                  pricingUnit = 'per year';
                } else if (/per user|\/user/i.test(text)) {
                  pricingUnit = 'per user';
                } else {
                  pricingUnit = 'one-time';
                }
              } else {
                pricingUnit = 'per item';
              }

              if (
                !isNaN(numericPrice) &&
                numericPrice > 0 &&
                numericPrice < 1000000
              ) {
                const contextElement =
                  ($el.closest('[id], [class]').prop('outerHTML') as string) ||
                  '';

                prices.push({
                  value: Number(numericPrice.toFixed(2)),
                  currency: currencySymbol,
                  unit: pricingUnit,
                  context: contextElement.substring(0, 200),
                  source: $el.closest('[id]').attr('id') ?? selector,
                });
              }
              break; // Stop after first successful match
            }
          }
        });
      });

      return prices;
    },
  };

  navigation = {
    findRelevantPages: async (baseUrl: string, html: string) => {
      const $ = cheerio.load(html);
      const links = new Set<string>();

      // Extract links from anchor tags
      $('a[href]').each((_, el) => {
        try {
          const href = $(el).attr('href');
          if (!href) return;

          const url = new URL(href, baseUrl);
          if (url.hostname === new URL(baseUrl).hostname) {
            links.add(url.toString());
          }
        } catch {
          // Ignore errors
        }
      });

      // Filter links using LLM
      if (links.size > 0) {
        try {
          const prompt = `Given these URLs from ${baseUrl}, identify which are most likely to contain valuable competitor information (products, services, pricing, etc).
          URLs: ${JSON.stringify(Array.from(links))}
          Return ONLY a JSON array of the most relevant URLs (max 10).
          
          Example of correct format:
          ["https://example.com/products", "https://example.com/pricing", "https://example.com/rooms"]`;

          const result = await this.modelManager.withBatchProcessing(
            async (llm) => llm.invoke(prompt),
            prompt,
          );

          // Use JsonUtils to extract JSON or handle cases where the response isn't proper JSON
          const responseContent = JsonUtils.safeStringify(result.content);
          try {
            // Try to find JSON array pattern in the response
            const jsonStr = /\[[\s\S]*\]/.exec(responseContent)?.[0];
            if (jsonStr) {
              const urls = JSON.parse(jsonStr) as string[];
              if (Array.isArray(urls) && urls.length > 0) {
                return urls;
              }
            }

            // If no valid JSON array found, look for URLs in the text
            const urlRegex = /(https?:\/\/[^\s"]+)/g;
            const matches = responseContent.match(urlRegex) || [];
            if (matches.length > 0) {
              return matches.filter((url) => {
                try {
                  return new URL(url).hostname === new URL(baseUrl).hostname;
                } catch {
                  return false;
                }
              });
            }
          } catch (jsonError) {
            console.warn(
              `Failed to parse LLM response for findRelevantPages: ${jsonError.message}`,
            );
          }
        } catch (error) {
          console.error(`Error in findRelevantPages: ${error.message}`);
        }
      }

      // Fallback: return all links (or a subset if there are too many)
      const allLinks = Array.from(links);
      return allLinks.length > 10 ? allLinks.slice(0, 10) : allLinks;
    },

    checkRobotsRules: async (url: string) => {
      try {
        const robotsUrl = new URL('/robots.txt', url).toString();
        const response = await fetch(robotsUrl);
        if (!response.ok) return true;

        const text = await response.text();
        const targetPath = new URL(url).pathname;

        const disallowRules = text
          .split('\n')
          .filter((line) => line.toLowerCase().startsWith('disallow:'))
          .map((line) => line.split(':')[1].trim());

        return !disallowRules.some((rule) => {
          const pattern = rule.replace('*', '.*').replace('?', '.');
          return new RegExp(`^${pattern}`).test(targetPath);
        });
      } catch {
        return true;
      }
    },
  };

  private extractUrlsFromResponse(
    data: ValueserpResponse,
    type: string,
  ): Array<{
    url: string;
    title?: string;
    snippet?: string;
    rating?: number;
    reviewCount?: number;
    priceRange?: {
      min: number;
      max: number;
      currency: string;
    };
  }> {
    // Define result type that matches the AgentTools.search.serpSearch return type
    type SearchResult = {
      url: string;
      title?: string;
      snippet?: string;
      rating?: number;
      reviewCount?: number;
      priceRange?: {
        min: number;
        max: number;
        currency: string;
      };
    };

    const results: SearchResult[] = [];

    const processResult = (result: SerpResultItem): void => {
      if (!result.link) return;

      const url = new URL(result.link).hostname;
      const metadata: Omit<SearchResult, 'url'> = {
        title: result.title,
        snippet: result.snippet,
      };

      if (result.rich_snippet?.top?.detected_extensions) {
        const ext = result.rich_snippet.top.detected_extensions;
        if (ext.price && ext.currency) {
          metadata.priceRange = {
            min: parseFloat(ext.price),
            max: parseFloat(ext.price),
            currency: ext.currency.code || ext.currency.symbol || 'USD',
          };
        }

        const extensions = result.rich_snippet.top.extensions?.[0];
        if (typeof extensions === 'string') {
          const ratingMatch = extensions.match(/(\d+\.?\d*)\((\d+)\)/);
          if (ratingMatch) {
            metadata.rating = parseFloat(ratingMatch[1]);
            metadata.reviewCount = parseInt(ratingMatch[2], 10);
          }
        }
      }

      results.push({ url, ...metadata });
    };

    switch (type) {
      case 'maps':
        (data.local_results || []).forEach((r: LocalResultItem) => {
          if (r.website) {
            results.push({
              url: new URL(r.website).hostname,
              title: r.title,
              rating: r.rating,
              reviewCount: r.reviews,
              snippet: r.snippet,
            });
          }
        });
        break;

      case 'shopping':
        (data.shopping_results || []).forEach(processResult);
        break;

      case 'local':
      case 'organic':
        (data.organic_results || []).forEach(processResult);
        break;
    }

    return results;
  }

  private getExampleForBusinessType(businessType: string): string {
    switch (businessType) {
      case 'hospitality':
        return '{"type": "room", "category": "deluxe", "features": ["ocean view", "king size bed", "free wifi"], "name": "Deluxe Ocean View", "pricing": {"value": 250, "currency": "USD", "unit": "per night"}}';
      case 'software':
        return '{"type": "subscription", "category": "premium", "features": ["unlimited users", "24/7 support", "advanced analytics"], "name": "Premium Plan", "pricing": {"value": 49.99, "currency": "USD", "unit": "per month"}}';
      case 'restaurant':
        return '{"type": "food", "category": "entree", "features": ["grass-fed beef", "gluten-free option", "locally sourced"], "name": "Angus Beef Burger", "pricing": {"value": 15.99, "currency": "USD", "unit": "per item"}}';
      default:
        return '{"type": "product", "category": "electronics", "features": ["wireless", "long battery life", "waterproof"], "name": "Wireless Headphones", "pricing": {"value": 99.99, "currency": "USD", "unit": "per item"}}';
    }
  }

  private validateOfferingType(
    type: string | undefined,
    businessType: string,
  ): string {
    if (typeof type !== 'string') {
      // Default based on business type
      switch (businessType) {
        case 'hospitality':
          return 'room';
        case 'software':
          return 'subscription';
        case 'restaurant':
          return 'food';
        default:
          return 'product';
      }
    }

    const lowercase = type.toLowerCase();

    // Validate based on business type
    switch (businessType) {
      case 'hospitality':
        return ['room', 'package', 'service'].includes(lowercase)
          ? lowercase
          : 'room';
      case 'software':
        return ['subscription', 'license', 'service'].includes(lowercase)
          ? lowercase
          : 'subscription';
      case 'restaurant':
        return ['food', 'drink', 'service'].includes(lowercase)
          ? lowercase
          : 'food';
      default:
        return ['product', 'service'].includes(lowercase)
          ? lowercase
          : 'product';
    }
  }

  private getDefaultPricingUnit(businessType: string): string {
    switch (businessType) {
      case 'hospitality':
        return 'per night';
      case 'software':
        return 'per month';
      case 'restaurant':
        return 'per item';
      default:
        return 'per item';
    }
  }
}
-e 
```
-e 

# src/microservices/src/competitor/services/competitor-analysis.service.ts
```
import { Injectable } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import type { CompetitorInsight } from '../interfaces/competitor-insight.interface';
import type { AnalysisResult } from '../interfaces/analysis-result.interface';
import type { ProductMatch } from '../interfaces/competitor-insight.interface';
import type { EnhancedWebsiteContent } from '../interfaces/enhanced-website-content.interface';
import { JsonUtils } from '@shared/utils';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import type { WebsiteContent } from '../../interfaces/website-content.interface';
import { PriceData } from '@shared/interfaces/price-data.interface';
import { ConfigService } from '@nestjs/config';
import { Env } from 'src/env';
import type {
  ValueserpResponse,
  SerpResultItem,
} from '../interfaces/valueserp-response.interface';

// Define custom type for SERP API response with price property
interface SerpResultItemWithPrice extends SerpResultItem {
  price?: string;
}

// Define a specific type for serialized response data
interface SerializedSerpData {
  rating?: number | null;
  reviewCount?: number | null;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  } | null;
}

@Injectable()
export class CompetitorAnalysisService {
  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  private parseJsonResponse<T>(
    content: string,
    type: 'object' | 'array' = 'object',
  ): T {
    try {
      const jsonStr = JsonUtils.extractJSON(content, type);
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Failed to parse structured output from LLM');
    }
  }

  async analyzeCompetitor(
    domain: string,
    strategy: AnalysisResult,
    serpData?: SerializedSerpData,
    additionalContent?: WebsiteContent,
  ): Promise<CompetitorInsight> {
    try {
      console.log(`Analyzing competitor ${domain}`);

      // Discover website content
      let content = await this.websiteDiscovery.discoverWebsiteContent(domain);

      // Merge with additional content if provided
      if (additionalContent) {
        content = {
          ...content,
          products: [...content.products, ...additionalContent.products],
          services: [...content.services, ...additionalContent.services],
          categories: [
            ...new Set([
              ...content.categories,
              ...additionalContent.categories,
            ]),
          ],
          keywords: [
            ...new Set([...content.keywords, ...additionalContent.keywords]),
          ],
          mainContent: `${content.mainContent}\n${additionalContent.mainContent}`,
        };
      }

      // Fallback: if pricing info is missing, perform a SERP search for pricing data
      if (!content.metadata?.prices || content.metadata.prices.length === 0) {
        console.log(
          `No pricing info found for ${domain}, performing SERP search for pricing data`,
        );
        const serpPricing = await this.searchForPricing(domain, [
          ...content.products,
          ...content.services,
        ]);
        // if (!serpPricing.length) {
        //   serpPricing = await this.searchForPricing(domain, 'organic');
        // }
        content.metadata = { ...content.metadata, prices: serpPricing };
      }

      // Call the new integration function to match offerings to prices
      await this.integrateOfferingPriceMatches(content);

      const prompt = `Analyze ${domain} as a potential competitor.

      Business Context:
      ${JSON.stringify(strategy, null, 2)}

      SERP Metadata:
      ${serpData ? JSON.stringify(serpData, null, 2) : 'No SERP data available'}

      Return ONLY a JSON object with this structure:
      {
        "domain": "${domain}",
        "matchScore": number between 0-100,
        "matchReasons": ["reason1", "reason2"],
        "suggestedApproach": "detailed strategy",
        "dataGaps": ["gap1", "gap2"],
        "listingPlatforms": [
          {
            "platform": "platform name",
            "url": "platform url",
            "rating": number or null,
            "reviewCount": number or null,
            "priceRange": {
              "min": number,
              "max": number,
              "currency": "USD"
            }
          }
        ],
        "products": [
          {
            "name": "Product Name",
            "url": "Product URL",
            "price": number or null,
            "currency": "USD",
            "matchedProducts": [
              {
                "name": "Matched Product Name",
                "url": "Matched Product URL",
                "matchScore": number between 0-100,
                "priceDiff": number or null
              }
            ],
            "lastUpdated": "current ISO date"
          }
        ]
      }`;

      const result = await this.modelManager.withBatchProcessing(
        async (llm) => {
          return await llm.invoke(prompt);
        },
        prompt,
      );

      const insight = this.parseJsonResponse<CompetitorInsight>(
        JsonUtils.safeStringify(result.content),
      );

      // Enhance insight with SERP metadata if available
      if (serpData) {
        if (serpData.rating || serpData.reviewCount) {
          insight.listingPlatforms.push({
            platform: 'Google',
            url: `https://www.google.com/search?q=${encodeURIComponent(domain)}`,
            rating: serpData.rating ?? null,
            reviewCount: serpData.reviewCount ?? null,
            priceRange: serpData.priceRange ?? undefined,
          });
        }
      }

      return insight;
    } catch (error) {
      console.error(`Failed to analyze competitor ${domain}:`, error);
      throw error;
    }
  }

  private async searchForPricing(
    domain: string,
    offerings?: Array<{ name: string }>,
  ): Promise<PriceData[]> {
    const queries = this.generatePricingQueries(domain, offerings);
    const results: PriceData[] = [];
    const apiKey = this.configService.get<string>('VALUESERP_API_KEY');

    for (const query of queries) {
      const params = new URLSearchParams({
        api_key: apiKey,
        q: query,
        location: 'United States',
        google_domain: 'google.com',
        gl: 'us',
        hl: 'en',
        page: '1',
      });
      const url = `https://api.valueserp.com/search?${params.toString()}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            `ValueSERP Error [${response.status}]:`,
            errorBody.slice(0, 200),
          );
          continue;
        }
        const data = (await response.json()) as ValueserpResponse;
        const priceData = this.extractPriceDataFromSerpResults(data);
        results.push(...priceData);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`Request timed out for query: "${query}"`);
        } else {
          console.error(`Failed to fetch for "${query}":`, error.message);
        }
      }
    }
    return results;
  }

  private extractPriceDataFromSerpResults(
    data: ValueserpResponse,
  ): PriceData[] {
    const results: PriceData[] = [];

    // Handle shopping results
    if (Array.isArray(data.shopping_results)) {
      for (const item of data.shopping_results) {
        // Type assertion to use the extended interface with price
        const itemWithPrice = item as SerpResultItemWithPrice;
        if (itemWithPrice.price) {
          const price = parseFloat(
            String(itemWithPrice.price).replace(/[^0-9.]/g, ''),
          );

          if (!isNaN(price)) {
            results.push({
              price,
              currency:
                /[A-Z]{3}/.exec(String(itemWithPrice.price))?.[0] ?? 'USD',
              timestamp: new Date(),
              source: item.link ?? '',
            });
          }
        }
      }
    }

    // Fallback to organic results if no shopping results
    if (results.length === 0 && Array.isArray(data.organic_results)) {
      for (const item of data.organic_results) {
        // Type assertion to use the extended interface with price
        const itemWithPrice = item as SerpResultItemWithPrice;
        const priceStr =
          itemWithPrice.price ??
          (item.snippet
            ? /\$\d+(?:\.\d{2})?/.exec(item.snippet)?.[0]
            : undefined);

        if (priceStr) {
          const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
          if (!isNaN(price)) {
            results.push({
              price,
              currency: /[A-Z]{3}/.exec(priceStr)?.[0] ?? 'USD',
              timestamp: new Date(),
              source: item.link ?? '',
            });
          }
        }
      }
    }

    // Handle empty results case
    if (results.length === 0 && data.search_information?.total_results === 0) {
      console.warn(
        'SERP API returned 0 results for query:',
        data.search_parameters?.q,
      );
    }

    return results;
  }

  private generatePricingQueries(
    domain: string,
    offerings?: Array<{ name: string }>,
  ): string[] {
    const queries = new Set<string>();
    if (offerings && offerings.length > 0) {
      offerings.forEach((offering) => {
        queries.add(`${domain} ${offering.name} price`);
        queries.add(`${offering.name} pricing`);
      });
    }
    queries.add(`${domain} pricing`);
    queries.add(`${domain} cost`);
    queries.add(`${domain} rates`);
    queries.add(`how much does ${domain} cost`);
    queries.add(`${domain} price comparison`);
    queries.add(`${domain} alternatives price`);
    queries.add(`${domain} vs * price`);
    queries.add(`${domain} monthly fee`);
    queries.add(`${domain} annual subscription`);

    return Array.from(queries);
  }

  async analyzeProductMatches(
    ourProducts: Array<{ name: string; url: string; price: number }>,
    competitorProducts: Array<{
      name: string;
      url: string;
      price: number | null;
    }>,
  ): Promise<ProductMatch[]> {
    const prompt = `Compare these products and find matches:
    Our Products: ${JSON.stringify(ourProducts, null, 2)}
    Competitor Products: ${JSON.stringify(competitorProducts, null, 2)}
    
    Return ONLY a JSON array of product matches with these fields:
    [
      {
        "name": "Product Name",
        "url": "Product URL",
        "price": number or null,
        "currency": "USD",
        "matchedProducts": [
          {
            "name": "Matched Product Name",
            "url": "Matched Product URL",
            "matchScore": number between 0-100,
            "priceDiff": number or null
          }
        ],
        "lastUpdated": "current ISO date"
      }
    ]`;

    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);

    return this.parseJsonResponse<ProductMatch[]>(
      JsonUtils.safeStringify(result.content),
      'array',
    );
  }

  private mapBusinessTypeToSearchType(
    businessType: string,
    searchType: string,
  ): 'maps' | 'shopping' | 'local' | 'organic' {
    // First check if the provided searchType is already valid
    if (['maps', 'shopping', 'local', 'organic'].includes(searchType)) {
      return searchType as 'maps' | 'shopping' | 'local' | 'organic';
    }

    // Map common business types to search types
    const businessTypeMap: Record<
      string,
      'maps' | 'shopping' | 'local' | 'organic'
    > = {
      hotel: 'maps',
      lodge: 'maps',
      resort: 'maps',
      accommodation: 'maps',
      restaurant: 'maps',
      cafe: 'maps',
      store: 'shopping',
      shop: 'shopping',
      retail: 'shopping',
      ecommerce: 'shopping',
      service: 'local',
      local: 'local',
      business: 'local',
      online: 'organic',
      digital: 'organic',
      saas: 'organic',
    };

    // Try to match business type
    const lowerType = businessType.toLowerCase();
    for (const [key, value] of Object.entries(businessTypeMap)) {
      if (lowerType.includes(key)) {
        return value;
      }
    }

    // Try to match search type
    const lowerSearchType = searchType.toLowerCase();
    for (const [key, value] of Object.entries(businessTypeMap)) {
      if (lowerSearchType.includes(key)) {
        return value;
      }
    }

    // Default to local if no match found
    return 'local';
  }

  private analyzeBusinessSignals(websiteContent: EnhancedWebsiteContent): {
    hasPhysicalLocation: boolean;
    hasEcommerce: boolean;
    hasServices: boolean;
    hasBooking: boolean;
    locationScore: number;
    ecommerceScore: number;
    serviceScore: number;
  } {
    const signals = {
      hasPhysicalLocation: false,
      hasEcommerce: false,
      hasServices: false,
      hasBooking: false,
      locationScore: 0,
      ecommerceScore: 0,
      serviceScore: 0,
    };

    // Check metadata and structured data
    if (websiteContent.metadata?.contactInfo?.address) {
      signals.hasPhysicalLocation = true;
      signals.locationScore += 30;
    }

    // Analyze products
    if (
      Array.isArray(websiteContent.products) &&
      websiteContent.products.length > 0
    ) {
      signals.hasEcommerce = true;
      signals.ecommerceScore += Math.min(
        websiteContent.products.length * 10,
        40,
      );

      // Check for physical products vs digital
      const digitalKeywords = [
        'download',
        'digital',
        'software',
        'subscription',
        'license',
      ];
      const physicalKeywords = [
        'shipping',
        'delivery',
        'weight',
        'size',
        'dimensions',
      ];

      let digitalCount = 0;
      let physicalCount = 0;

      websiteContent.products.forEach((product) => {
        const description = (
          (product.description as string) || ''
        ).toLowerCase();
        if (digitalKeywords.some((kw) => description.includes(kw))) {
          digitalCount++;
        }
        if (physicalKeywords.some((kw) => description.includes(kw))) {
          physicalCount++;
        }
      });

      if (digitalCount > physicalCount) {
        signals.ecommerceScore += 20;
      }
    }

    // Analyze services
    if (
      Array.isArray(websiteContent.services) &&
      websiteContent.services.length > 0
    ) {
      signals.hasServices = true;
      signals.serviceScore += Math.min(websiteContent.services.length * 10, 40);

      // Check for booking/reservation related services
      const bookingKeywords = [
        'booking',
        'reservation',
        'appointment',
        'schedule',
        'book now',
      ];
      websiteContent.services.forEach((service) => {
        const description = (
          (service.description as string) || ''
        ).toLowerCase();
        if (bookingKeywords.some((kw) => description.includes(kw))) {
          signals.hasBooking = true;
          signals.serviceScore += 10;
        }
      });
    }

    // Analyze prices
    if (
      Array.isArray(websiteContent.metadata?.prices) &&
      websiteContent.metadata.prices.length > 0
    ) {
      if (websiteContent.metadata.prices.some((p) => p.price > 1000)) {
        signals.serviceScore += 10; // High prices often indicate services
      }
    }

    // Check for location indicators in content
    const locationKeywords = [
      'visit us',
      'our location',
      'directions',
      'find us',
      'our address',
    ];
    const content = websiteContent.description?.toLowerCase() || '';
    if (locationKeywords.some((kw) => content.includes(kw))) {
      signals.locationScore += 20;
    }

    return signals;
  }

  private intelligentlyClassifyBusiness(
    websiteContent: EnhancedWebsiteContent,
    businessType: string,
  ): 'maps' | 'shopping' | 'local' | 'organic' {
    // First try explicit mapping
    const explicitType = this.mapBusinessTypeToSearchType(businessType, '');
    if (explicitType !== 'local') {
      return explicitType;
    }

    // Analyze business signals
    const signals = this.analyzeBusinessSignals(websiteContent);

    // Decision matrix
    if (signals.hasPhysicalLocation && signals.locationScore > 40) {
      if (signals.hasBooking || businessType.toLowerCase().includes('hotel')) {
        return 'maps';
      }
    }

    if (signals.hasEcommerce && signals.ecommerceScore > signals.serviceScore) {
      return 'shopping';
    }

    if (
      signals.hasPhysicalLocation &&
      signals.serviceScore > signals.ecommerceScore
    ) {
      return 'local';
    }

    if (!signals.hasPhysicalLocation && signals.serviceScore > 30) {
      return 'organic';
    }

    // Default based on strongest signal
    const scores = {
      maps: signals.locationScore + (signals.hasBooking ? 30 : 0),
      shopping: signals.ecommerceScore,
      local: signals.locationScore + signals.serviceScore,
      organic: signals.serviceScore + (signals.hasPhysicalLocation ? -20 : 20),
    };

    const bestMatch = Object.entries(scores).sort(
      ([, a], [, b]) => b - a,
    )[0][0] as 'maps' | 'shopping' | 'local' | 'organic';

    console.log('Business classification scores:', scores);
    return bestMatch;
  }

  async determineSearchStrategy(
    domain: string,
    businessType: string,
    websiteContent: EnhancedWebsiteContent,
  ): Promise<AnalysisResult> {
    const prompt = `Analyze ${domain} as a ${businessType} business to find direct competitors.
    Website Content:
    ${JSON.stringify(websiteContent, null, 2)}
    
    Return ONLY a JSON object with EXACTLY this structure, no additional nesting:
    {
      "searchType": "maps" | "shopping" | "local" | "organic",
      "searchQuery": "optimized search query",
      "locationContext": {
        "location": {
          "address": "full address",
          "country": "country name",
          "region": "region/state",
          "city": "city name"
        },
        "radius": number
      },
      "businessAttributes": {
        "size": "small" | "medium" | "large",
        "focus": ["focus1", "focus2"],
        "businessCategory": "category",
        "priceRange": {
          "min": number,
          "max": number,
          "currency": "USD"
        },
        "targetMarket": ["market1", "market2"],
        "competitiveAdvantages": ["advantage1", "advantage2"]
      }
    }

    Guidelines for Competitor Search:
    1. For hotels, accommodations, and hospitality businesses:
      - Use searchType: "maps"
      - Include full location details
      - Set radius based on destination type (25 for local, 100 for tourist areas)
      - Query format: "best hotels near [location] similar to [business features]"
    
    2. For e-commerce and retail:
      - Use searchType: "shopping"
      - Focus on specific product categories and price ranges
      - Query format: "top [product category] stores like [domain]"
      - Include brand positioning terms
    
    3. For local services:
      - Use searchType: "local"
      - Include service area radius
      - Query format: "[business category] companies similar to [domain] near [location]"
      - Consider service specializations
    
    4. For online/digital services:
      - Use searchType: "organic"
      - Focus on market positioning and feature set
      - Query format: "best alternatives to [domain] for [main service]"
      - Include industry-specific terms

    The searchType MUST be one of: "maps", "shopping", "local", "organic"
    Generate a search query that will effectively find similar businesses in terms of:
    - Service/product offering
    - Price point and quality level
    - Target market segment
    - Geographic reach
    - Business model`;

    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);

    let strategy = this.parseJsonResponse<AnalysisResult>(
      JsonUtils.safeStringify(result.content),
    );

    if ('analysisResult' in strategy) {
      console.warn('Received nested response, extracting inner object');
      const typedStrategy = strategy as { analysisResult: AnalysisResult };
      strategy = typedStrategy.analysisResult;
    }

    // Generate multiple search queries
    const searchQueries = this.enhanceCompetitorSearchQuery(
      strategy.searchQuery,
      websiteContent,
    );
    strategy.searchQuery = searchQueries[0]; // Keep original interface compatibility

    // Ensure required fields exist with competitor-focused defaults
    if (!strategy.locationContext) {
      strategy.locationContext = {
        location: {
          address: websiteContent.metadata?.contactInfo?.address ?? '',
          country:
            websiteContent.metadata?.contactInfo?.country ?? 'United States',
          region: websiteContent.metadata?.contactInfo?.region ?? '',
          city: websiteContent.metadata?.contactInfo?.city ?? '',
          latitude: websiteContent.metadata?.contactInfo?.latitude ?? 0,
          longitude: websiteContent.metadata?.contactInfo?.longitude ?? 0,
          formattedAddress:
            websiteContent.metadata?.contactInfo?.formattedAddress ?? '',
          postalCode: websiteContent.metadata?.contactInfo?.postalCode ?? '',
        },
        radius: this.determineSearchRadius(
          strategy.searchType,
          businessType,
          websiteContent,
        ),
      };
    }

    if (!strategy.businessAttributes) {
      strategy.businessAttributes = {
        size: this.determineBusinessSize(websiteContent),
        focus: this.extractBusinessFocus(websiteContent),
        businessCategory: businessType,
        onlinePresence: this.determineOnlinePresence(websiteContent),
        serviceType: this.determineServiceType(websiteContent),
        uniqueFeatures: this.extractUniqueFeatures(websiteContent),
        priceRange: this.extractPriceRange(websiteContent),
        targetMarket: this.extractTargetMarket(websiteContent),
        competitiveAdvantages:
          this.extractCompetitiveAdvantages(websiteContent),
      };
    }

    return strategy;
  }

  private enhanceCompetitorSearchQuery(
    baseQuery: string,
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const queries: string[] = [];

    // Base competitor query
    queries.push(baseQuery);

    // Product/service focused query
    if (websiteContent.categories?.length > 0) {
      queries.push(
        `top ${websiteContent.categories[0]} companies like ${websiteContent.url}`,
      );
    }

    // Price range focused query
    if (websiteContent.metadata?.priceRange) {
      queries.push(`${websiteContent.metadata.priceRange} ${baseQuery}`);
    }

    // Location focused query
    if (websiteContent.metadata?.contactInfo?.city) {
      const location = [
        websiteContent.metadata.contactInfo.city,
        websiteContent.metadata.contactInfo.region,
        websiteContent.metadata.contactInfo.country,
      ]
        .filter(Boolean)
        .join(', ');
      queries.push(`${baseQuery} in ${location}`);
    }

    // Market position focused query
    if (websiteContent.metadata?.marketPosition) {
      queries.push(
        `${websiteContent.metadata.marketPosition} alternatives to ${websiteContent.url}`,
      );
    }

    // Feature focused query
    if (websiteContent.metadata?.uniqueFeatures?.length) {
      const features = websiteContent.metadata.uniqueFeatures
        .slice(0, 2)
        .join(' ');
      queries.push(`companies with ${features} like ${websiteContent.url}`);
    }

    return queries.filter((q, i, arr) => arr.indexOf(q) === i); // Remove duplicates
  }

  private determineSearchRadius(
    searchType: string,
    businessType: string,
    websiteContent: EnhancedWebsiteContent,
  ): number {
    switch (searchType) {
      case 'maps':
        return businessType.toLowerCase().includes('hotel') ? 25 : 50;
      case 'local':
        return websiteContent.metadata?.serviceRadius ?? 50;
      case 'shopping':
        return websiteContent.metadata?.deliveryRadius ?? 100;
      default:
        return 50;
    }
  }

  private determineBusinessSize(
    websiteContent: EnhancedWebsiteContent,
  ): 'small' | 'medium' | 'large' {
    const indicators = {
      employees: websiteContent.metadata?.employeeCount ?? 0,
      products: websiteContent.products?.length ?? 0,
      services: websiteContent.services?.length ?? 0,
      locations: websiteContent.metadata?.locationCount ?? 1,
    };

    if (
      indicators.employees > 200 ||
      indicators.products > 1000 ||
      indicators.locations > 10
    ) {
      return 'large';
    } else if (
      indicators.employees > 50 ||
      indicators.products > 100 ||
      indicators.locations > 3
    ) {
      return 'medium';
    }
    return 'small';
  }

  private extractBusinessFocus(
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const focus = new Set<string>();

    // Add main categories
    if (websiteContent.categories?.length > 0) {
      websiteContent.categories
        .slice(0, 3)
        .forEach((category) => focus.add(category));
    }

    // Add service types
    if (websiteContent.services?.length > 0) {
      websiteContent.services
        .slice(0, 3)
        .forEach((service) =>
          focus.add(service.category ?? service.type ?? ''),
        );
    }

    return Array.from(focus);
  }

  private determineOnlinePresence(
    websiteContent: EnhancedWebsiteContent,
  ): 'low' | 'moderate' | 'high' {
    const indicators = {
      hasEcommerce: websiteContent.products?.length > 0,
      hasOnlineBooking: websiteContent.metadata?.hasOnlineBooking ?? false,
      socialMediaCount: websiteContent.metadata?.socialMedia?.length ?? 0,
      hasApp: websiteContent.metadata?.hasApp ?? false,
    };

    if (
      indicators.hasEcommerce &&
      indicators.hasApp &&
      indicators.socialMediaCount > 3
    ) {
      return 'high';
    } else if (
      indicators.hasEcommerce ||
      indicators.hasOnlineBooking ||
      indicators.socialMediaCount > 1
    ) {
      return 'moderate';
    }
    return 'low';
  }

  private determineServiceType(
    websiteContent: EnhancedWebsiteContent,
  ): 'service' | 'product' | 'hybrid' {
    const hasPhysicalIndicators =
      websiteContent.metadata?.hasPhysicalLocation ||
      websiteContent.metadata?.contactInfo?.address;
    const hasDigitalIndicators =
      websiteContent.metadata?.hasOnlineServices ||
      websiteContent.products?.some((p) => p.type === 'digital');

    if (hasPhysicalIndicators && hasDigitalIndicators) return 'hybrid';
    if (hasDigitalIndicators) return 'product';
    return 'service';
  }

  private extractUniqueFeatures(
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const features = new Set<string>();

    // Add unique service features
    if (websiteContent.metadata?.uniqueFeatures) {
      websiteContent.metadata.uniqueFeatures.forEach((feature) =>
        features.add(feature),
      );
    }

    // Add special capabilities
    if (websiteContent.metadata?.capabilities) {
      websiteContent.metadata.capabilities.forEach((capability) =>
        features.add(capability),
      );
    }

    return Array.from(features);
  }

  private extractPriceRange(websiteContent: EnhancedWebsiteContent): {
    min: number;
    max: number;
    currency: string;
  } {
    const prices =
      websiteContent.products
        ?.map((p) => p.price)
        .filter((p): p is number => p !== undefined) ?? [];

    return {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
      currency: websiteContent.metadata?.prices?.[0]?.currency ?? 'USD',
    };
  }

  private extractTargetMarket(
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const markets = new Set<string>();

    // Add target demographics
    if (websiteContent.metadata?.targetDemographics) {
      websiteContent.metadata.targetDemographics.forEach((demographic) =>
        markets.add(demographic),
      );
    }

    // Add market segments
    if (websiteContent.metadata?.marketSegments) {
      websiteContent.metadata.marketSegments.forEach((segment) =>
        markets.add(segment),
      );
    }

    return Array.from(markets);
  }

  private extractCompetitiveAdvantages(
    websiteContent: EnhancedWebsiteContent,
  ): string[] {
    const advantages = new Set<string>();

    // Add unique selling propositions
    if (websiteContent.metadata?.usp) {
      websiteContent.metadata.usp.forEach((proposition) =>
        advantages.add(proposition),
      );
    }

    // Add competitive strengths
    if (websiteContent.metadata?.strengths) {
      websiteContent.metadata.strengths.forEach((strength) =>
        advantages.add(strength),
      );
    }

    return Array.from(advantages);
  }

  async suggestDataSources(strategy: AnalysisResult): Promise<string[]> {
    const prompt = `Based on search strategy:
    ${JSON.stringify(strategy, null, 2)}
    
    Return ONLY a JSON array of recommended data source URLs that would be valuable for competitor analysis.
    Example: ["yelp.com", "tripadvisor.com"]`;

    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);

    return this.parseJsonResponse<string[]>(
      JsonUtils.safeStringify(result.content),
      'array',
    );
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 100;

    const costs: number[] = Array.from({ length: shorter.length + 1 }, () => 0);

    for (let i = 0; i <= longer.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= shorter.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          const prevCost = costs[j - 1] ?? 0;
          const currentCost = costs[j] ?? 0;
          let newValue = prevCost;
          if (longer[i - 1] !== shorter[j - 1]) {
            newValue = Math.min(prevCost, lastValue, currentCost) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[shorter.length] = lastValue;
      }
    }

    const finalCost = costs[shorter.length] ?? 0;
    return Math.round(100 * (1 - finalCost / longer.length));
  }

  private getDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      console.warn('Failed to parse URL:', url);
      return url.replace(/^www\./, '');
    }
  }

  // LLM-based matching using product and service offerings
  async matchPricesToOfferings(
    offerings: Array<{ name: string; description?: string; url?: string }>,
    prices: PriceData[],
  ): Promise<{ offering: string; matchedPrice: PriceData }[]> {
    const prompt = `Given the following product and service offerings and competitor pricing data, match each offering to the most relevant price entry.
Offerings: ${JSON.stringify(offerings, null, 2)}
Pricing Data: ${JSON.stringify(prices, null, 2)}
Return a JSON array with objects of the form:
{
  "offering": "Offering Name",
  "matchedPrice": {
    "price": number,
    "currency": "USD",
    "timestamp": "ISO date string",
    "source": "URL"
  }
}
Only return valid JSON.`;
    const result = await this.modelManager.withBatchProcessing(
      async (llm) => llm.invoke(prompt),
      prompt,
    );
    return this.parseJsonResponse<
      { offering: string; matchedPrice: PriceData }[]
    >(JsonUtils.safeStringify(result.content), 'array');
  }

  // Alternatively, a heuristic approach using string similarity between offering names and price source URLs
  private heuristicMatchOfferingsToPrices(
    offerings: Array<{ name: string }>,
    prices: PriceData[],
  ): { offering: string; matchedPrice: PriceData; score: number }[] {
    return offerings
      .map((offering) => {
        let bestScore = 0;
        let bestPrice: PriceData | null = null;
        for (const priceData of prices) {
          const score = this.calculateStringSimilarity(
            offering.name.toLowerCase(),
            priceData.source.toLowerCase(),
          );
          if (score > bestScore) {
            bestScore = score;
            bestPrice = priceData;
          }
        }
        return {
          offering: offering.name,
          matchedPrice: bestPrice!,
          score: bestScore,
        };
      })
      .filter((result) => result.score > 50);
  }

  private async integrateOfferingPriceMatches(
    websiteContent: WebsiteContent,
  ): Promise<void> {
    const offerings = [
      ...websiteContent.products.map((product) => ({
        name: product.name,
        url: product.url,
        description: product.description ?? '',
      })),
      ...websiteContent.services.map((service) => ({
        name: service.name,
        url: service.url,
        description: service.description ?? '',
      })),
    ];
    if (offerings.length && websiteContent.metadata?.prices?.length) {
      const llmMatches = await this.matchPricesToOfferings(
        offerings,
        websiteContent.metadata.prices,
      );
      const heuristicMatches = this.heuristicMatchOfferingsToPrices(
        offerings,
        websiteContent.metadata.prices,
      );
      console.log('LLM-Based Offering Matches:', llmMatches);
      console.log('Heuristic Offering Matches:', heuristicMatches);
    }
  }
}
-e 
```
-e 

# src/microservices/src/competitor/services/competitor-discovery.service.ts
```
import { Injectable, Logger } from '@nestjs/common';
import { Spider } from '@spider-cloud/spider-client';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { JsonUtils } from '@shared/utils';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import type { DiscoveryResult } from '../interfaces/discovery-result.interface';
import type { CompetitorInsight } from '../interfaces/competitor-insight.interface';
import type { AnalysisResult } from '../interfaces/analysis-result.interface';
import { CompetitorAnalysisService } from './competitor-analysis.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../env';
import type { RobotsData } from '../../interfaces/robots-data.interface';
import type { WebsiteContent } from '../../interfaces/website-content.interface';
import { SmartCrawlerService } from '../../website/services/smart-crawler.service';
import type { ValueserpResponse } from '../interfaces/valueserp-response.interface';

// Define interfaces for better type safety
interface SerpMetadata {
  title?: string;
  snippet?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  url?: string;
  reviews?: number;
}

interface SerpResult {
  url: string;
  metadata?: SerpMetadata;
}

@Injectable()
export class CompetitorDiscoveryService {
  private spider: Spider;
  private readonly logger = new Logger(CompetitorDiscoveryService.name);

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly analysisService: CompetitorAnalysisService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.spider = new Spider({
      apiKey: this.configService.get('SPIDER_API_KEY'),
    });
  }

  async discoverCompetitors(
    domain: string,
    userId: string,
    businessType: string,
    knownCompetitors: string[] = [],
    productCatalogUrl: string,
  ): Promise<DiscoveryResult> {
    try {
      console.info(
        { domain, userId, productCatalogUrl },
        'Starting competitor discovery',
      );

      // First discover our own website content
      console.log('Discovering website content');
      const websiteContent =
        await this.websiteDiscovery.discoverWebsiteContent(domain);

      // Analyze product catalog URL (required)
      console.log('Analyzing product catalog URL');
      try {
        const catalogContent =
          await this.websiteDiscovery.discoverWebsiteContent(productCatalogUrl);
        websiteContent.products = [
          ...websiteContent.products,
          ...catalogContent.products,
        ];
      } catch (error) {
        console.error('Failed to analyze product catalog:', error);
        throw new Error(
          'Product catalog analysis failed. Please ensure the URL is valid and accessible.',
        );
      }

      console.log({ websiteContent }, 'Website content discovered');

      console.log('Determining search strategy');
      const strategy = await this.analysisService.determineSearchStrategy(
        domain,
        businessType,
        websiteContent,
      );
      console.log({ strategy }, 'Search strategy determined');

      // Get competitors from multiple sources
      const [serpResults, llmCompetitors] = await Promise.all([
        this.fetchValueSerpResults(domain, strategy),
        this.getLLMCompetitors(
          domain,
          businessType,
          knownCompetitors,
          websiteContent,
        ),
      ]);

      console.log(
        { serpCount: serpResults.length, llmCount: llmCompetitors.length },
        'Received competitor sources',
      );

      // Extract URLs from SERP results
      const serpUrls = serpResults.map((r) => r.url);
      const results = [...serpUrls];

      // Combine all discovered domains
      const discoveredDomains = [
        ...new Set([
          ...results,
          ...llmCompetitors.map((s) => s.trim().toLowerCase()),
          ...knownCompetitors.map((s) => s.trim().toLowerCase()),
        ]),
      ].filter((s) => s.length > 0 && s !== domain.toLowerCase());

      console.log({ discoveredDomains }, 'Processing discovered domains');

      console.log(
        `Starting competitor analysis for ${discoveredDomains.length} domains`,
      );
      let failedAnalyses = 0;

      // Get competitor insights with error handling and deep crawling when needed
      const competitorInsights = await Promise.all(
        discoveredDomains.map(async (competitorDomain) => {
          try {
            // Find SERP metadata for this domain if available
            const serpData = serpResults.find(
              (r) => r.url === competitorDomain,
            )?.metadata;
            let insight = await this.analysisService.analyzeCompetitor(
              competitorDomain,
              strategy,
              serpData,
            );

            // If no products found but high match score, try deep crawling
            if (insight.products.length === 0 && insight.matchScore > 0.7) {
              console.log(
                `No products found for ${competitorDomain} but high match score. Starting deep crawl...`,
              );

              // Get robots.txt data
              const robotsData =
                await this.websiteDiscovery.fetchRobotsTxt(competitorDomain);

              // Perform deep crawl
              const deepCrawlContent = await this.deepCrawlCompetitor(
                competitorDomain,
                robotsData,
              );

              // Re-analyze with additional content
              insight = await this.analysisService.analyzeCompetitor(
                competitorDomain,
                strategy,
                serpData,
                deepCrawlContent,
              );

              console.log(
                `Deep crawl completed for ${competitorDomain}. Found ${insight.products.length} products.`,
              );
            }

            console.info(
              `Analysis completed for ${competitorDomain}:`,
              insight,
            );
            return insight;
          } catch (error) {
            console.error(
              `Failed to analyze competitor ${competitorDomain}:`,
              error,
            );
            failedAnalyses++;
            return null;
          }
        }),
      );

      // Filter and sort competitors by match score
      const rankedCompetitors = competitorInsights
        .filter((insight): insight is CompetitorInsight => insight !== null)
        .sort((a, b) => b.matchScore - a.matchScore);

      console.info(
        { rankedCount: rankedCompetitors.length },
        'Competitor ranking completed',
      );

      // Get recommended data sources with error handling
      let recommendedSources: string[] = [];
      try {
        recommendedSources =
          await this.analysisService.suggestDataSources(strategy);
        console.log('Recommended data sources:', recommendedSources);
      } catch (error) {
        console.error('Failed to get recommended sources:', error);
        recommendedSources = [];
      }

      const finalStats = {
        totalDiscovered: discoveredDomains.length,
        newCompetitors: 0,
        existingCompetitors: 0,
        failedAnalyses,
      };

      console.info('Discovery process completed with stats:', finalStats);

      return {
        competitors: rankedCompetitors,
        recommendedSources,
        searchStrategy: strategy,
        stats: finalStats,
      };
    } catch (error) {
      console.error('Failed to discover competitors:', error);
      throw new Error(
        'Failed to discover competitors. Please try again later.',
      );
    }
  }

  private async getLLMCompetitors(
    domain: string,
    businessType: string,
    knownCompetitors: string[],
    websiteContent: WebsiteContent,
  ): Promise<string[]> {
    const prompt = `Analyze ${domain} as a ${businessType} business.
    Known competitors: ${knownCompetitors.join(', ')}
    
    Website Content Analysis:
    Title: ${websiteContent.title}
    Description: ${websiteContent.description}
    Products: ${JSON.stringify(websiteContent.products)}
    Services: ${JSON.stringify(websiteContent.services)}
    
    Consider these business-specific aspects for competitor discovery:
    
    1. For hospitality/lodging:
      - Similar location/destination type
      - Comparable experience offerings
      - Price range and luxury level
      - Target tourist demographic
    
    2. For SaaS/Tech:
      - Similar product feature set
      - Target market segment
      - Pricing model alignment
      - Technology stack/platform
    
    3. For marketplaces:
      - Similar market niche
      - Geographic coverage
      - Commission/pricing models
      - Seller/buyer demographics
    
    4. For e-commerce:
      - Product category overlap
      - Price positioning
      - Market reach
      - Fulfillment capabilities
    
    5. For service businesses:
      - Service category match
      - Geographic coverage
      - Expertise/specialization
      - Client segment
    
    Based on the actual products/services discovered from their website, suggest 3-5 direct competitors 
    that most closely match their specific offerings and target market.
    Consider both direct and indirect competitors based on service/product substitutability.
    
    Return ONLY a JSON array of domain names. Example:
    ["competitor1.com", "competitor2.com"]`;

    try {
      const result = await this.modelManager.withBatchProcessing(
        async (llm) => {
          return await llm.invoke(prompt);
        },
        prompt,
      );

      // Fix toString() issue by explicitly checking the type
      let content = '';
      if (typeof result.content === 'string') {
        content = result.content;
      } else if (
        result.content &&
        typeof result.content.toString === 'function'
      ) {
        // Use JSON.stringify instead of toString to avoid [object Object]
        content = JSON.stringify(result.content);
      } else {
        content = JSON.stringify(result.content);
      }

      const jsonStr = JsonUtils.extractJSON(content, 'array');
      return JSON.parse(jsonStr) as string[];
    } catch (error) {
      console.error('Failed to parse LLM competitor response:', error);
      return [];
    }
  }

  private extractUrlsFromResponse(
    data: ValueserpResponse,
    searchType: string,
  ): SerpResult[] {
    const results: SerpResult[] = [];

    // Extract knowledge graph data if available
    if (data.knowledge_graph) {
      const kg = data.knowledge_graph;
      if (kg.website) {
        results.push({
          url: new URL(kg.website).hostname,
          metadata: {
            title: kg.title,
            rating: kg.rating as number | undefined,
            reviewCount: kg.reviews as number | undefined,
            snippet: kg.description as string | undefined,
            priceRange: kg.price_range
              ? {
                  min: parseFloat(kg.price_range as string) || 0,
                  max: parseFloat(kg.price_range as string) || 0,
                  currency: 'USD',
                }
              : undefined,
          },
        });
      }
    }

    // Process organic results
    const processResult = (result: {
      link?: string;
      title?: string;
      snippet?: string;
      rich_snippet?: {
        top?: {
          detected_extensions?: {
            price?: string;
            currency?: {
              code?: string;
              symbol?: string;
            };
          };
          extensions?: string[];
        };
      };
    }) => {
      if (!result.link) return;

      const url = new URL(result.link).hostname;
      const metadata: SerpMetadata = {
        title: result.title,
        snippet: result.snippet,
      };

      // Extract rich snippet data
      if (result.rich_snippet?.top?.detected_extensions) {
        const ext = result.rich_snippet.top.detected_extensions;
        if (ext.price && ext.currency) {
          metadata.priceRange = {
            min: parseFloat(ext.price || '0'),
            max: parseFloat(ext.price || '0'),
            currency: ext.currency.code || ext.currency.symbol || 'USD',
          };
        }

        // Extract rating and review count
        const ratingMatch =
          result.rich_snippet.top.extensions?.[0]?.match?.(
            /(\d+\.?\d*)\((\d+)\)/,
          );
        if (ratingMatch) {
          metadata.rating = parseFloat(ratingMatch[1] || '0');
          metadata.reviewCount = parseInt(ratingMatch[2] || '0', 10);
        }
      }

      results.push({ url, metadata });
    };

    switch (searchType) {
      case 'maps':
        (data.local_results || []).forEach((r) => {
          if (r.website) {
            results.push({
              url: new URL(r.website).hostname,
              metadata: {
                title: r.title,
                rating: r.rating,
                reviewCount: r.reviews,
                snippet: r.snippet,
              },
            });
          }
        });
        break;

      case 'shopping':
        (data.shopping_results || []).forEach((r) => {
          if (r.link) processResult(r);
        });
        break;

      case 'local':
      case 'organic':
        (data.organic_results || []).forEach((r) => {
          processResult(r);
        });
        break;
    }

    // Process related questions for additional context
    if (data.related_questions) {
      data.related_questions.forEach((q) => {
        if (q.source?.link) {
          results.push({
            url: new URL(q.source.link).hostname,
            metadata: {
              title: q.source.title,
              snippet: q.answer,
            },
          });
        }
      });
    }

    return results;
  }

  private async fetchValueSerpResults(
    domain: string,
    strategy: AnalysisResult,
  ): Promise<SerpResult[]> {
    const baseParams: Record<string, string | number> = {
      api_key: this.configService.get('VALUESERP_API_KEY'),
      google_domain: 'google.com',
      gl: 'us',
      hl: 'en',
      location: strategy.locationContext?.location?.country || 'United States',
    };

    const results: SerpResult[] = [];

    // Fetch additional results based on search type
    const endpointMap: Record<
      AnalysisResult['searchType'],
      {
        path: string;
        params: Record<string, string | number>;
      }
    > = {
      maps: {
        path: '/search',
        params: {
          q: strategy.searchQuery,
          tbm: 'lcl',
          num: 20,
          radius: strategy.locationContext?.radius || 25,
        },
      },
      shopping: {
        path: '/shopping',
        params: {
          q: strategy.searchQuery,
          tbm: 'shop',
          num: 15,
        },
      },
      local: {
        path: '/search',
        params: {
          q: strategy.searchQuery,
          tbm: 'lcl',
          num: 15,
          radius: strategy.locationContext?.radius || 50,
        },
      },
      organic: {
        path: '/search',
        params: {
          q: strategy.searchQuery,
          num: 20,
        },
      },
    };

    const config = endpointMap[strategy.searchType] || endpointMap.organic;

    const params = new URLSearchParams({
      ...baseParams,
      ...config.params,
      q: strategy.searchQuery,
    });

    try {
      const response = await fetch(
        `https://api.valueserp.com${config.path}?${params}`,
      );
      if (response.ok) {
        const data = (await response.json()) as ValueserpResponse;
        const extractedResults = this.extractUrlsFromResponse(
          data,
          strategy.searchType,
        );
        results.push(...extractedResults);
      }
    } catch (error) {
      console.error(`ValueSerp ${strategy.searchType} fetch failed:`, error);
    }

    // Deduplicate results
    const uniqueResults: SerpResult[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      const key = JSON.stringify(result);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(result);
      }
    }

    return uniqueResults;
  }

  private async deepCrawlCompetitor(
    domain: string,
    robotsData: RobotsData | null,
  ): Promise<WebsiteContent> {
    this.logger.log(`Starting deep crawl for ${domain}`);

    // Get sitemap data
    const sitemapData = await this.websiteDiscovery.discoverSitemaps(domain);

    // Use smart crawler for deep crawling
    const smartCrawler = new SmartCrawlerService(
      this.modelManager,
      this.websiteDiscovery,
    );

    return smartCrawler.smartCrawl(domain, robotsData, sitemapData);
  }
}
-e 
```
-e 

# src/microservices/src/competitor/services/intelligent-agent.service.ts
```
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import type { CompetitorInsight } from '../interfaces/competitor-insight.interface';
import type { BusinessContext } from '../interfaces/business-context.interface';

// Define an Offering interface to improve code readability
interface Offering {
  type: string;
  category: string;
  features: string[];
  name: string;
  pricing: {
    value: number | null;
    currency: string;
    unit: string;
  };
  sourceUrl: string;
}

// Define a Product interface for type safety
export interface Product {
  name: string;
  description: string;
  price: number;
  currency: string;
}

export type UserProduct = Product;

// Define interfaces for the business type detection
interface BusinessTypeInfo {
  businessType: string;
  specificType: string;
  extractionStrategy: {
    offeringNomenclature: string;
  };
}

// Define interfaces for the tools service
interface ToolsAnalysis {
  detectBusinessType(text: string, domain: string): Promise<BusinessTypeInfo>;
  extractPricesForBusinessType(
    html: string,
    businessType: string,
  ): Array<{
    value: number;
    currency: string;
    unit: string;
    context: string;
    source: string;
  }>;
  categorizeOffering(
    text: string,
    context: {
      businessType: string;
      offeringNomenclature: string;
    },
  ): Promise<Offering>;
  extractFeatures(text: string): Promise<string[]>;
}

interface ToolsNavigation {
  findRelevantPages(domain: string, html: string): Promise<string[]>;
  checkRobotsRules(url: string): Promise<boolean>;
}

interface ToolsWeb {
  fetchContent(url: string): Promise<string>;
  extractText(html: string): string;
  extractMetaTags(html: string): {
    description?: string;
    [key: string]: string | undefined;
  };
  extractStructuredData(html: string): Record<string, unknown>[];
}

interface ToolsSearch {
  serpSearch(
    query: string,
    type: 'shopping' | 'maps' | 'local' | 'organic',
  ): Promise<Array<{ url: string }>>;
}

@Injectable()
export class IntelligentAgentService {
  private readonly logger = new Logger(IntelligentAgentService.name);

  constructor(
    private readonly modelManager: ModelManagerService,
    @Inject('AGENT_TOOLS')
    private readonly tools: {
      analysis: ToolsAnalysis;
      navigation: ToolsNavigation;
      web: ToolsWeb;
      search: ToolsSearch;
    },
  ) {}

  async analyzeCompetitor(
    domain: string,
    businessContext?: BusinessContext,
    serpMetadata?: {
      title?: string;
      snippet?: string;
      rating?: number;
      reviewCount?: number;
      priceRange?: {
        min: number;
        max: number;
        currency: string;
      };
    },
  ): Promise<CompetitorInsight> {
    console.log(`Starting analysis for domain: ${domain}`);

    // Ensure domain has the correct format
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }

    // Log business context if provided
    if (businessContext) {
      console.log(
        `Business context provided: ${JSON.stringify(businessContext)}`,
      );
    }

    try {
      // First, fetch and analyze the website content
      const html = await this.tools.web.fetchContent(domain);
      const websiteText = this.tools.web.extractText(html);
      const metaTags = this.tools.web.extractMetaTags(html);
      const structuredData = this.tools.web.extractStructuredData(html);

      // Detect business type
      console.log(`Detecting business type for ${domain}`);
      const businessTypeInfo = await this.tools.analysis.detectBusinessType(
        websiteText,
        domain,
      );

      // If business context provided, use that business type instead
      if (businessContext?.userBusinessType) {
        businessTypeInfo.businessType = businessContext.userBusinessType;
        console.log(
          `Using provided business type: ${businessTypeInfo.businessType}`,
        );
      }

      console.log(
        `Detected business type: ${businessTypeInfo.businessType}, ${businessTypeInfo.specificType}`,
      );

      // Extract pricing using business-specific approach
      const pricing = this.tools.analysis.extractPricesForBusinessType(
        html,
        businessTypeInfo.businessType,
      );
      console.log(`Extracted ${pricing.length} price points for ${domain}`);

      // Use SERP metadata for additional pricing if available
      if (serpMetadata?.priceRange) {
        console.log(
          `Using SERP pricing data: ${JSON.stringify(serpMetadata.priceRange)}`,
        );
        if (pricing.length === 0) {
          pricing.push({
            value:
              (serpMetadata.priceRange.min + serpMetadata.priceRange.max) / 2,
            currency: serpMetadata.priceRange.currency,
            unit: 'per item',
            context: 'From search results',
            source: 'serp',
          });
        }
      }

      // Find relevant pages to explore
      const relevantPages = await this.tools.navigation.findRelevantPages(
        domain,
        html,
      );
      console.log(`Found ${relevantPages.length} relevant pages to explore`);

      // Extract and analyze offerings from all relevant pages
      const offerings: Offering[] = [];
      const visitedUrls = new Set([domain]);

      for (const pageUrl of relevantPages) {
        // Avoid visiting the same URL twice
        if (visitedUrls.has(pageUrl)) continue;
        visitedUrls.add(pageUrl);

        // Check robots.txt rules
        const isAllowed = await this.tools.navigation.checkRobotsRules(pageUrl);
        if (!isAllowed) {
          console.log(`Skipping disallowed URL: ${pageUrl}`);
          continue;
        }

        try {
          console.log(`Analyzing page: ${pageUrl}`);
          const pageHtml = await this.tools.web.fetchContent(pageUrl);
          const pageText = this.tools.web.extractText(pageHtml);

          // Split text into chunks for analysis
          const chunks = this.splitTextIntoChunks(pageText, 500);

          for (const chunk of chunks) {
            // Skip very short chunks
            if (chunk.length < 50) continue;

            // Categorize the offering with business context
            const categorized = await this.tools.analysis.categorizeOffering(
              chunk,
              {
                businessType: businessTypeInfo.businessType,
                offeringNomenclature:
                  businessTypeInfo.extractionStrategy.offeringNomenclature,
              },
            );

            // Add to offerings if it has a name or category
            if (
              categorized.name !== 'unknown' ||
              categorized.category !== 'unknown'
            ) {
              offerings.push({
                ...categorized,
                sourceUrl: pageUrl,
              });
            }
          }
        } catch (error) {
          console.error(`Error analyzing page ${pageUrl}:`, error);
        }
      }

      console.log(`Extracted ${offerings.length} offerings from ${domain}`);

      // Merge similar offerings and deduplicate
      const uniqueOfferings = this.deduplicateOfferings(offerings);
      console.log(
        `After deduplication: ${uniqueOfferings.length} unique offerings`,
      );

      // Format offerings into CompetitorInsight products format
      const products = uniqueOfferings.map((offering) => {
        const matchedProduct = businessContext?.userProducts?.find(
          (p: UserProduct) =>
            p.name.toLowerCase().includes(offering.name.toLowerCase()) ||
            offering.name.toLowerCase().includes(p.name.toLowerCase()),
        );

        return {
          name: offering.name || offering.category,
          url: offering.sourceUrl || domain,
          price: offering.pricing?.value ?? null,
          currency: offering.pricing?.currency ?? 'USD',
          matchedProducts: [
            {
              name: matchedProduct?.name ?? offering.name ?? offering.category,
              url: offering.sourceUrl ?? '',
              matchScore: matchedProduct ? 80 : 0, // Higher score if matched with user product
              priceDiff: matchedProduct?.price
                ? (offering.pricing?.value ?? 0) - matchedProduct.price
                : null,
            },
          ],
          lastUpdated: new Date().toISOString(),
        };
      });

      // Generate listing platforms based on structured data
      const listingPlatforms = this.extractListingPlatforms(structuredData);

      // Calculate match score based on business context
      let matchScore = 60; // Default score

      if (businessContext) {
        // Increase score if business types match
        if (
          businessContext.userBusinessType &&
          businessContext.userBusinessType.toLowerCase() ===
            businessTypeInfo.businessType.toLowerCase()
        ) {
          matchScore += 15;
        }

        // Increase score if product matches found
        const productMatchCount = products.filter(
          (p) => p.matchedProducts[0].matchScore > 0,
        ).length;
        if (productMatchCount > 0) {
          matchScore += Math.min(25, productMatchCount * 5); // Up to 25 points for product matches
        }
      }

      // Prepare the final competitor insight
      const insight: CompetitorInsight = {
        domain: this.extractDomainName(domain),
        matchScore: Math.min(100, matchScore), // Cap at 100
        matchReasons: [
          `${businessTypeInfo.businessType} business`,
          `offering ${businessTypeInfo.specificType || 'products/services'}`,
        ],
        suggestedApproach: 'Analyze pricing strategy and unique selling points',
        dataGaps: [],
        listingPlatforms,
        products,
      };

      // Identify data gaps
      if (!metaTags.description)
        insight.dataGaps.push('missing meta description');
      if (structuredData.length === 0)
        insight.dataGaps.push('lack of structured data');
      if (pricing.length === 0)
        insight.dataGaps.push('missing pricing information');
      if (products.length === 0)
        insight.dataGaps.push('no clearly identified products/services');

      console.log(`Completed analysis for ${domain}`);
      return insight;
    } catch (error) {
      console.error(`Failed to analyze competitor ${domain}:`, error);
      throw error;
    }
  }

  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];

    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  private deduplicateOfferings(offerings: Offering[]): Offering[] {
    const result: Offering[] = [];
    const nameMap = new Map<string, number>();

    for (const offering of offerings) {
      const key = offering.name.toLowerCase();

      if (nameMap.has(key)) {
        // Merge with existing offering
        const existingIndex = nameMap.get(key)!;
        const existing = result[existingIndex];

        // Keep the offering with more details
        if (offering.pricing?.value && !existing.pricing?.value) {
          existing.pricing = offering.pricing;
        }

        // Merge features
        if (Array.isArray(offering.features) && offering.features.length > 0) {
          existing.features = [
            ...new Set([...existing.features, ...offering.features]),
          ];
        }
      } else {
        // Add as new offering
        nameMap.set(key, result.length);
        result.push(offering);
      }
    }

    return result;
  }

  private extractListingPlatforms(
    structuredData: Record<string, unknown>[],
  ): CompetitorInsight['listingPlatforms'] {
    const platforms: CompetitorInsight['listingPlatforms'] = [];

    // Common platforms to check for
    const commonPlatforms = [
      { name: 'Booking.com', pattern: 'booking.com' },
      { name: 'Expedia', pattern: 'expedia' },
      { name: 'TripAdvisor', pattern: 'tripadvisor' },
      { name: 'Hotels.com', pattern: 'hotels.com' },
      { name: 'Airbnb', pattern: 'airbnb' },
      { name: 'Agoda', pattern: 'agoda' },
      { name: 'Yelp', pattern: 'yelp' },
      { name: 'Google', pattern: 'google.com/travel' },
    ];

    // Extract from structured data
    for (const data of structuredData) {
      if (data.sameAs && Array.isArray(data.sameAs)) {
        for (const url of data.sameAs as string[]) {
          for (const platform of commonPlatforms) {
            if (url.includes(platform.pattern)) {
              const aggregateRating = data.aggregateRating as
                | {
                    ratingValue?: number;
                    reviewCount?: number;
                  }
                | undefined;

              platforms.push({
                platform: platform.name,
                url,
                rating: aggregateRating?.ratingValue ?? null,
                reviewCount: aggregateRating?.reviewCount ?? null,
                priceRange: undefined,
              });
              break;
            }
          }
        }
      }
    }

    return platforms;
  }

  private extractDomainName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^www\./, '').split('/')[0];
    }
  }

  async discoverCompetitors(
    domain: string,
    businessType: string,
    userProducts: UserProduct[],
  ): Promise<CompetitorInsight[]> {
    this.logger.log(`Starting competitor discovery for ${domain}`);

    try {
      // Step 1: Analyze the user's business
      // Ensure domain has proper format
      const mainUrl =
        domain.startsWith('http://') || domain.startsWith('https://')
          ? domain
          : `https://${domain}`;

      const html = await this.tools.web.fetchContent(mainUrl);
      const businessText = this.tools.web.extractText(html);
      const businessFeatures =
        await this.tools.analysis.extractFeatures(businessText);

      // Step 2: Generate search queries
      const searchPrompt = `Generate specific competitor search queries based on ACTUAL PRODUCTS and features of the business:
      Business Type: ${businessType}
      Key Products:  ${JSON.stringify(userProducts)}
      Product Features: ${JSON.stringify(businessFeatures)}
      
      Create queries that:
      1. Focus on exact product matches first
      2. Include specific product features
      3. Combine product + location context
      4. Avoid generic terms
      
      Return ONLY a JSON array of 1-3 search queries optimized for the appropriate search types (shopping, local, organic).`;

      const result = await this.modelManager.withBatchProcessing(
        async (llm) => llm.invoke(searchPrompt),
        searchPrompt,
      );

      let searchQueries: string[];
      try {
        // Try to parse the response directly
        const responseContent =
          typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content);

        try {
          const parsedQueries: unknown = JSON.parse(responseContent);
          // Ensure each query is a string
          searchQueries = Array.isArray(parsedQueries)
            ? parsedQueries
                .map((q: unknown) =>
                  typeof q === 'string' ? q : JSON.stringify(q),
                )
                .filter(Boolean)
            : [`competitors for ${businessType}`, domain];
        } catch (parseError) {
          // If direct parsing fails, try to extract JSON array using regex
          const jsonMatch = /\[[\s\S]*\]/.exec(responseContent);
          if (!jsonMatch) {
            this.logger.warn(
              `Failed to extract search queries from LLM response: ${(parseError as Error).message}`,
            );
            searchQueries = [
              `${businessType} ${userProducts[0]?.name}`,
              domain,
            ];
          } else {
            try {
              const extractedQueries: unknown = JSON.parse(jsonMatch[0]);
              searchQueries = Array.isArray(extractedQueries)
                ? extractedQueries
                    .map((q: unknown) =>
                      typeof q === 'string' ? q : JSON.stringify(q),
                    )
                    .filter(Boolean)
                : [`${businessType} ${userProducts[0]?.name}`, domain];
            } catch (secondParseError) {
              this.logger.warn(
                `Failed to parse extracted JSON array: ${(secondParseError as Error).message}`,
              );
              searchQueries = [
                `${businessType} ${userProducts[0]?.name}`,
                domain,
              ];
            }
          }
        }

        // Ensure we have a valid array with non-empty strings
        if (
          !Array.isArray(searchQueries) ||
          searchQueries.length === 0 ||
          !searchQueries.every((q) => typeof q === 'string' && q.length > 0)
        ) {
          searchQueries = [`${businessType} ${userProducts[0]?.name}`, domain];
        }
      } catch (error) {
        this.logger.error(
          `Error processing search queries: ${(error as Error).message}`,
        );
        searchQueries = [`${businessType} ${userProducts[0]?.name}`, domain];
      }

      // Step 3: Execute searches with different strategies
      const searchTypes: Array<'shopping' | 'maps' | 'local' | 'organic'> = [
        'shopping',
        'organic',
        businessType.includes('local') ? 'local' : 'maps',
      ];

      const searchResults = await Promise.all(
        searchQueries.flatMap((query) =>
          searchTypes.map((type) =>
            this.tools.search.serpSearch(query, type).catch((error) => {
              console.warn(
                `Search failed for query "${query}" with type "${type}":`,
                error,
              );
              return [];
            }),
          ),
        ),
      );

      // Step 4: Extract unique competitor domains
      const competitors = new Set<string>();
      const AGGREGATOR_DENYLIST = new Set([
        'tripadvisor.com',
        'expedia.com',
        'booking.com',
        'hotels.com',
        'agoda.com',
        'kayak.com',
      ]);

      searchResults.flat().forEach((result) => {
        if (Array.isArray(result)) {
          result.forEach((item) => {
            if (
              item?.url &&
              typeof item.url === 'string' &&
              item.url !== domain &&
              !AGGREGATOR_DENYLIST.has(new URL(item.url as string).hostname)
            ) {
              competitors.add(item.url as string);
            }
          });
        }
      });

      // Step 5: Analyze each competitor
      const insights = await Promise.all(
        Array.from(competitors).map((competitorDomain) => {
          const competitorBusinessContext = {
            ...(businessType && { businessType }),
            userProducts,
          };

          return this.analyzeCompetitor(
            competitorDomain,
            competitorBusinessContext,
          ).catch((error) => {
            this.logger.warn(`Failed to analyze ${competitorDomain}:`, error);
            return null;
          });
        }),
      );

      return insights.filter(
        (insight): insight is CompetitorInsight => insight !== null,
      );
    } catch (error) {
      this.logger.error(`Failed to discover competitors for ${domain}:`, error);
      throw error;
    }
  }
}
-e 
```
-e 

# src/microservices/src/env.ts
```
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('3000'),
  SPIDER_API_KEY: z.string(),
  GROQ_API_KEY: z.string(),
  GEMINI_API_KEY: z.string(),
  VALUESERP_API_KEY: z.string().min(1),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),
  REDIS_TLS: z
    .preprocess(
      (val) => (typeof val === 'string' ? val === 'true' : val),
      z.boolean(),
    )
    .default(false),
  MICROSERVICE_HOST: z.string().default('localhost'),
  MICROSERVICE_PORT: z.string().transform(Number).default('3001'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('âŒ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }

  return result.data;
}
-e 
```
-e 

# src/microservices/src/interfaces/price-data.interface.ts
```
export interface PriceData {
  price: number;
  currency: string;
  timestamp: Date;
  source: string;
}
-e 
```
-e 

# src/microservices/src/interfaces/robots-data.interface.ts
```
export interface RobotsData {
  sitemaps: string[];
  allowedPaths: string[];
  disallowedPaths: string[];
  crawlDelay?: number;
}
-e 
```
-e 

# src/microservices/src/interfaces/sitemap-data.interface.ts
```
export interface SitemapData {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}
-e 
```
-e 

# src/microservices/src/interfaces/website-content.interface.ts
```
export interface WebsiteContent {
  url: string;
  title: string;
  description: string;
  products: Array<{
    name: string;
    url?: string;
    price?: number;
    currency?: string;
    description?: string;
    category?: string;
    lastUpdated?: string;
  }>;
  services: Array<{
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    url?: string;
  }>;
  categories: string[];
  keywords: string[];
  mainContent: string;
  metadata?: {
    structuredData?: Record<string, unknown>[];
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
      postalCode?: string;
    };
    prices?: Array<{
      price: number;
      currency: string;
      timestamp: Date;
      source: string;
    }>;
  };
}
-e 
```
-e 

# src/microservices/src/main.ts
```
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001,
    },
  });
  await app.listen();
  console.log('Microservice is listening on port 3001');
}
void bootstrap();
-e 
```
-e 

# src/microservices/src/shared/interfaces/price-data.interface.ts
```
export interface PriceData {
  price: number;
  currency: string;
  timestamp: Date;
  source: string;
}
-e 
```
-e 

# src/microservices/src/shared/services/model-manager.service.ts
```
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { Env } from '../../env';
import { ConfigService } from '@nestjs/config';

type LLMProvider = 'groq' | 'gemini';

interface LLMInstance {
  llm: ChatGroq | ChatGoogleGenerativeAI;
  provider: LLMProvider;
}

type ModelConfig = {
  provider: LLMProvider;
  model: string;
  tokensPerMinute: number;
  requestsPerMinute: number;
  tokensPerDay?: number;
  requestsPerDay?: number;
  qualityScore: number; // 0-100
  throughput: number; // tokens/sec
  latency: number; // seconds
  contextWindow: number; // tokens
  complexity: number; // 0-100, higher means better at complex tasks
};

const MODELS: ModelConfig[] = [
  {
    provider: 'groq',
    model: 'llama3-70b-8192',
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 74,
    throughput: 71.5,
    latency: 0.5,
    contextWindow: 128000,
    complexity: 90,
  },
  {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 75,
    throughput: 80,
    latency: 0.45,
    contextWindow: 32000,
    complexity: 85,
  },
  {
    provider: 'groq',
    model: 'deepseek-r1-distill-llama-70b',
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 70,
    throughput: 65,
    latency: 0.55,
    contextWindow: 128000,
    complexity: 85,
  },
  {
    provider: 'groq',
    model: 'llama3-8b-8192',
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 65,
    throughput: 120,
    latency: 0.35,
    contextWindow: 8192,
    complexity: 60,
  },
];

type ModelUsage = {
  lastUsed: number;
  tokensUsed: number;
  requestsUsed: number;
};

type TaskComplexity = 'simple' | 'medium' | 'complex';

type BatchRequest<T> = {
  prompt: string;
  operation: (llm: ChatGroq | ChatGoogleGenerativeAI) => Promise<T>;
  preferredModel?: string;
  priority?: number;
};

type BatchQueue<T> = {
  requests: BatchRequest<T>[];
  timestamp: number;
  processing: boolean;
};

@Injectable()
export class ModelManagerService implements OnModuleDestroy {
  private modelUsage: Map<string, ModelUsage>;
  private retryDelays: number[];
  private batchQueues: Map<string, BatchQueue<unknown>>;
  private batchProcessingIntervals: Map<string, NodeJS.Timeout>;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_WINDOW_MS = 10000;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.modelUsage = new Map();
    this.retryDelays = [1000, 2000, 4000, 8000, 16000];
    this.batchQueues = new Map();
    this.batchProcessingIntervals = new Map();

    // Initialize all models
    MODELS.forEach(({ model }) => {
      this.modelUsage.set(model, {
        lastUsed: 0,
        tokensUsed: 0,
        requestsUsed: 0,
      });
      this.batchQueues.set(model, {
        requests: [],
        timestamp: Date.now(),
        processing: false,
      });

      const interval = setInterval(() => {
        this.processQueueForModel(model).catch(console.error);
      }, this.BATCH_WINDOW_MS);

      this.batchProcessingIntervals.set(model, interval);
    });

    // Verify API keys are present
    const groqKey = this.configService.get<string | undefined>('GROQ_API_KEY');
    const geminiKey = this.configService.get<string | undefined>(
      'GEMINI_API_KEY',
    );

    if (!groqKey) console.warn('GROQ_API_KEY not found in environment');
    if (!geminiKey) console.warn('GEMINI_API_KEY not found in environment');
  }

  onModuleDestroy() {
    for (const interval of this.batchProcessingIntervals.values()) {
      clearInterval(interval);
    }
    this.batchProcessingIntervals.clear();
  }

  private getTaskComplexity(prompt: string): TaskComplexity {
    const hasJsonParsing = prompt.includes('Return ONLY a JSON');
    const hasMultipleSteps =
      prompt.includes('considering:') || prompt.includes('steps:');
    const hasAnalysis =
      prompt.includes('Analyze') || prompt.includes('Compare');

    if (hasJsonParsing && hasMultipleSteps && hasAnalysis) return 'complex';
    if (hasJsonParsing || hasMultipleSteps || hasAnalysis) return 'medium';
    return 'simple';
  }

  private getModelScore(
    model: ModelConfig,
    taskComplexity: TaskComplexity,
  ): number {
    const weights = {
      simple: {
        qualityScore: 0.2,
        throughput: 0.3,
        latency: 0.3,
        contextWindow: 0.1,
        complexity: 0.1,
      },
      medium: {
        qualityScore: 0.3,
        throughput: 0.2,
        latency: 0.2,
        contextWindow: 0.1,
        complexity: 0.2,
      },
      complex: {
        qualityScore: 0.3,
        throughput: 0.1,
        latency: 0.1,
        contextWindow: 0.2,
        complexity: 0.3,
      },
    };

    const w = weights[taskComplexity];
    const normalizedContextWindow = model.contextWindow / 128000;

    return (
      w.qualityScore * (model.qualityScore / 100) +
      w.throughput * (model.throughput / 120) +
      w.latency * (1 - model.latency / 1) +
      w.contextWindow * normalizedContextWindow +
      w.complexity * (model.complexity / 100)
    );
  }

  private getBestAvailableModel(taskComplexity: TaskComplexity): string | null {
    const availableModels = MODELS.filter((m) =>
      this.canUseModel(m.model),
    ).sort(
      (a, b) =>
        this.getModelScore(b, taskComplexity) -
        this.getModelScore(a, taskComplexity),
    );

    return availableModels[0]?.model || null;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private resetUsageIfNeeded(model: string): void {
    const usage = this.modelUsage.get(model);
    if (!usage) return;

    const now = Date.now();
    const minuteAgo = now - 60000;

    if (usage.lastUsed < minuteAgo) {
      this.modelUsage.set(model, {
        lastUsed: now,
        tokensUsed: 0,
        requestsUsed: 0,
      });
    }
  }

  private canUseModel(model: string): boolean {
    const config = MODELS.find((m) => m.model === model);
    const usage = this.modelUsage.get(model);

    if (!config || !usage) return false;

    this.resetUsageIfNeeded(model);

    return (
      usage.tokensUsed < config.tokensPerMinute &&
      usage.requestsUsed < config.requestsPerMinute
    );
  }

  private updateUsage(model: string, tokens: number): void {
    const usage = this.modelUsage.get(model);
    if (!usage) return;

    this.modelUsage.set(model, {
      lastUsed: Date.now(),
      tokensUsed: usage.tokensUsed + tokens,
      requestsUsed: usage.requestsUsed + 1,
    });
  }

  private createLLMInstance(config: ModelConfig): LLMInstance {
    switch (config.provider) {
      case 'groq': {
        const apiKey = this.configService.get<string>('GROQ_API_KEY');
        if (!apiKey) throw new Error('GROQ_API_KEY not found in environment');
        return {
          llm: new ChatGroq({
            apiKey,
            modelName: config.model,
          }),
          provider: 'groq',
        };
      }
      case 'gemini': {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) throw new Error('GEMINI_API_KEY not found in environment');
        return {
          llm: new ChatGoogleGenerativeAI({
            apiKey,
            modelName: config.model,
          }),
          provider: 'gemini',
        };
      }
      default: {
        // This should never happen as we've exhausted all possible values of LLMProvider
        const provider = config.provider;
        throw new Error(`Unsupported provider: ${String(provider)}`);
      }
    }
  }

  async getLLM(
    prompt: string,
    preferredModel = 'gemini-2.0-flash',
  ): Promise<ChatGroq | ChatGoogleGenerativeAI> {
    const taskComplexity = this.getTaskComplexity(prompt);

    for (const delay of this.retryDelays) {
      if (preferredModel && this.canUseModel(preferredModel)) {
        const model = MODELS.find((m) => m.model === preferredModel);
        if (!model) throw new Error(`Model ${preferredModel} not found`);
        return this.createLLMInstance(model).llm;
      }

      const bestModel = this.getBestAvailableModel(taskComplexity);
      if (bestModel) {
        const model = MODELS.find((m) => m.model === bestModel);
        if (!model) throw new Error(`Model ${bestModel} not found`);

        if (bestModel !== preferredModel) {
          console.log(
            `Using optimized model for ${taskComplexity} task: ${bestModel} (${model.provider})`,
          );
        }
        return this.createLLMInstance(model).llm;
      }

      await this.sleep(delay);
    }

    throw new Error('All models are rate limited. Please try again later.');
  }

  private async processQueueForModel(model: string): Promise<void> {
    const queue = this.batchQueues.get(model);
    if (!queue || queue.processing || queue.requests.length === 0) {
      return;
    }

    queue.processing = true;
    try {
      const batchSize = Math.min(queue.requests.length, this.BATCH_SIZE);
      const batch = queue.requests.splice(0, batchSize);
      await this.processBatch(model, batch);
    } finally {
      queue.processing = false;
      queue.timestamp = Date.now();
    }
  }

  private async processBatch<T>(
    model: string,
    batch: BatchRequest<T>[],
  ): Promise<void> {
    const modelConfig = MODELS.find((m) => m.model === model);
    if (!modelConfig) throw new Error(`Model ${model} not found`);

    const { llm } = this.createLLMInstance(modelConfig);

    for (const request of batch) {
      try {
        const result = await request.operation(llm);
        const tokens = JSON.stringify(result).length / 4;
        this.updateUsage(model, tokens);
        await this.sleep(100);
      } catch (error) {
        console.error('Batch request failed:', error);
      }
    }
  }

  private enforceJsonOutput(prompt: string): string {
    return `${prompt.trim()}

Instructions:
1. Return ONLY a valid JSON object/array
2. Do not include any explanatory text
3. Do not include markdown formatting
4. Do not include code blocks
5. The response should be parseable by JSON.parse()

Example of correct format:
{"key": "value"} or ["item1", "item2"]`;
  }

  async withBatchProcessing<T>(
    operation: (llm: ChatGroq | ChatGoogleGenerativeAI) => Promise<T>,
    prompt: string,
    preferredModel?: string,
  ): Promise<T> {
    const taskComplexity = this.getTaskComplexity(prompt);
    const model =
      preferredModel ??
      this.getBestAvailableModel(taskComplexity) ??
      MODELS[0]?.model;

    const queue = this.batchQueues.get(model);
    if (!queue) {
      throw new Error(`No queue found for model ${model}`);
    }

    return new Promise((resolve, reject) => {
      const request: BatchRequest<T> = {
        prompt: this.enforceJsonOutput(prompt),
        operation: async (llm) => {
          try {
            const result = await operation(llm);
            resolve(result);
            return result;
          } catch (error) {
            reject(error as Error);
            throw error;
          }
        },
        preferredModel: model,
      };

      queue.requests.push(request);
    });
  }

  // async testProviders(): Promise<{ groq: boolean; gemini: boolean }> {
  //   const results = { groq: false, gemini: false };
  //   const testPrompt = 'Return a simple JSON response with {"test": "success"}';
  //   const message = new HumanMessage(testPrompt);

  //   try {
  //     // Test Groq
  //     const groqModel = MODELS.find(m => m.provider === 'groq');
  //     if (groqModel) {
  //       const groqLLM = await this.getLLM(testPrompt, groqModel.model);
  //       const groqResult = await groqLLM.invoke([message]);
  //       results.groq = groqResult.content.toString().includes('success');
  //     }
  //   } catch (error) {
  //     console.error('Groq test failed:', error);
  //   }

  //   try {
  //     // Test Gemini
  //     const geminiModel = MODELS.find(m => m.provider === 'gemini');
  //     if (geminiModel) {
  //       const geminiLLM = await this.getLLM(testPrompt, geminiModel.model);
  //       const geminiResult = await geminiLLM.invoke([message]);
  //       results.gemini = geminiResult.content.toString().includes('success');
  //     }
  //   } catch (error) {
  //     console.error('Gemini test failed:', error);
  //   }

  //   return results;
  // }
}
-e 
```
-e 

# src/microservices/src/shared/shared.module.ts
```
import { Module } from '@nestjs/common';
import { JsonUtils } from './utils';
import { ModelManagerService } from './services/model-manager.service';

@Module({
  providers: [JsonUtils, ModelManagerService],
  exports: [JsonUtils, ModelManagerService],
})
export class SharedModule {}
-e 
```
-e 

# src/microservices/src/shared/utils/index.ts
```
export * from './json.utils';
-e 
```
-e 

# src/microservices/src/shared/utils/json.utils.ts
```
import { Injectable } from '@nestjs/common';

@Injectable()
export class JsonUtils {
  static extractJSON(
    text: string,
    expectedType: 'object' | 'array' = 'object',
  ): string {
    // First try to find JSON within code blocks
    const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
    if (codeBlockMatch?.[1]) {
      const extracted = codeBlockMatch[1].trim();
      try {
        // Validate it's the expected type
        const parsed = JSON.parse(extracted) as unknown;
        if (
          (expectedType === 'object' &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)) ||
          (expectedType === 'array' && Array.isArray(parsed))
        ) {
          return extracted;
        }
      } catch {
        // Continue to other methods if parsing fails
      }
    }

    // Try to find JSON-like content
    const jsonPattern =
      expectedType === 'object' ? /\{[\s\S]*\}/ : /\[[\s\S]*\]/;

    const match = text.match(jsonPattern);
    if (match?.[0]) {
      const extracted = match[0].trim();
      try {
        // Validate it's the expected type
        const parsed = JSON.parse(extracted) as unknown;
        if (
          (expectedType === 'object' &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)) ||
          (expectedType === 'array' && Array.isArray(parsed))
        ) {
          return extracted;
        }
      } catch {
        // Continue to cleanup if parsing fails
      }
    }

    // Clean up common issues
    let cleaned = text
      .replace(/^[^{[]*/, '') // Remove any text before the first { or [
      .replace(/[^}\]]*$/, '') // Remove any text after the last } or ]
      .replace(/\\n/g, ' ') // Replace newlines with spaces
      .replace(/\\"/g, '"') // Fix escaped quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Add missing quotes around property names
    cleaned = cleaned.replace(
      /(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
      '$1"$2":',
    );

    try {
      // Final validation
      const parsed = JSON.parse(cleaned) as unknown;
      if (
        (expectedType === 'object' &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed)) ||
        (expectedType === 'array' && Array.isArray(parsed))
      ) {
        return cleaned;
      }
    } catch {
      // If all attempts fail, return a default structure
      return expectedType === 'object' ? '{}' : '[]';
    }

    // If type doesn't match, return default
    return expectedType === 'object' ? '{}' : '[]';
  }

  /**
   * Safely converts LLM response content to string, handling potential edge cases
   */
  static safeStringify(content: unknown): string {
    if (content === null || content === undefined) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    if (typeof content === 'object') {
      try {
        // First attempt proper JSON serialization
        const jsonString = JSON.stringify(content);
        // Don't return unhelpful "[object Object]" strings
        return jsonString === '[object Object]' ? '' : jsonString;
      } catch {
        // If serialization fails, return empty string
        return '';
      }
    }

    // For primitive types (numbers, booleans)
    if (typeof content === 'number' || typeof content === 'boolean') {
      return String(content);
    }

    // For any other type that might use Object's default stringification
    return '';
  }
}
-e 
```
-e 

# src/microservices/src/website/interfaces/robots-data.interface.ts
```
export interface RobotsData {
  sitemaps: string[];
  allowedPaths: string[];
  disallowedPaths: string[];
  crawlDelay?: number;
}
-e 
```
-e 

# src/microservices/src/website/interfaces/sitemap-data.interface.ts
```
export interface SitemapData {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}
-e 
```
-e 

# src/microservices/src/website/interfaces/website-content.interface.ts
```
export interface WebsiteContent {
  url: string;
  title: string;
  description: string;
  products: Array<{
    name: string;
    url?: string;
    price?: number;
    currency?: string;
    description?: string;
    category?: string;
    lastUpdated?: string;
    type?: 'physical' | 'digital';
  }>;
  services: Array<{
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    category?: string;
    type?: string;
  }>;
  categories: string[];
  keywords: string[];
  mainContent: string;
  metadata?: {
    structuredData?: Record<string, unknown>[];
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
      postalCode?: string;
    };
    prices?: Array<{
      price: number;
      currency: string;
      timestamp: Date;
      source: string;
    }>;
    hasPhysicalLocation?: boolean;
    hasOnlineServices?: boolean;
    hasOnlineBooking?: boolean;
    socialMedia?: string[];
    hasApp?: boolean;
    employeeCount?: number;
    locationCount?: number;
    priceRange?: string;
    qualityIndicators?: string[];
    marketPosition?: string;
    serviceRadius?: number;
    deliveryRadius?: number;
    uniqueFeatures?: string[];
    capabilities?: string[];
    targetDemographics?: string[];
    marketSegments?: string[];
    usp?: string[];
    strengths?: string[];
  };
}
-e 
```
-e 

# src/microservices/src/website/services/smart-crawler.service.ts
```
import { Injectable, Logger } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { WebsiteDiscoveryService } from './website-discovery.service';
import type { WebsiteContent } from '../../interfaces/website-content.interface';
import type { RobotsData } from '../../interfaces/robots-data.interface';
import type { SitemapData } from '../../interfaces/sitemap-data.interface';

@Injectable()
export class SmartCrawlerService {
  private readonly logger = new Logger(SmartCrawlerService.name);
  private readonly MAX_PAGES_PER_DEPTH = 10;
  private readonly MAX_DEPTH = 3;
  private readonly LLM_URL_THRESHOLD = 50;

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
  ) {}

  async smartCrawl(
    domain: string,
    robotsData: RobotsData | null,
    sitemapData: SitemapData[],
  ): Promise<WebsiteContent> {
    this.logger.log(`Starting smart crawl for ${domain}`);
    const results: WebsiteContent[] = [];
    const crawled = new Set<string>();
    const urlsByDepth = new Map<number, Set<string>>();

    // Initialize with homepage at depth 0
    urlsByDepth.set(0, new Set([`https://${domain}`]));

    // Add sitemap URLs if available, using LLM for large sitemaps
    if (sitemapData.length > this.LLM_URL_THRESHOLD) {
      const prioritizedUrls = await this.prioritizeUrlsWithLLM(sitemapData);
      urlsByDepth.set(1, new Set(prioritizedUrls));
    } else {
      urlsByDepth.set(1, new Set(sitemapData.map((entry) => entry.loc)));
    }

    // Crawl each depth level
    for (let depth = 0; depth <= this.MAX_DEPTH; depth++) {
      const urls = urlsByDepth.get(depth) ?? new Set<string>();
      this.logger.log(`Crawling depth ${depth} with ${urls.size} URLs`);

      // Prioritize URLs at current depth if too many
      let urlsToProcess = [...urls];
      if (urlsToProcess.length > this.MAX_PAGES_PER_DEPTH) {
        if (depth === 0) {
          // For depth 0, just keep homepage
          urlsToProcess = urlsToProcess.slice(0, 1);
        } else {
          urlsToProcess = await this.prioritizeUrlsWithLLM(urlsToProcess);
        }
      }

      // Process URLs at current depth
      for (const url of urlsToProcess) {
        if (crawled.has(url)) continue;

        // Check robots.txt rules
        if (robotsData) {
          try {
            const urlPath = new URL(url).pathname;
            if (
              robotsData.disallowedPaths.some((path) =>
                urlPath.startsWith(path),
              )
            ) {
              this.logger.debug(`Skipping disallowed path: ${url}`);
              continue;
            }
          } catch (error) {
            this.logger.warn(`Invalid URL ${url}:`, error);
            continue;
          }
        }

        try {
          crawled.add(url);
          this.logger.debug(`Crawling ${url} at depth ${depth}`);

          const content =
            await this.websiteDiscovery.discoverWebsiteContent(url);
          results.push(content);

          // Extract and add new URLs for next depth
          if (depth < this.MAX_DEPTH) {
            const newUrls = this.extractUrlsFromContent(content, domain);
            const nextDepthUrls =
              urlsByDepth.get(depth + 1) ?? new Set<string>();
            newUrls.forEach((newUrl) => nextDepthUrls.add(newUrl));
            urlsByDepth.set(depth + 1, nextDepthUrls);
          }

          // Respect crawl delay
          if (robotsData?.crawlDelay) {
            await new Promise((resolve) =>
              setTimeout(resolve, (robotsData.crawlDelay ?? 1) * 1000),
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to crawl ${url}:`, error);
        }
      }
    }

    // Merge all discovered content
    return this.mergeWebsiteContent(results);
  }

  private async prioritizeUrlsWithLLM(
    urls: string[] | SitemapData[],
  ): Promise<string[]> {
    const prompt = `Analyze these URLs and select the top ${this.MAX_PAGES_PER_DEPTH} most likely to contain valuable competitor information like products, services, pricing, or business details.

    URLs to analyze:
    ${JSON.stringify(urls, null, 2)}

    Consider these factors:
    1. Product/category pages
    2. Service description pages
    3. Pricing pages
    4. About/Company pages
    5. Contact/Location pages

    Return ONLY a JSON array of the top ${this.MAX_PAGES_PER_DEPTH} most relevant URLs.
    Example: ["https://example.com/products", "https://example.com/services"]`;

    try {
      const result = await this.modelManager.withBatchProcessing(
        async (llm) => {
          return await llm.invoke(prompt);
        },
        prompt,
      );

      const resultContent =
        typeof result.content === 'object'
          ? JSON.stringify(result.content)
          : String(result.content);
      const selectedUrls = JSON.parse(resultContent) as string[];
      return selectedUrls.slice(0, this.MAX_PAGES_PER_DEPTH);
    } catch (error) {
      this.logger.error('Failed to prioritize URLs with LLM:', error);
      // Fallback to basic prioritization
      return this.basicUrlPrioritization(urls);
    }
  }

  private basicUrlPrioritization(urls: string[] | SitemapData[]): string[] {
    const priorityKeywords = [
      'product',
      'service',
      'pricing',
      'price',
      'about',
      'contact',
      'location',
      'store',
    ];
    const urlStrings = urls
      .map((url: string | SitemapData) => {
        if (typeof url === 'string') return url;
        if (
          url &&
          typeof url === 'object' &&
          'loc' in url &&
          typeof url.loc === 'string'
        )
          return url.loc;
        return '';
      })
      .filter(Boolean);

    return urlStrings
      .sort((a, b) => {
        const aScore = priorityKeywords.reduce(
          (score, keyword) =>
            score + (a.toLowerCase().includes(keyword) ? 1 : 0),
          0,
        );
        const bScore = priorityKeywords.reduce(
          (score, keyword) =>
            score + (b.toLowerCase().includes(keyword) ? 1 : 0),
          0,
        );
        return bScore - aScore;
      })
      .slice(0, this.MAX_PAGES_PER_DEPTH);
  }

  private extractUrlsFromContent(
    content: WebsiteContent,
    domain: string,
  ): string[] {
    const urls = new Set<string>();

    // Extract URLs from structured data
    content.metadata?.structuredData?.forEach((data) => {
      const extractUrls = (obj: Record<string, unknown>): void => {
        Object.values(obj).forEach((value) => {
          if (typeof value === 'string' && value.startsWith('http')) {
            try {
              const url = new URL(value);
              if (url.hostname.includes(domain)) {
                urls.add(value);
              }
            } catch (error) {
              this.logger.warn(`Invalid URL ${value}:`, error);
            }
          } else if (typeof value === 'object' && value !== null) {
            if (value !== null && typeof value === 'object') {
              extractUrls(value as Record<string, unknown>);
            }
          }
        });
      };
      extractUrls(data);
    });

    // Extract URLs from products and services
    content.products?.forEach((product) => {
      if ('url' in product && typeof product.url === 'string') {
        urls.add(product.url);
      }
    });
    content.services?.forEach((service) => {
      if ('url' in service && typeof service.url === 'string') {
        urls.add(service.url);
      }
    });

    return [...urls];
  }

  private mergeWebsiteContent(contents: WebsiteContent[]): WebsiteContent {
    if (contents.length === 0) {
      return {
        url: '',
        title: '',
        description: '',
        products: [],
        services: [],
        categories: [],
        keywords: [],
        mainContent: '',
        metadata: {
          structuredData: [],
          contactInfo: {},
          prices: [],
        },
      };
    }

    return {
      url: contents[0].url,
      title: contents[0].title,
      description: contents[0].description,
      products: [...new Set(contents.flatMap((c) => c.products || []))],
      services: [...new Set(contents.flatMap((c) => c.services || []))],
      categories: [...new Set(contents.flatMap((c) => c.categories || []))],
      keywords: [...new Set(contents.flatMap((c) => c.keywords || []))],
      mainContent: contents.map((c) => c.mainContent ?? '').join('\n'),
      metadata: {
        structuredData: contents.flatMap(
          (c) => c.metadata?.structuredData ?? [],
        ),
        contactInfo: contents[0]?.metadata?.contactInfo ?? {},
        prices: contents.flatMap((c) => c.metadata?.prices ?? []),
      },
    };
  }
}
-e 
```
-e 

# src/microservices/src/website/services/website-discovery.service.ts
```
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Spider } from '@spider-cloud/spider-client';
import { ModelManagerService } from '../../shared/services/model-manager.service';
import * as cheerio from 'cheerio';
import { ChatGroq } from '@langchain/groq';
import type { Env } from '../../env';
import { JsonUtils } from '@shared/utils';
import * as robotsParser from 'robots-parser';
import { Robot } from 'robots-parser';
import { XMLParser } from 'fast-xml-parser';
import type { RobotsData } from '../../interfaces/robots-data.interface';
import type { WebsiteContent } from '../../interfaces/website-content.interface';
import type { SitemapData } from '../../interfaces/sitemap-data.interface';
import type { PriceData } from '@shared/interfaces/price-data.interface';

@Injectable()
export class WebsiteDiscoveryService {
  private readonly logger = new Logger(WebsiteDiscoveryService.name);
  private spider: Spider;
  private readonly MAX_TEXT_LENGTH = 8000;
  private readonly TIMEOUT = 60000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000;
  private readonly USER_AGENTS = {
    desktop:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    mobile:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  };

  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'loc',
    isArray: (name) => ['url', 'sitemap'].includes(name),
  });

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.spider = new Spider({
      apiKey: this.configService.get('SPIDER_API_KEY'),
    });
  }

  async cleanup(): Promise<void> {
    // Wait for any pending operations to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Clear any pending timeouts
    if (typeof global.clearTimeout === 'function') {
      const highestId = Number(setTimeout(() => {}, 0));
      for (let i = 0; i < highestId; i++) {
        clearTimeout(i);
      }
    }
  }

  private async directFetch(
    urlInput: unknown,
    userAgent: string,
  ): Promise<string | null> {
    try {
      // Handle non-string inputs
      let urlStr: string;
      if (typeof urlInput !== 'string') {
        if (urlInput && typeof urlInput === 'object' && 'loc' in urlInput) {
          urlStr = (urlInput as { loc: string }).loc;
        } else {
          this.logger.warn('Invalid URL input:', urlInput);
          return null;
        }
      } else {
        urlStr = urlInput;
      }

      // Ensure URL has protocol
      if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
        urlStr = `https://${urlStr}`;
      }

      // Validate URL format
      try {
        new URL(urlStr);
      } catch {
        this.logger.warn('Invalid URL format:', urlStr);
        return null;
      }

      // Try HTTPS first
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(urlStr, {
          headers: {
            'User-Agent': userAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Handle different HTTP status codes
        if (response.status === 404) {
          this.logger.warn(`Website does not exist: ${urlStr}`);
          return null;
        }
        if (response.status === 403 || response.status === 401) {
          this.logger.warn(`Access denied (possibly blocking): ${urlStr}`);
          throw new Error('ACCESS_DENIED');
        }
        if (response.status === 429) {
          this.logger.warn(`Rate limited: ${urlStr}`);
          throw new Error('RATE_LIMITED');
        }
        if (response.status >= 500) {
          this.logger.warn(`Server error: ${urlStr}`);
          throw new Error('SERVER_ERROR');
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.text();
      } catch (error) {
        // If HTTPS fails, try HTTP
        if (urlStr.startsWith('https://')) {
          const httpUrl = urlStr.replace('https://', 'http://');
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          // Direct fetch without unnecessary try/catch
          const httpResponse = await fetch(httpUrl, {
            headers: {
              'User-Agent': userAgent,
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Cache-Control': 'no-cache',
            },
            signal: controller.signal,
          }).catch((httpError) => {
            // Let errors fall through to the outer catch
            clearTimeout(timeout);
            throw httpError;
          });

          clearTimeout(timeout);

          // Handle different HTTP status codes for HTTP attempt
          if (httpResponse.status === 404) {
            this.logger.warn(`Website does not exist: ${httpUrl}`);
            return null;
          }
          if (httpResponse.status === 403 || httpResponse.status === 401) {
            this.logger.warn(`Access denied (possibly blocking): ${httpUrl}`);
            throw new Error('ACCESS_DENIED');
          }
          if (httpResponse.status === 429) {
            this.logger.warn(`Rate limited: ${httpUrl}`);
            throw new Error('RATE_LIMITED');
          }
          if (httpResponse.status >= 500) {
            this.logger.warn(`Server error: ${httpUrl}`);
            throw new Error('SERVER_ERROR');
          }

          if (httpResponse.ok) {
            return await httpResponse.text();
          }
        }
        throw error;
      }
    } catch (error: unknown) {
      // Create a safe error object
      type ErrorWithProperties = {
        cause?: unknown;
        code?: string;
        name?: string;
        message?: string;
      };

      const errorObj: ErrorWithProperties =
        error instanceof Error ? error : { message: String(error) };

      const underlying: ErrorWithProperties = errorObj.cause || errorObj;

      const isNotFound =
        underlying.code === 'ENOTFOUND' ||
        underlying.code === 'ECONNREFUSED' ||
        (typeof underlying.message === 'string' &&
          underlying.message.includes('getaddrinfo ENOTFOUND'));

      const isTimeout =
        underlying.code === 'ETIMEDOUT' || underlying.name === 'AbortError';

      if (isNotFound) {
        this.logger.warn(
          `Website does not exist (DNS lookup failed): ${String(urlInput)}`,
        );
        return null;
      }

      if (isTimeout) {
        this.logger.warn(`Timeout fetching website: ${String(urlInput)}`);
        throw new Error('TIMEOUT');
      }

      if (underlying.message?.includes('fetch failed')) {
        this.logger.warn(`Fetch failed for ${String(urlInput)}`);
        throw new Error('FETCH_FAILED');
      }

      if (
        errorObj.message === 'ACCESS_DENIED' ||
        errorObj.message === 'RATE_LIMITED' ||
        errorObj.message === 'SERVER_ERROR'
      ) {
        throw new Error(errorObj.message);
      }

      this.logger.warn('Direct fetch failed:', error);
      throw new Error('FETCH_FAILED');
    }
  }

  private extractStructuredData($: cheerio.Root): Record<string, unknown>[] {
    const structuredData: Record<string, unknown>[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (!content) return;

        const data = JSON.parse(content) as
          | Record<string, unknown>
          | Record<string, unknown>[];
        if (Array.isArray(data)) {
          structuredData.push(...data);
        } else {
          structuredData.push(data);
        }
      } catch (error) {
        console.warn('Failed to parse JSON-LD:', error);
      }
    });

    return structuredData;
  }

  private extractMetaTags($: cheerio.Root): {
    title: string;
    description: string;
  } {
    const title = this.sanitizeText(
      $('title').text() ??
        $("meta[property='og:title']").attr('content') ??
        $("meta[name='twitter:title']").attr('content') ??
        '',
    );

    const description = this.sanitizeText(
      $('meta[name="description"]').attr('content') ??
        $('meta[property="og:description"]').attr('content') ??
        $('meta[name="twitter:description"]').attr('content') ??
        '',
    );

    return { title, description };
  }

  private extractPricing($: cheerio.Root): PriceData[] {
    const priceSelectors = [
      '[itemprop="price"]',
      '.price',
      '[data-price]',
      '[class*="price"]',
      '[id*="price"]',
      'span:contains("$"), span:contains("â‚¬"), span:contains("Â£")',
      'div:contains("USD"), div:contains("EUR"), div:contains("GBP")',
    ];

    const prices: PriceData[] = [];
    const now = new Date();
    const priceRegex =
      /(?<!\S)(?<currency>[$â‚¬Â£]|USD|EUR|GBP)?\s*([\d,.]*?\d+[\d,.]*)(?:\s*(?<currencySuffix>[$â‚¬Â£]|USD|EUR|GBP))?(?!\S)/;
    const decimalSeparator = /[.,](?=\d{2}$)/;
    const thousandsSeparator = /[.,](?=\d{3,}$)/;

    priceSelectors.forEach((selector) => {
      $(selector).each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();

        // Skip if element is hidden or part of navigation/footer
        if (
          $el.closest('nav, footer, header, script, style').length > 0 ||
          $el.css('display') === 'none' ||
          $el.css('visibility') === 'hidden' ||
          text.includes('@') // Skip email addresses
        )
          return;

        const match = priceRegex.exec(text);
        if (match?.groups) {
          let numericValue = match[2]
            .replace(thousandsSeparator, '')
            .replace(decimalSeparator, '.');

          // Handle European-style decimal commas
          if (
            numericValue.includes(',') &&
            numericValue.split(',')[1]?.length === 2
          ) {
            numericValue = numericValue.replace(',', '.');
          }

          const price = parseFloat(numericValue);
          const currency = (
            match.groups.currency ||
            match.groups.currencySuffix ||
            '$'
          )
            .replace('USD', '$')
            .replace('EUR', 'â‚¬')
            .replace('GBP', 'Â£');

          if (
            !isNaN(price) &&
            price > 0 &&
            price < 1000000 &&
            numericValue.split('.')[1]?.length <= 2
          ) {
            prices.push({
              price: Number(price.toFixed(2)),
              currency,
              timestamp: now,
              source: selector,
            });
          }
        }
      });
    });

    return prices;
  }

  private extractContactInfo($: cheerio.Root): { address?: string } {
    const contactInfo: { address?: string } = {};

    const addressData = this.extractStructuredData($).find(
      (data) =>
        (data['@type'] === 'PostalAddress' ||
          data['@type'] === 'LocalBusiness') &&
        'address' in data,
    );

    if (addressData) {
      // Type guard to make TypeScript happy
      type AddressObject = Record<string, unknown>;

      if (
        typeof addressData.address === 'object' &&
        addressData.address &&
        'streetAddress' in addressData.address
      ) {
        const addressObj = addressData.address as AddressObject;
        contactInfo.address = String(addressObj.streetAddress);
      } else if ('streetAddress' in addressData) {
        contactInfo.address = String(addressData.streetAddress);
      } else if (addressData.address) {
        contactInfo.address =
          typeof addressData.address === 'string'
            ? addressData.address
            : Object.values(addressData.address as Record<string, unknown>)
                .filter((v) => typeof v === 'string')
                .join(', ');
      }
    }

    // Fallback address extraction from content
    if (!contactInfo.address) {
      $('*:contains("Address:")').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 10 && text.includes(',') && !contactInfo.address) {
          contactInfo.address = text.replace('Address:', '').trim();
        }
      });
    }

    return contactInfo;
  }

  private async analyzeContentWithLLM(
    cleanedContent: string,
    structuredData: Record<string, unknown>[],
  ): Promise<{
    products: WebsiteContent['products'];
    services: WebsiteContent['services'];
  }> {
    const prompt = `Analyze this website content and extract products and services.
    
    Structured Data Available:
    ${JSON.stringify(structuredData, null, 2)}

    Guidelines:
    1. Look for clear product/service offerings with names and prices
    2. Categorize items appropriately
    3. Extract URLs when available
    4. Normalize currency to standard symbols ($, â‚¬, Â£)
    5. Include descriptions that explain the value proposition
    6. Group similar items under common categories
    
    Return ONLY a JSON object with this structure:
    {
      "products": [
        {
          "name": "Product Name",
          "url": "URL or null",
          "price": number or null,
          "currency": "USD/EUR/etc",
          "description": "Brief description or null",
          "category": "Product category or null"
        }
      ],
      "services": [
        {
          "name": "Service Name",
          "url": "URL or null",
          "price": number or null,
          "currency": "USD/EUR/etc",
          "description": "Brief description or null",
          "category": "Service category or null"
        }
      ]
    }

    Website Content:
    ${cleanedContent}`;

    const result = await this.modelManager.withBatchProcessing(
      async (llm: ChatGroq) => {
        return await llm.invoke(prompt);
      },
      prompt,
    );

    // Type for the parsed JSON result
    type ParsedWebsiteData = {
      products?: Array<{
        name: string;
        url?: string;
        price?: number;
        currency?: string;
        description?: string;
        category?: string;
      }>;
      services?: Array<{
        name: string;
        url?: string;
        price?: number;
        currency?: string;
        description?: string;
        category?: string;
      }>;
    };

    const content =
      typeof result.content === 'string'
        ? result.content
        : JSON.stringify(result.content);

    const jsonStr = JsonUtils.extractJSON(content, 'object');
    const parsed = JSON.parse(jsonStr) as ParsedWebsiteData;

    return {
      products: this.validateAndNormalizeOfferings(parsed.products ?? []),
      services: this.validateAndNormalizeOfferings(parsed.services ?? []),
    };
  }

  private validateAndNormalizeOfferings<T>(offerings: T[]): T[] {
    return offerings
      .filter((offering) => {
        try {
          const required = ['name'];
          const obj = offering as Record<string, unknown>;
          return required.every((field) => obj[field]);
        } catch {
          return false;
        }
      })
      .map((offering) => {
        const obj = offering as Record<string, unknown>;
        const normalized = {
          ...offering,
          price: obj.price || null,
          currency: obj.currency || 'USD',
          url: obj.url || null,
          description: obj.description || null,
          category: obj.category || null,
        };

        // Normalize currency symbols
        if (typeof normalized.currency === 'string') {
          normalized.currency = normalized.currency
            .replace('USD', '$')
            .replace('EUR', 'â‚¬')
            .replace('GBP', 'Â£');
        }

        return normalized as T;
      });
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/[\n\r\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private prepareTextForAnalysis(texts: string[], maxLength: number): string {
    const cleanedTexts = texts
      .map((text) => this.sanitizeText(text))
      .filter((text) => text.length > 0);

    let result = '';
    for (const text of cleanedTexts) {
      if (result.length + text.length <= maxLength) {
        result += text + ' ';
      } else {
        const remainingLength = maxLength - result.length;
        if (remainingLength > 0) {
          result += text.slice(0, remainingLength);
        }
        break;
      }
    }

    return result.trim();
  }

  private extractCleanText(html: string): string {
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script, style, noscript, iframe').remove();

    // Extract text from remaining elements
    const text = $('body').text();

    return this.sanitizeText(text);
  }

  private normalizeUrl(urlInput: unknown, protocol = 'https'): string {
    try {
      // Handle non-string inputs
      let urlStr: string;
      if (typeof urlInput !== 'string') {
        if (urlInput && typeof urlInput === 'object' && 'loc' in urlInput) {
          urlStr = (urlInput as { loc: string }).loc;
        } else {
          this.logger.warn('Invalid URL input:', urlInput);
          return '';
        }
      } else {
        urlStr = urlInput;
      }

      urlStr = urlStr.trim();

      try {
        return new URL(urlStr).toString();
      } catch {
        // If parsing fails, assume it's a domain name
        if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
          urlStr = `${protocol}://${urlStr}`;
        }
        return new URL(urlStr).toString();
      }
    } catch {
      this.logger.warn('Failed to normalize URL:', urlInput);
      return typeof urlInput === 'string' ? urlInput : '';
    }
  }

  private getDomainFromUrl(url: string): string {
    try {
      const parsed = new URL(this.normalizeUrl(url));
      return parsed.hostname.replace(/^www\./, '');
    } catch (error: unknown) {
      console.warn(
        'Failed to get domain from URL:',
        url,
        error instanceof Error ? error.message : String(error),
      );
      return url.replace(/^www\./, '');
    }
  }

  async fetchRobotsTxt(domain: string): Promise<RobotsData | null> {
    try {
      const baseUrl = this.normalizeUrl(domain);
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const response = await this.directFetch(
        robotsUrl,
        this.USER_AGENTS.desktop,
      );

      if (!response) return null;

      // Type-safe robotsParser handling
      type RobotsParserFunction = (url: string, content: string) => Robot;

      // Handle both ESM and CommonJS import formats of robots-parser
      let parserFunction: RobotsParserFunction;
      if (
        typeof (robotsParser as unknown as { default?: RobotsParserFunction })
          .default === 'function'
      ) {
        parserFunction = (
          robotsParser as unknown as { default: RobotsParserFunction }
        ).default;
      } else {
        parserFunction = robotsParser as unknown as RobotsParserFunction;
      }

      const robots: Robot = parserFunction(robotsUrl, response);

      // Parse robots.txt content directly
      const lines = response.split('\n');
      const disallowedPaths: string[] = [];
      const allowedPaths: string[] = [];

      lines.forEach((line) => {
        const [directive, ...pathParts] = line.split(':').map((p) => p.trim());
        const path = pathParts.join(':');

        if (directive.toLowerCase() === 'disallow' && path) {
          disallowedPaths.push(path);
        } else if (directive.toLowerCase() === 'allow' && path) {
          allowedPaths.push(path);
        }
      });

      return {
        sitemaps: robots.getSitemaps() || [],
        allowedPaths: allowedPaths.length ? allowedPaths : ['/'],
        disallowedPaths,
        crawlDelay: robots.getCrawlDelay('*') ?? undefined,
      };
    } catch (error) {
      this.logger.warn('Failed to fetch robots.txt:', error);
      return null;
    }
  }

  private async fetchSitemap(url: string): Promise<SitemapData[]> {
    try {
      const response = await this.directFetch(url, this.USER_AGENTS.desktop);
      if (!response) return [];

      // Handle plain text sitemaps (one URL per line)
      if (!response.trim().startsWith('<?xml')) {
        return response
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && line.includes('http'))
          .map((loc) => ({ loc }));
      }

      // Parse XML to object
      let parsed: Record<string, unknown>;
      try {
        parsed = this.xmlParser.parse(response) as Record<string, unknown>;
      } catch (error) {
        this.logger.warn(`Failed to parse sitemap XML ${url}:`, error);
        return [];
      }

      // Handle sitemap index files
      if (parsed.sitemapindex && typeof parsed.sitemapindex === 'object') {
        const sitemapIndex = parsed.sitemapindex as Record<string, unknown>;

        if (sitemapIndex.sitemap && Array.isArray(sitemapIndex.sitemap)) {
          const sitemaps: Promise<SitemapData[]>[] = [];

          for (const sitemap of sitemapIndex.sitemap) {
            if (!sitemap || typeof sitemap !== 'object') continue;

            let loc: string | undefined;
            const sitemapObj = sitemap as Record<string, unknown>;

            if (typeof sitemapObj.loc === 'string') {
              loc = sitemapObj.loc;
            } else if (sitemapObj.loc && typeof sitemapObj.loc === 'object') {
              const locObj = sitemapObj.loc as Record<string, unknown>;
              if (typeof locObj.loc === 'string') {
                loc = locObj.loc;
              }
            }

            if (loc) {
              sitemaps.push(this.fetchSitemap(loc));
            }
          }

          const results = await Promise.all(sitemaps);
          return results.flat();
        }
      }

      // Handle regular sitemaps
      if (parsed.urlset && typeof parsed.urlset === 'object') {
        const urlset = parsed.urlset as Record<string, unknown>;

        if (urlset.url && Array.isArray(urlset.url)) {
          const entries: SitemapData[] = [];

          for (const entry of urlset.url) {
            if (!entry || typeof entry !== 'object') continue;

            const entryObj = entry as Record<string, unknown>;
            let loc: string | undefined;

            if (typeof entryObj.loc === 'string') {
              loc = entryObj.loc;
            } else if (entryObj.loc && typeof entryObj.loc === 'object') {
              const locObj = entryObj.loc as Record<string, unknown>;
              if (typeof locObj.loc === 'string') {
                loc = locObj.loc;
              }
            }

            if (!loc) continue;

            let priority: number | undefined;
            if (entryObj.priority && typeof entryObj.priority === 'string') {
              const parsedPriority = parseFloat(entryObj.priority);
              if (!isNaN(parsedPriority)) {
                priority = parsedPriority;
              }
            }

            entries.push({
              loc,
              lastmod:
                typeof entryObj.lastmod === 'string'
                  ? entryObj.lastmod
                  : undefined,
              changefreq:
                typeof entryObj.changefreq === 'string'
                  ? entryObj.changefreq
                  : undefined,
              priority,
            });
          }

          return entries;
        }
      }

      return [];
    } catch (error) {
      this.logger.warn(`Failed to fetch sitemap ${url}:`, error);
      return [];
    }
  }

  async discoverSitemaps(domain: string): Promise<SitemapData[]> {
    const results: SitemapData[] = [];
    const processed = new Set<string>();

    // Try robots.txt first
    const robotsData = await this.fetchRobotsTxt(domain);
    const sitemapUrls = new Set<string>();

    if (robotsData?.sitemaps) {
      robotsData.sitemaps
        .filter((url): url is string => typeof url === 'string')
        .forEach((url) => sitemapUrls.add(this.normalizeUrl(url)));
    }

    // Try common sitemap locations
    const baseUrl = this.normalizeUrl(domain);
    const commonLocations = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap/sitemap.xml',
      '/sitemaps/sitemap.xml',
      '/product-sitemap.xml',
      '/products-sitemap.xml',
      '/category-sitemap.xml',
    ];

    for (const path of commonLocations) {
      try {
        sitemapUrls.add(new URL(path, baseUrl).toString());
      } catch (error) {
        this.logger.warn(`Failed to construct sitemap URL for ${path}:`, error);
      }
    }

    // Fetch all discovered sitemaps
    for (const url of sitemapUrls) {
      if (processed.has(url)) continue;
      processed.add(url);

      const entries = await this.fetchSitemap(url);
      results.push(...entries);
    }

    // Type-safe de-duplication
    return [...new Set(results.map((r) => JSON.stringify(r)))].map(
      (r): SitemapData => JSON.parse(r) as SitemapData,
    );
  }

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    this.logger.debug(`Starting website content discovery for ${domain}`);
    let retries = 0;

    // Normalize domain format
    domain = this.normalizeUrl(domain);

    while (retries < this.MAX_RETRIES) {
      try {
        // First attempt: Direct fetch with desktop user agent
        let html = await this.directFetch(domain, this.USER_AGENTS.desktop);

        // If website doesn't exist, return early with empty content
        if (html === null) {
          this.logger.warn(`Website ${domain} does not exist`);
          return {
            url: domain,
            title: '',
            description: '',
            products: [],
            services: [],
            categories: [],
            keywords: [],
            mainContent: '',
            metadata: {
              structuredData: [],
              contactInfo: {},
              prices: [],
            },
          };
        }

        // Second attempt: Direct fetch with mobile user agent
        if (!html) {
          html = await this.directFetch(domain, this.USER_AGENTS.mobile);
        }

        // Final attempt: Use spider if direct fetches fail
        if (!html) {
          this.logger.debug('Direct fetches failed, using spider');
          try {
            const spiderResult = await this.spider.crawlUrl(domain, {
              limit: 1,
              store_data: true,
              metadata: true,
              request: 'smart',
              headers: { 'User-Agent': this.USER_AGENTS.desktop },
            });

            if (Array.isArray(spiderResult) && spiderResult.length > 0) {
              const firstResult = spiderResult[0];
              html = firstResult?.content ?? null;
            }
          } catch {
            this.logger.debug(
              'Spider crawl failed, continuing with other methods',
            );
          }
        }

        if (!html) {
          throw new Error('FETCH_FAILED');
        }

        const $ = cheerio.load(html);

        // Clean and prepare text
        const cleanedText = this.prepareTextForAnalysis(
          [this.extractCleanText(html)],
          this.MAX_TEXT_LENGTH,
        );

        // Initialize content structure
        const content: WebsiteContent = {
          url: domain,
          title: '',
          description: '',
          products: [],
          services: [],
          categories: [],
          keywords: [],
          mainContent: '',
          metadata: {
            structuredData: [],
            contactInfo: {},
            prices: [],
          },
        };

        // Extract metadata
        const metaTags = this.extractMetaTags($);
        content.title = metaTags.title;
        content.description = metaTags.description;

        // Extract structured data
        const structuredData = this.extractStructuredData($);
        content.metadata!.structuredData = structuredData;

        // Extract contact info
        content.metadata!.contactInfo = this.extractContactInfo($);

        // Extract pricing
        content.metadata!.prices = this.extractPricing($);

        // Analyze content with LLM
        const offerings = await this.analyzeContentWithLLM(
          cleanedText,
          structuredData,
        );
        content.products = offerings.products;
        content.services = offerings.services;

        this.logger.debug(`Website content discovery completed for ${domain}`);
        return content;
      } catch (error: unknown) {
        // Type guard for Error objects
        if (!(error instanceof Error)) {
          this.logger.warn(
            `Unknown error type for ${domain}: ${String(error)}`,
          );
          retries++;
          continue;
        }

        // Handle specific error cases
        if (error.message === 'ACCESS_DENIED') {
          this.logger.warn(`Access denied for ${domain}`);
          break;
        }

        if (error.message === 'RATE_LIMITED' && retries < this.MAX_RETRIES) {
          const delay = Math.pow(2, retries) * this.RETRY_DELAY;
          this.logger.warn(
            `Rate limited by ${domain}, waiting ${delay / 1000}s before retry`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          retries++;
          continue;
        }

        // Handle DNS and network errors
        if (
          ('code' in error && error.code === 'ENOTFOUND') ||
          error.message.includes('getaddrinfo ENOTFOUND')
        ) {
          this.logger.warn(`Domain not found: ${domain}`);
          break;
        }

        if (
          ('code' in error && error.code === 'ETIMEDOUT') ||
          error.name === 'AbortError'
        ) {
          this.logger.warn(`Connection timed out: ${domain}`);
        }

        retries++;
        if (retries < this.MAX_RETRIES) {
          this.logger.debug(
            `Attempt ${retries} failed, retrying in ${this.RETRY_DELAY / 1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
          continue;
        }

        this.logger.warn(
          `Failed to discover website content for ${domain} after ${retries} attempts`,
        );
      }
    }

    // Return empty content for failed attempts
    return {
      url: domain,
      title: '',
      description: '',
      products: [],
      services: [],
      categories: [],
      keywords: [],
      mainContent: '',
      metadata: {
        structuredData: [],
        contactInfo: {},
        prices: [],
      },
    };
  }

  async deepCrawlCompetitor(
    domain: string,
    robotsData: RobotsData | null,
  ): Promise<WebsiteContent> {
    this.logger.log(`Starting deep crawl for ${domain}`);
    const urls = new Set<string>();
    const crawled = new Set<string>();
    const maxUrls = 100; // Limit to prevent excessive crawling

    // Start with sitemap URLs if available
    const sitemapData = await this.discoverSitemaps(domain);
    sitemapData
      .filter((entry) => typeof entry.loc === 'string')
      .forEach((entry) => urls.add(this.normalizeUrl(entry.loc)));

    // Add homepage if no sitemap
    if (urls.size === 0) {
      urls.add(this.normalizeUrl(domain));
    }

    const results: WebsiteContent[] = [];

    for (const url of urls) {
      if (crawled.size >= maxUrls) break;
      if (crawled.has(url)) continue;

      // Check robots.txt rules with more lenient approach
      if (robotsData) {
        try {
          const urlPath = new URL(url).pathname;

          // Skip only if path matches a disallow rule AND doesn't match any allow rule
          const isDisallowed = robotsData.disallowedPaths.some((pattern) => {
            // Convert wildcard pattern to regex
            const regexPattern = pattern
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            return new RegExp(`^${regexPattern}`).test(urlPath);
          });

          const isAllowed = robotsData.allowedPaths.some((pattern) => {
            const regexPattern = pattern
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            return new RegExp(`^${regexPattern}`).test(urlPath);
          });

          if (isDisallowed && !isAllowed) {
            this.logger.debug(`Skipping explicitly disallowed path: ${url}`);
            continue;
          }
        } catch {
          this.logger.debug(`Failed to check robots.txt rules for ${url}`);
        }
      }

      try {
        crawled.add(url);
        this.logger.debug(`Crawling ${url} (${crawled.size}/${maxUrls})`);

        const content = await this.discoverWebsiteContent(url);
        results.push(content);

        // Respect crawl delay if specified
        if (robotsData?.crawlDelay) {
          await new Promise((resolve) =>
            setTimeout(resolve, (robotsData.crawlDelay ?? 1) * 1000),
          );
        }
      } catch (error) {
        // Handle expected errors with simple messages
        if (error instanceof Error) {
          if (error.message === 'WEBSITE_NOT_FOUND') {
            this.logger.warn(`Website ${url} does not exist`);
          } else if (error.message === 'ACCESS_DENIED') {
            this.logger.warn(`Access denied for ${url}`);
          } else if (error.message === 'RATE_LIMITED') {
            this.logger.warn(`Rate limited by ${url}`);
          } else if (error.message.includes('ENOTFOUND')) {
            this.logger.warn(`Domain not found: ${url}`);
          } else if (error.message.includes('ETIMEDOUT')) {
            this.logger.warn(`Connection timed out: ${url}`);
          } else {
            // Only log full stack trace for unexpected errors
            this.logger.error(`Failed to crawl ${url}:`, error.stack);
          }
        }
      }
    }

    if (results.length === 0) {
      this.logger.warn(`No content could be crawled for ${domain}`);
      return {
        url: this.normalizeUrl(domain),
        title: '',
        description: '',
        products: [],
        services: [],
        categories: [],
        keywords: [],
        mainContent: '',
        metadata: {
          structuredData: [],
          contactInfo: {},
          prices: [],
        },
      };
    }

    // Merge all discovered content
    return {
      url: this.normalizeUrl(domain),
      title: results[0]?.title ?? '',
      description: results[0]?.description ?? '',
      products: this.validateAndNormalizeOfferings(
        results.flatMap((r) => r.products ?? []),
      ),
      services: this.validateAndNormalizeOfferings(
        results.flatMap((r) => r.services ?? []),
      ),
      categories: [...new Set(results.flatMap((r) => r.categories ?? []))],
      keywords: [...new Set(results.flatMap((r) => r.keywords ?? []))],
      mainContent: results.map((r) => r.mainContent ?? '').join('\n'),
      metadata: {
        structuredData: results.flatMap(
          (r) => r.metadata?.structuredData ?? [],
        ),
        contactInfo: results[0]?.metadata?.contactInfo ?? {},
        prices: results.flatMap((r) => r.metadata?.prices ?? []),
      },
    };
  }
}
-e 
```
-e 

# src/microservices/src/website/website.controller.ts
```
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { WebsiteService } from './website.service';
import type { WebsiteContent } from '../interfaces/website-content.interface';

@Controller()
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @MessagePattern('discover_website_content')
  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    return this.websiteService.discoverWebsiteContent(domain);
  }
}
-e 
```
-e 

# src/microservices/src/website/website.module.ts
```
import { Module } from '@nestjs/common';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';
import { WebsiteDiscoveryService } from './services/website-discovery.service';
import { ModelManagerService } from '@shared/services/model-manager.service';

@Module({
  controllers: [WebsiteController],
  providers: [WebsiteService, WebsiteDiscoveryService, ModelManagerService],
  exports: [WebsiteDiscoveryService],
})
export class WebsiteModule {}
-e 
```
-e 

# src/microservices/src/website/website.service.ts
```
import { Injectable } from '@nestjs/common';
import { WebsiteDiscoveryService } from './services/website-discovery.service';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import type { WebsiteContent } from '../interfaces/website-content.interface';

@Injectable()
export class WebsiteService {
  constructor(
    private readonly websiteDiscoveryService: WebsiteDiscoveryService,
    private readonly configService: ConfigService,
  ) {}

  static getOptions(configService: ConfigService) {
    const redisUrl = configService.getOrThrow<string>('REDIS_URL');
    const url = new URL(redisUrl);
    return {
      transport: Transport.REDIS,
      options: {
        host: url.hostname,
        port: Number(url.port),
        retryAttempts: 5,
        retryDelay: 3000,
      },
    };
  }

  async onModuleInit() {
    // Initialize microservice-specific setup
  }

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    return this.websiteDiscoveryService.discoverWebsiteContent(domain);
  }
}

// Bootstrap the microservice if running standalone
if (require.main === module) {
  // Use dynamic imports to avoid top-level import issues
  async function bootstrap() {
    const { NestFactory } = await import('@nestjs/core');
    const { WebsiteModule } = await import('./website.module');
    const { ConfigService } = await import('@nestjs/config');

    const app = await NestFactory.createMicroservice(
      WebsiteModule,
      WebsiteService.getOptions(new ConfigService()),
    );
    await app.listen();
  }
  void bootstrap();
}
-e 
```
-e 

# src/microservices/start-redis.sh
```
#!/usr/bin/env bash
# Use this script to start a docker container for a local Redis instance

REDIS_CONTAINER_NAME="sagelytics-redis"

if ! [ -x "$(command -v docker)" ]; then
  echo -e "Docker is not installed. Please install docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker info > /dev/null 2>&1; then
  echo "Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

if [ "$(docker ps -q -f name=$REDIS_CONTAINER_NAME)" ]; then
  echo "Redis container '$REDIS_CONTAINER_NAME' already running"
  exit 0
fi

if [ "$(docker ps -q -a -f name=$REDIS_CONTAINER_NAME)" ]; then
  docker start "$REDIS_CONTAINER_NAME"
  echo "Existing Redis container '$REDIS_CONTAINER_NAME' started"
  exit 0
fi

# import env variables from .env
set -a
source .env

REDIS_PORT=$(echo "$REDIS_URL" | awk -F':' '{print $3}' | awk -F'/' '{print $1}')
REDIS_PORT=${REDIS_PORT:-6379}

docker run -d \
  --name $REDIS_CONTAINER_NAME \
  -p "$REDIS_PORT":6379 \
  -v redis_data:/data \
  redis:7-alpine \
  redis-server --appendonly yes && echo "Redis container '$REDIS_CONTAINER_NAME' was successfully created" -e 
```
-e 

# src/microservices/test/app.e2e-spec.ts
```
import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
-e 
```
-e 

# src/microservices/test/jest-e2e.json
```
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
-e 
```
-e 

# src/microservices/tsconfig.build.json
```
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
-e 
```
-e 

# src/microservices/tsconfig.json
```
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@shared/*": ["src/shared/*"]
    }
  }
}
-e 
```
-e 

# src/server/api/root.ts
```
import { postRouter } from '~/server/api/routers/post';
import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';
import { competitorRouter } from './routers/competitor';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  competitor: competitorRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
-e 
```
-e 

# src/server/api/routers/competitor.ts
```
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import {
  competitors,
  userCompetitors,
  userOnboarding,
  type CompetitorMetadata,
} from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { MetricsService } from '~/lib/metrics-service';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import type { DashboardData, CompetitorBase, Product } from '~/lib/types/dashboard';
import { CompetitorInsight } from '~/microservices/src/competitor/interfaces/competitor-insight.interface';

export const competitorRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }): Promise<DashboardData> => {
    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true },
    });

    const competitors: CompetitorBase[] = userCompetitorsList.map((uc) => {
      // Map database product format to UI product format
      const metadata = uc.competitor.metadata;
      const products: Product[] = (metadata?.products ?? []).map((p) => ({
        name: p.name ?? '',
        lastUpdated: p.lastUpdated ?? new Date().toISOString(),
        url: p.url ?? '',
        price: p.price ?? null,
        currency: p.currency ?? 'USD',
        // Convert string[] to MatchedProductUI[]
        matchedProducts: p.matchedProducts.map((m) => typeof m === 'string' 
          ? { name: m, url: '', matchScore: 0, priceDiff: null } 
          : {
              name: (m as unknown as { name: string }).name ?? '',
              url: (m as unknown as { url: string }).url ?? '',
              matchScore: (m as unknown as { matchScore: number }).matchScore ?? 0,
              priceDiff: (m as unknown as { priceDiff: number | null }).priceDiff ?? null,
            }
        ),
      }));

      return {
        domain: uc.competitor.domain,
        matchScore: metadata?.matchScore ?? 0,
        matchReasons: metadata?.matchReasons ?? [],
        suggestedApproach: metadata?.suggestedApproach ?? '',
        dataGaps: metadata?.dataGaps ?? [],
        products,
      };
    });

    return {
      competitors,
      priceData: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Your Price',
            data: [100, 105, 102, 108],
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            borderWidth: 1,
          },
          ...competitors.map((competitor, index) => ({
            label: competitor.domain,
            data: generateMockPriceData(),
            borderColor: `rgb(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100})`,
            backgroundColor: `rgba(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100}, 0.5)`,
            borderWidth: 1,
          })),
        ],
      },
      insights: generateCompetitorInsights(competitors.map((c) => c.domain)),
    };
  }),

  getRelevantMetrics: protectedProcedure.query(async ({ ctx }) => {
    const metricsService = new MetricsService();
    return metricsService.getRelevantMetrics(ctx.session.user.id);
  }),

  getComparisons: protectedProcedure
    .input(z.object({ metric: z.string() }))
    .query(async ({ ctx, input }) => {
      const metricsService = new MetricsService();
      return metricsService.calculateMetricComparison(input.metric, ctx.session.user.id);
    }),

  add: protectedProcedure
    .input(
      z.object({
        url: z.string().transform((url) => {
          try {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = `https://${url}`;
            }
            const parsed = new URL(url);
            parsed.hostname = parsed.hostname.replace(/^www\./, '');
            return parsed.toString();
          } catch {
            throw new Error('Invalid URL format');
          }
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = input.url;
      const onboarding = await ctx.db.query.userOnboarding.findFirst({
        where: eq(userOnboarding.userId, ctx.session.user.id),
      });

      if (!onboarding) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Complete onboarding first',
        });
      }

      // Get existing competitors for context
      const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
        where: eq(userCompetitors.userId, ctx.session.user.id),
        with: { competitor: true },
      });

      const currentCompetitorDomains: string[] = userCompetitorsList.map(
        (uc) => uc.competitor.domain,
      );

      // Analyze competitor using microservice
      const microserviceClient = MicroserviceClient.getInstance();
      
      // Use analyzeCompetitor instead of discoverCompetitors for single competitor analysis
      const competitorInsightResponse = await microserviceClient.analyzeCompetitor({
        competitorDomain: domain,
        businessContext: {
          businessType: onboarding.businessType ?? '',
          userProducts: [], // Pass empty array as products aren't in onboarding schema
        },
      });

      if (!competitorInsightResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Could not analyze this competitor',
        });
      }

      // Cast to any to work around type issues
      const competitorInsight = competitorInsightResponse as unknown as CompetitorInsight;

      // Transform the competitor insight into CompetitorMetadata
      const metadata: CompetitorMetadata = {
        matchScore: competitorInsight.matchScore ?? 0,
        matchReasons: competitorInsight.matchReasons ?? [],
        suggestedApproach: competitorInsight.suggestedApproach ?? '',
        dataGaps: competitorInsight.dataGaps ?? [],
        lastAnalyzed: new Date().toISOString(),
        platforms: Array.isArray(competitorInsight.listingPlatforms) 
          ? competitorInsight.listingPlatforms.map((p) => ({
              platform: p.platform ?? '',
              url: p.url ?? '',
              metrics: {
                rating: p.rating ?? undefined,
                reviewCount: p.reviewCount ?? undefined,
                priceRange: p.priceRange
                  ? {
                      min: p.priceRange.min ?? 0,
                      max: p.priceRange.max ?? 0,
                      currency: p.priceRange.currency ?? 'USD',
                    }
                  : undefined,
                lastUpdated: new Date().toISOString(),
              },
            }))
          : [],
        products: Array.isArray(competitorInsight.products) 
          ? competitorInsight.products.map((p) => ({
              name: p.name ?? '',
              url: p.url ?? '',
              price: p.price ?? 0,
              currency: p.currency ?? 'USD',
              platform: 'unknown',
              matchedProducts: Array.isArray(p.matchedProducts) 
                ? p.matchedProducts.map((m: { name?: string }) => m.name ?? '')
                : [],
              lastUpdated: p.lastUpdated ?? new Date().toISOString(),
            }))
          : [],
      };

      const competitorRecords = await ctx.db
        .insert(competitors)
        .values({
          domain: domain,
          metadata,
        })
        .onConflictDoNothing()
        .returning();

      const competitor =
        competitorRecords[0] ??
        (await ctx.db.query.competitors.findFirst({
          where: eq(competitors.domain, domain),
        }));

      if (!competitor) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create or find competitor',
        });
      }

      await ctx.db
        .insert(userCompetitors)
        .values({
          userId: ctx.session.user.id,
          competitorId: competitor.id,
          relationshipStrength: Math.round(competitorInsight.matchScore * 5), // Convert 0-1 score to 0-5 scale
        })
        .onConflictDoNothing();

      return { success: true };
    }),

  remove: protectedProcedure
    .input(
      z.object({
        url: z.string().transform((domain) => domain.toLowerCase().trim()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = input.url;
      const competitor = await ctx.db.query.competitors.findFirst({
        where: eq(competitors.domain, domain),
      });

      if (!competitor) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competitor not found',
        });
      }

      await ctx.db
        .delete(userCompetitors)
        .where(
          and(
            eq(userCompetitors.userId, ctx.session.user.id),
            eq(userCompetitors.competitorId, competitor.id),
          ),
        );

      return { success: true };
    }),

  rediscover: protectedProcedure.mutation(async ({ ctx }) => {
    const onboarding = await ctx.db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, ctx.session.user.id),
    });

    if (!onboarding) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Complete onboarding first',
      });
    }

    if (!onboarding.productCatalogUrl) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Product catalog URL is required',
      });
    }

    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true },
    });

    const currentCompetitorDomains: string[] = userCompetitorsList.map(
      (uc: { competitor: { domain: string } }) => uc.competitor.domain,
    );

    // Normalize user's domain for comparison
    const userDomain = onboarding.companyDomain.toLowerCase().replace(/^www\./, '');
    const userCatalogDomain = new URL(onboarding.productCatalogUrl).hostname
      .toLowerCase()
      .replace(/^www\./, '');

    const microserviceClient = MicroserviceClient.getInstance();
    const discoveryResult = await microserviceClient.discoverCompetitors({
      domain: onboarding.companyDomain,
      userId: ctx.session.user.id,
      businessType: onboarding.businessType,
      knownCompetitors: currentCompetitorDomains,
      productCatalogUrl: onboarding.productCatalogUrl,
    });

    // Filter out user's own domains from competitors
    const filteredCompetitors = discoveryResult.competitors.filter((competitor) => {
      const competitorDomain = competitor.domain.toLowerCase().replace(/^www\./, '');
      return (
        competitorDomain !== userDomain &&
        competitorDomain !== userCatalogDomain &&
        !competitorDomain.endsWith(`.${userDomain}`) && // Subdomains
        !userDomain.endsWith(`.${competitorDomain}`)
      ); // Parent domains
    });

    // Process each discovered competitor
    for (const competitorInsight of filteredCompetitors) {
      // Transform insight into CompetitorMetadata format
      const metadata = {
        matchScore: competitorInsight.matchScore,
        matchReasons: competitorInsight.matchReasons,
        suggestedApproach: competitorInsight.suggestedApproach,
        dataGaps: competitorInsight.dataGaps,
        lastAnalyzed: new Date().toISOString(),
        platforms: competitorInsight.listingPlatforms.map((p) => ({
          platform: p.platform,
          url: p.url,
          metrics: {
            rating: p.rating ?? undefined,
            reviewCount: p.reviewCount ?? undefined,
            priceRange: p.priceRange
              ? {
                  min: p.priceRange.min,
                  max: p.priceRange.max,
                  currency: p.priceRange.currency,
                }
              : undefined,
            lastUpdated: new Date().toISOString(),
          },
        })),
        products: competitorInsight.products
          // Filter out products that match user's domain
          .filter((p) => {
            const productUrl = p.url
              ? new URL(p.url).hostname.toLowerCase().replace(/^www\./, '')
              : '';
            return (
              productUrl !== userDomain &&
              productUrl !== userCatalogDomain &&
              !productUrl.endsWith(`.${userDomain}`) &&
              !userDomain.endsWith(`.${productUrl}`)
            );
          })
          .map((p) => ({
            name: p.name,
            url: p.url ?? '',
            price: p.price ?? 0,
            currency: p.currency ?? 'USD',
            platform: 'unknown',
            matchedProducts: p.matchedProducts.map((m) => m.name),
            lastUpdated: p.lastUpdated,
          })),
      } satisfies CompetitorMetadata;

      // Skip if no valid products after filtering
      if (metadata.products.length === 0) continue;

      // Insert competitor if not exists
      const competitorRecords = await ctx.db
        .insert(competitors)
        .values({
          domain: competitorInsight.domain,
          metadata,
        })
        .onConflictDoNothing()
        .returning();

      const competitor =
        competitorRecords[0] ??
        (await ctx.db.query.competitors.findFirst({
          where: eq(competitors.domain, competitorInsight.domain),
        }));

      if (!competitor) continue;

      // Link competitor to user if not already linked
      await ctx.db
        .insert(userCompetitors)
        .values({
          userId: ctx.session.user.id,
          competitorId: competitor.id,
          relationshipStrength: Math.round(competitorInsight.matchScore * 5), // Convert 0-1 score to 0-5 scale
        })
        .onConflictDoNothing();
    }

    return {
      success: true,
      stats: {
        ...discoveryResult.stats,
        totalDiscovered: filteredCompetitors.length, // Update with filtered count
      },
      recommendedSources: discoveryResult.recommendedSources,
    };
  }),
});

function generateMockPriceData(): number[] {
  return Array.from({ length: 4 }, () => Math.round(95 + Math.random() * 15));
}

function generateCompetitorInsights(competitors: string[]) {
  return competitors.map((competitor) => ({
    product: competitor,
    recommendation: Math.random() > 0.5 ? 'increase' : 'decrease',
    message: `Consider ${Math.random() > 0.5 ? 'increasing' : 'decreasing'} prices to match ${competitor}`,
    reason: `${competitor} has shown consistent ${Math.random() > 0.5 ? 'higher' : 'lower'} pricing in this category`,
  }));
}
-e 
```
-e 

# src/server/api/routers/post.ts
```
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure, publicProcedure } from '~/server/api/trpc';
import { posts } from '~/server/db/schema';

export const postRouter = createTRPCRouter({
  hello: publicProcedure.input(z.object({ text: z.string() })).query(({ input }) => {
    return {
      greeting: `Hello ${input.text}`,
    };
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(posts).values({
        name: input.name,
        createdById: ctx.session.user.id,
      });
    }),

  getLatest: protectedProcedure.query(async ({ ctx }) => {
    const post = await ctx.db.query.posts.findFirst({
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });

    return post ?? null;
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return 'you can now see this secret message!';
  }),
});
-e 
```
-e 

# src/server/api/trpc.ts
```
/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';

import { auth } from '~/server/auth';
import { db } from '~/server/db';

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(timingMiddleware).use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
-e 
```
-e 

# src/server/auth/config.ts
```
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { type DefaultSession, type NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { db } from '~/server/db';
import { accounts, sessions, users, verificationTokens } from '~/server/db/schema';
import { env } from '~/env';

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
      onboardingCompleted: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    // ...other properties
    // role: UserRole;
    onboardingCompleted?: boolean;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET,
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    session: async ({ session, user }) => {
      const dbUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, user.id),
      });

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          onboardingCompleted: dbUser?.onboardingCompleted ?? false,
        },
      };
    },
  },
} satisfies NextAuthConfig;
-e 
```
-e 

# src/server/auth/index.ts
```
import NextAuth from 'next-auth';
import { cache } from 'react';

import { authConfig } from './config';

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
-e 
```
-e 

# src/server/db/index.ts
```
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '~/env';
import * as schema from './schema';

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
-e 
```
-e 

# src/server/db/schema.ts
```
import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  varchar,
  boolean,
  jsonb,
  uuid,
  unique,
} from 'drizzle-orm/pg-core';
import { type AdapterAccount } from 'next-auth/adapters';

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `sg_${name}`);

export const posts = createTable(
  'post',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    name: varchar('name', { length: 256 }),
    createdById: varchar('created_by', { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (example) => ({
    createdByIdIdx: index('created_by_idx').on(example.createdById),
    nameIndex: index('name_idx').on(example.name),
  }),
);

export const users = createTable('user', {
  id: varchar('id', { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified', {
    mode: 'date',
    precision: 3,
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar('image', { length: 255 }),
  onboardingCompleted: boolean('onboarding_completed').default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = createTable(
  'account',
  {
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar('type', { length: 255 }).$type<AdapterAccount['type']>().notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index('account_user_id_idx').on(account.userId),
  }),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  'session',
  {
    sessionToken: varchar('session_token', { length: 255 }).notNull().primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp('expires', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  (session) => ({
    userIdIdx: index('session_user_id_idx').on(session.userId),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  'verification_token',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const userOnboarding = createTable('user_onboarding', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id),
  companyDomain: varchar('company_domain', { length: 255 }).notNull(),
  productCatalogUrl: text('product_catalog_url'),
  businessType: varchar('business_type').notNull(),
  metricConfig: text('metric_config').$type<Record<string, boolean>>(),
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  identifiedCompetitors: text('identified_competitors').$type<string[]>(),
});

export const businessTypes = createTable('business_type', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  requiredMetrics: text('required_metrics').$type<string[]>(),
});

export const metricConfig = createTable(
  'metric_config',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id),
    businessType: varchar('business_type').references(() => businessTypes.id),
    enabledMetrics: text('enabled_metrics').$type<string[]>(),
    lastUpdated: timestamp('last_updated').defaultNow(),
  },
  (table) => ({
    businessTypeIdx: index('metric_config_business_type_idx').on(table.businessType),
  }),
);

export type PlatformData = {
  platform: string;
  url: string;
  metrics: {
    sales?: number;
    reviews?: number;
    rating?: number;
    priceRange?: {
      min: number;
      max: number;
      currency: string;
    };
    lastUpdated: string;
  };
};

export type CompetitorMetadata = {
  matchScore: number;
  matchReasons: string[];
  suggestedApproach: string;
  dataGaps: string[];
  lastAnalyzed: string;
  platforms: PlatformData[];
  products: {
    name: string;
    url: string;
    price: number;
    currency: string;
    platform: string;
    matchedProducts: string[];
    lastUpdated: string;
  }[];
};

export const competitors = createTable('competitors', {
  id: uuid('id').defaultRandom().primaryKey(),
  domain: text('domain').notNull().unique(),
  metadata: jsonb('metadata').$type<CompetitorMetadata>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userCompetitors = createTable(
  'user_competitors',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id),
    competitorId: uuid('competitor_id')
      .notNull()
      .references(() => competitors.id),
    relationshipStrength: integer('relationship_strength').default(1),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userCompetitorUnique: unique('uc_user_competitor').on(table.userId, table.competitorId),
    userIdIdx: index('idx_uc_user').on(table.userId),
    competitorIdIdx: index('idx_uc_competitor').on(table.competitorId),
  }),
);

export const competitorsRelations = relations(competitors, ({ many }) => ({
  userCompetitors: many(userCompetitors),
}));

export const userCompetitorsRelations = relations(userCompetitors, ({ one }) => ({
  competitor: one(competitors, {
    fields: [userCompetitors.competitorId],
    references: [competitors.id],
  }),
  user: one(users, {
    fields: [userCompetitors.userId],
    references: [users.id],
  }),
}));

export type Competitor = typeof competitors.$inferSelect;
export type UserCompetitor = typeof userCompetitors.$inferSelect & {
  competitor: Competitor;
};
-e 
```
-e 

# src/styles/globals.css
```
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

-e 
```
-e 

# src/trpc/query-client.ts
```
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';
import SuperJSON from 'superjson';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
-e 
```
-e 

# src/trpc/react.tsx
```
'use client';

import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { loggerLink, unstable_httpBatchStreamLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';
import { useState } from 'react';
import SuperJSON from 'superjson';

import { type AppRouter } from '~/server/api/root';
import { createQueryClient } from './query-client';

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + '/api/trpc',
          headers: () => {
            const headers = new Headers();
            headers.set('x-trpc-source', 'nextjs-react');
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
-e 
```
-e 

# src/trpc/server.ts
```
import 'server-only';

import { createHydrationHelpers } from '@trpc/react-query/rsc';
import { headers } from 'next/headers';
import { cache } from 'react';

import { createCaller, type AppRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { createQueryClient } from './query-client';

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set('x-trpc-source', 'rsc');

  return createTRPCContext({
    headers: heads,
  });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
-e 
```
-e 

# src/types/competitor.ts
```
export interface ProductMatch {
  name: string;
  url: string | null;
  price: number | null;
  currency: string | null;
  matchedProducts: Array<{
    name: string;
    url: string | null;
    matchScore: number;
    priceDiff: number | null;
  }>;
  lastUpdated: string;
}

export interface CompetitorInsight {
  domain: string;
  matchScore: number;
  matchReasons: string[];
  suggestedApproach: string;
  dataGaps: string[];
  listingPlatforms: Array<{
    platform: string;
    url: string;
    rating: number | null;
    reviewCount: number | null;
    priceRange: {
      min: number;
      max: number;
      currency: string;
    } | null;
  }>;
  products: ProductMatch[];
}

export interface AnalysisResult {
  searchType: 'maps' | 'shopping' | 'local' | 'organic';
  searchQuery: string;
  locationContext?: {
    location: {
      address: string;
      latitude: number;
      longitude: number;
      country: string;
      region: string;
      city: string;
      postalCode?: string;
      formattedAddress: string;
    };
    radius: number;
    timezone?: string;
  } | null;
  targetDemographic?: string;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  businessAttributes?: {
    size: 'small' | 'medium' | 'large';
    focus: string[];
    onlinePresence: 'weak' | 'moderate' | 'strong';
    businessCategory: string;
    serviceType: 'product' | 'service' | 'hybrid';
    uniqueFeatures: string[];
  };
}

export interface DiscoveryResult {
  competitors: CompetitorInsight[];
  recommendedSources: string[];
  searchStrategy: AnalysisResult;
  stats: {
    totalDiscovered: number;
    newCompetitors: number;
    existingCompetitors: number;
    failedAnalyses: number;
  };
}
-e 
```
-e 

# src/types/website.ts
```
export interface WebsiteContent {
  url: string;
  title: string;
  description: string;
  products: Array<{
    name: string;
    url: string | null;
    price: number | null;
    currency: string;
    description: string | null;
    category: string | null;
  }>;
  services: Array<{
    name: string;
    url: string | null;
    price: number | null;
    currency: string;
    description: string | null;
    category: string | null;
  }>;
  metadata: {
    businessType?: string;
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
    };
    socialMedia?: Record<string, string>;
    structuredData?: Record<string, unknown>[];
    prices?: Array<{
      price: number;
      currency: string;
      timestamp: string;
      source: string;
    }>;
    extractedData?: Record<string, unknown>;
  };
}
-e 
```
-e 

# start-database.sh
```
#!/usr/bin/env bash
# Use this script to start a docker container for a local development database

# TO RUN ON WINDOWS:
# 1. Install WSL (Windows Subsystem for Linux) - https://learn.microsoft.com/en-us/windows/wsl/install
# 2. Install Docker Desktop for Windows - https://docs.docker.com/docker-for-windows/install/
# 3. Open WSL - `wsl`
# 4. Run this script - `./start-database.sh`

# On Linux and macOS you can run this script directly - `./start-database.sh`

DB_CONTAINER_NAME="sagelytics-postgres"

if ! [ -x "$(command -v docker)" ]; then
  echo -e "Docker is not installed. Please install docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker info > /dev/null 2>&1; then
  echo "Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
  echo "Database container '$DB_CONTAINER_NAME' already running"
  exit 0
fi

if [ "$(docker ps -q -a -f name=$DB_CONTAINER_NAME)" ]; then
  docker start "$DB_CONTAINER_NAME"
  echo "Existing database container '$DB_CONTAINER_NAME' started"
  exit 0
fi

# import env variables from .env
set -a
source .env

DB_PASSWORD=$(echo "$DATABASE_URL" | awk -F':' '{print $3}' | awk -F'@' '{print $1}')
DB_PORT=$(echo "$DATABASE_URL" | awk -F':' '{print $4}' | awk -F'\/' '{print $1}')

if [ "$DB_PASSWORD" = "password" ]; then
  echo "You are using the default database password"
  read -p "Should we generate a random password for you? [y/N]: " -r REPLY
  if ! [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Please change the default password in the .env file and try again"
    exit 1
  fi
  # Generate a random URL-safe password
  DB_PASSWORD=$(openssl rand -base64 12 | tr '+/' '-_')
  sed -i -e "s#:password@#:$DB_PASSWORD@#" .env
fi

docker run -d \
  --name $DB_CONTAINER_NAME \
  -e POSTGRES_USER="postgres" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e POSTGRES_DB=sagelytics \
  -p "$DB_PORT":5432 \
  docker.io/postgres && echo "Database container '$DB_CONTAINER_NAME' was successfully created"
-e 
```
-e 

# tailwind.config.ts
```
import { type Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  darkMode: ['class'],
  content: ['./src/**/*.tsx', '!./src/node_modules/**/*'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...fontFamily.sans],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
-e 
```
-e 

# tsconfig.json
```
{
  "compilerOptions": {
    /* Base Options: */
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "es2022",
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true,

    /* Strictness */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "checkJs": true,

    /* Bundled projects */
    "lib": ["dom", "dom.iterable", "ES2022"],
    "noEmit": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "incremental": true,

    /* Path Aliases */
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": [
    ".eslintrc.cjs",
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.cjs",
    "**/*.js",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
-e 
```
