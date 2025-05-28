# Sagelytics Microservices

Intelligent competitor discovery and analysis microservices built with NestJS. This service provides deep insights into competitors through SERP analysis, smart web crawling, and AI-powered content analysis.

## Features

### Competitor Discovery
- SERP-based competitor identification
- Smart depth-based web crawling (up to 3 levels)
- Perplexity API integration for enhanced research capabilities
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
- Perplexity-powered real-time competitive intelligence

## Tech Stack

- NestJS for microservices architecture
- TypeScript for type safety
- GROQ/Gemini for AI analysis
- Perplexity API for web-wide competitive research
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
PERPLEXITY_API_KEY=your_perplexity_api_key
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
├── competitor/         # Competitor discovery and analysis
├── website/           # Website discovery and crawling
├── shared/           # Shared utilities and services
├── interfaces/       # TypeScript interfaces
├── llm-tools/        # LLM integration services (Perplexity, etc.)
└── test/
    └── integration/  # Integration tests
```

### Perplexity Integration

The Perplexity API is used to enhance competitor research capabilities:

1. **Competitor Discovery** - Uses Perplexity to find competitor businesses based on a domain name and business type
2. **Competitive Analysis** - Extracts detailed product and pricing information from competitor websites
3. **Structured Data** - Returns competitor information in structured JSON format for easy integration

The integration follows a fallback strategy:
- If the `PERPLEXITY_API_KEY` is provided, the system will try to use Perplexity first
- If Perplexity fails or returns insufficient data, falls back to the custom scraping implementation
- If `PERPLEXITY_API_KEY` is not provided, uses only the custom implementation

To enable the Perplexity integration, obtain an API key from [Perplexity AI](https://docs.perplexity.ai/guides/getting-started) and add it to your `.env` file.

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
