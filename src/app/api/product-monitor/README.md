# Product Monitoring API

This API provides endpoints for monitoring competitor product prices and tracking historical pricing data.

## Setup

1. Ensure that all required microservices are running:
   ```
   cd src/microservices
   pnpm install
   pnpm start
   ```

2. Make sure the `@nestjs/schedule` package is installed:
   ```
   pnpm add @nestjs/schedule
   ```

## Endpoints

### POST /api/product-monitor

Initiates product monitoring for a competitor's domain.

**Request Body:**
```json
{
  "competitorDomain": "competitor.com",
  "productIds": ["Product1", "Product2"] // Optional - if not provided, all products will be monitored
}
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "name": "Product1",
      "url": "https://yoursite.com/product1",
      "price": 99.99,
      "currency": "USD",
      "matchedProducts": [
        {
          "name": "Competitor Product X",
          "url": "https://competitor.com/productx",
          "matchScore": 85,
          "priceDiff": -5.2
        }
      ],
      "lastUpdated": "2023-12-01T12:00:00.000Z"
    }
  ]
}
```

### GET /api/product-monitor?productUrl=url

Retrieves price history for a specific product URL.

**Query Parameters:**
- `productUrl`: The URL of the product to track

**Response:**
```json
{
  "success": true,
  "history": {
    "current": 99.99,
    "history": [
      { "date": "2023-10-01", "price": 99.99, "change": null },
      { "date": "2023-10-15", "price": 95.99, "change": -4.0 },
      { "date": "2023-11-01", "price": 89.99, "change": -6.3 }
    ]
  }
}
```

## Scheduled Monitoring

The system automatically runs monitoring tasks at the following intervals:
- Hourly for high-priority products
- Daily at midnight for all products

## Adding to NestJS Microservices

To add product monitoring services to a NestJS microservice:

1. Add the PriceMonitorService and PriceMonitoringWorker to your module:
```typescript
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // other imports
  ],
  providers: [
    PriceMonitorService,
    PriceMonitoringWorker,
    // other providers
  ],
  exports: [
    PriceMonitorService,
    PriceMonitoringWorker,
  ],
})
export class YourModule {}
```

2. Add the monitoring patterns to your controller:
```typescript
@Controller()
export class YourController {
  constructor(
    private readonly priceMonitorService: PriceMonitorService,
    private readonly priceMonitoringWorker: PriceMonitoringWorker,
  ) {}

  @MessagePattern('monitor_competitor_prices')
  async monitorCompetitorPrices(data: {
    competitorDomain: string;
    userProducts: Product[];
  }): Promise<ProductMatch[]> {
    return await this.priceMonitorService.monitorCompetitorPrices(
      data.competitorDomain,
      data.userProducts,
    );
  }
}
```

## Adding to the UI

The ProductTable component has been extended with monitoring capabilities:

1. Use the "Monitor" button to initiate monitoring for a product
2. View matched competitor products by clicking the expand button
3. Detailed match information is available in the dialog

## Setting Up Automatic Monitoring

1. Create a scheduled task with the appropriate API:
```typescript
const task = await MicroserviceClient.getInstance().createMonitoringTask({
  userId: user.id,
  competitorDomain: 'competitor.com',
  userProducts: products,
  frequency: '0 */6 * * *', // Every 6 hours
  enabled: true,
});
```

2. Update or remove tasks as needed:
```typescript
await MicroserviceClient.getInstance().updateMonitoringTask({
  taskId: 'task-id',
  updates: {
    enabled: false,
  },
});
``` 