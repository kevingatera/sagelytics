import { PriceMonitoringWorker } from './price-monitoring-worker';
import type { WebsiteDiscoveryService } from './website-discovery.service';
import type { NotificationService } from '../../notification/notification.service';
import type { DatabaseService } from '../../shared/services/database.service';

const COMPETITOR_PRODUCT_URL = 'https://competitor.example/pro';

function persistedTask() {
  return {
    id: 'task-1',
    userId: 'user-1',
    competitorDomain: 'competitor.example',
    productUrls: [
      { id: 'p1', name: 'Pro Plan', url: COMPETITOR_PRODUCT_URL, price: 40, currency: 'USD' },
    ],
    frequency: '0 */6 * * *',
    enabled: true,
    status: 'active',
    lastRun: null,
    nextRun: null,
    discoverySource: 'perplexity',
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z'),
  };
}

function build(options: { observedPrice?: number; previousPrice?: string; fetchError?: Error } = {}) {
  const database = {
    getTasksToRun: jest.fn().mockResolvedValue([persistedTask()]),
    getLatestPriceForProduct: jest.fn().mockResolvedValue(
      options.previousPrice === undefined ? null : { price: options.previousPrice },
    ),
    createPriceRecord: jest.fn().mockResolvedValue(undefined),
    updateMonitoringTask: jest.fn().mockResolvedValue(persistedTask()),
    createMonitoringTask: jest.fn().mockResolvedValue({ ...persistedTask(), id: 'task-2' }),
  };
  // Network boundary: the competitor page fetch. Everything else stays real.
  const websiteDiscovery = {
    discoverWebsiteContent: options.fetchError
      ? jest.fn().mockRejectedValue(options.fetchError)
      : jest.fn().mockResolvedValue({
          products: [
            {
              name: 'Pro Plan',
              url: COMPETITOR_PRODUCT_URL,
              price: options.observedPrice ?? 49,
              currency: 'USD',
            },
          ],
        }),
  };
  const notification = { sendAlert: jest.fn().mockResolvedValue(undefined) };
  const worker = new PriceMonitoringWorker(
    websiteDiscovery as unknown as WebsiteDiscoveryService,
    notification as unknown as NotificationService,
    database as unknown as DatabaseService,
  );
  return { worker, database, websiteDiscovery, notification };
}

describe('PriceMonitoringWorker scheduled monitoring', () => {
  it('runs a persisted task on the scheduled tick and records the observed competitor price', async () => {
    const { worker, database, websiteDiscovery } = build({ observedPrice: 49 });

    await worker.handleSixHourlyMonitoring();

    expect(database.getTasksToRun).toHaveBeenCalledWith('0 */6 * * *');
    expect(websiteDiscovery.discoverWebsiteContent).toHaveBeenCalledWith(COMPETITOR_PRODUCT_URL);
    expect(database.createPriceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoringTaskId: 'task-1',
        productName: 'Pro Plan',
        productUrl: COMPETITOR_PRODUCT_URL,
        price: 49,
        currency: 'USD',
        extractionMethod: 'direct_crawl',
      }),
    );
    expect(database.updateMonitoringTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        status: 'active',
        lastRun: expect.any(Date),
        nextRun: expect.any(Date),
      }),
    );
  });

  it('computes change from the stored previous price and alerts on a large move', async () => {
    // Postgres numeric columns come back as strings.
    const { worker, database, notification } = build({ observedPrice: 49, previousPrice: '40.00' });

    await worker.handleSixHourlyMonitoring();

    expect(database.createPriceRecord).toHaveBeenCalledWith(
      expect.objectContaining({ previousPrice: 40, changePercentage: expect.closeTo(22.5, 1) }),
    );
    expect(notification.sendAlert).toHaveBeenCalledWith(
      expect.objectContaining({ alertType: 'price_increase', monitoringTaskId: 'task-1' }),
    );
  });

  it('stores no price (not 0) when the competitor page fetch fails, and still closes the run', async () => {
    const { worker, database } = build({ fetchError: new Error('upstream timeout') });

    await worker.handleSixHourlyMonitoring();

    expect(database.createPriceRecord).not.toHaveBeenCalled();
    expect(database.updateMonitoringTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ lastRun: expect.any(Date), nextRun: expect.any(Date) }),
    );
  });

  it('persists new monitoring tasks instead of returning an in-memory id', async () => {
    const { worker, database } = build();

    const id = await worker.addMonitoringTask({
      userId: 'user-1',
      competitorDomain: 'competitor.example',
      productUrls: persistedTask().productUrls,
      frequency: '0 */6 * * *',
      enabled: true,
      discoverySource: 'perplexity',
    });

    expect(id).toBe('task-2');
    expect(database.createMonitoringTask).toHaveBeenCalledTimes(1);
  });

  it('propagates database failures when persisting a task rather than fabricating one', async () => {
    const { worker, database } = build();
    database.createMonitoringTask.mockRejectedValueOnce(new Error('connection refused'));

    await expect(
      worker.addMonitoringTask({
        userId: 'user-1',
        competitorDomain: 'competitor.example',
        productUrls: persistedTask().productUrls,
        frequency: '0 */6 * * *',
      }),
    ).rejects.toThrow('connection refused');
  });
});
