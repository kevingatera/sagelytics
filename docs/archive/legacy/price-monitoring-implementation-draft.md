# Competitor Price Monitoring Implementation

## Overview

We've implemented a comprehensive system for automatically monitoring competitor product prices and tracking historical price data. This feature leverages a combination of the Perplexity LLM service with traditional web scraping techniques to match user products with competitor products and track price changes over time.

## Key Components

### 1. Backend Services (NestJS Microservices)

- **PriceMonitorService**: Core service for detecting competitor prices and matching products
- **PriceMonitoringWorker**: Scheduled worker for running monitoring tasks on different frequencies
- **WebsiteDiscoveryService**: Used to crawl and extract product information from websites
- **PerplexityService**: LLM-powered service to help with more accurate product matching

### 2. Frontend Components

- **ProductTable**: Enhanced to support initiating monitoring and viewing matched products
- **MonitoringTasksPanel**: Dashboard component for managing scheduled monitoring tasks

### 3. API Endpoints

- **/api/product-monitor** (POST): Initiates product monitoring for a competitor domain
- **/api/product-monitor** (GET): Retrieves price history for a specific product
- Additional endpoints for creating/updating/removing monitoring tasks

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │    │                     │
│   Next.js App       │    │   NestJS API        │    │  Perplexity API     │
│                     │    │                     │    │                     │
└─────────┬───────────┘    └─────────┬───────────┘    └─────────┬───────────┘
          │                          │                          │
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │    │                     │
│  ProductTable.tsx   │    │ PriceMonitorService │    │  Product Matching   │
│  MonitoringPanel.tsx│    │ PriceMonitorWorker  │    │                     │
│                     │    │                     │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Implementation Details

### Automatic Product Matching

Products are matched using a combination of techniques:

1. Text similarity using name comparison (exact, substring, word-level)
2. LLM-powered matching using Perplexity for more accurate results
3. Fallback to heuristic matching when LLM services are unavailable

```typescript
private async matchProductsByPerplexity(
  userProducts: Product[],
  competitorProducts: Array<{ name: string; url: string; price: number | null }>,
  competitorDomain: string,
): Promise<ProductMatch[]>
```

### Scheduled Monitoring

The system supports different monitoring frequencies:

- Hourly monitoring for high-priority products (`0 * * * *`)
- Daily monitoring for all products (`0 0 * * *`)
- Custom schedules like every 6 hours (`0 */6 * * *`)

```typescript
@Cron(CronExpression.EVERY_HOUR)
async handleHourlyMonitoring() {
  this.logger.debug('Running hourly price monitoring');
  await this.runMonitoringTasks('0 * * * *');
}
```

### UI Integration

- The product table shows competitor prices and differences
- Detailed product match information is available in a dialog
- A monitoring tasks panel shows all active monitoring tasks

## Future Improvements

1. **Historical Data Storage**: Implement a database schema for storing historical price data
2. **Price Change Notifications**: Alert users when significant price changes are detected
3. **Advanced Matching**: Improve product matching by incorporating image similarity
4. **Price Trends Analysis**: Provide visualizations and insights based on historical data
5. **Competitor Product Discovery**: Automatically discover new competitor products

## Required Dependencies

- `@nestjs/schedule`: For scheduling regular price monitoring
- Tailwind CSS with shadcn/ui components for the frontend
- NestJS microservices with Redis transport for the backend
- Perplexity API integration for LLM-powered matching 