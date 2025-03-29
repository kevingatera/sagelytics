# Type Migration Guide

This document outlines how to migrate from local interface files to the new shared types system.

## Changes Made

1. Created a new `@shared/types` package with all common interfaces
2. Updated TypeScript path configurations to reference the new package
3. Deleted redundant interface files
4. Updated imports in key files to use the shared types

## Remaining Work

Some files still import from the old interface locations. This leads to TS errors you will see in:

- `src/microservices/src/competitor/services/competitor-discovery.service.ts`
- `src/microservices/src/competitor/services/competitor-analysis.service.ts`
- `src/microservices/src/website/services/smart-crawler.service.ts`
- `src/microservices/src/website/website.controller.ts`
- `src/microservices/src/website/website.service.ts`
- And others (see grep for "from '.*interfaces/")

## How to Fix

For each file with import errors:

1. Update imports to use `@shared/types` instead of local interface files
2. Replace type references where needed

Example:

```typescript
// BEFORE
import type { WebsiteContent } from '../../interfaces/website-content.interface';
import type { RobotsData } from '../../interfaces/robots-data.interface';

// AFTER
import type { WebsiteContent, RobotsData } from '@shared/types';
```

## Type Changes

In some cases, you may need to update your code:

- `BusinessContext.userProducts` is now `BusinessContext.products`
- Some optional fields have been standardized
- Some field types might have slight differences (most are more permissive, not less)

## Building and Testing

After making changes, build the types package:

```bash
pnpm build:types
```

Then run type checks:

```bash
pnpm typecheck
```

Fix any reported type errors before proceeding ❤️ 