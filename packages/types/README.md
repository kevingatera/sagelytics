# Shared Types Package

This package provides a single source of truth for TypeScript types used across the codebase, especially between the Next.js frontend and NestJS microservices.

## Usage

```typescript
// Import the specific types you need
import type { 
  CompetitorInsight, 
  WebsiteContent, 
  BusinessContext
} from '@shared/types';
```

## Build

To build the package, run:

```bash
# At the root of the repository
pnpm build:types

# Or directly in the package
cd packages/types
pnpm build
```

## Types

The package includes shared type definitions for:

- Product & business data types (ProductMatch, Product)
- Analysis results (CompetitorInsight, AnalysisResult, DiscoveryResult)
- Website content (WebsiteContent)
- Business context (BusinessContext)
- Location data (GeoLocation, LocationContext)
- Utilities (PriceData, RobotsData, SitemapData, PlatformData, PlatformMetrics)
