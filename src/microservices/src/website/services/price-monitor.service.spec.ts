import { PriceMonitorService } from './price-monitor.service';
import type { DatabaseService } from '../../shared/services/database.service';
import type { WebsiteDiscoveryService } from './website-discovery.service';

const PRODUCT_URL = 'https://competitor.example/pro';

function build(series: Array<{ recordedAt: Date; price: number; changePercentage: number | null }> | Error) {
  const database = {
    getPriceSeriesByUrl: series instanceof Error
      ? jest.fn().mockRejectedValue(series)
      : jest.fn().mockResolvedValue(series),
  };
  const discovery = { discoverWebsiteContent: jest.fn() };
  const service = new PriceMonitorService(
    {} as never,
    discovery as unknown as WebsiteDiscoveryService,
    {} as never,
    {} as never,
    {} as never,
    database as unknown as DatabaseService,
  );
  return { service, database, discovery };
}

describe('PriceMonitorService.trackPriceHistory', () => {
  it('returns only the recorded series, oldest first, with the latest price as current', async () => {
    const { service, database, discovery } = build([
      { recordedAt: new Date('2026-11-01T00:00:00Z'), price: 40, changePercentage: null },
      { recordedAt: new Date('2026-11-10T00:00:00Z'), price: 49, changePercentage: 22.5 },
    ]);

    const result = await service.trackPriceHistory(PRODUCT_URL);

    expect(database.getPriceSeriesByUrl).toHaveBeenCalledWith(PRODUCT_URL);
    expect(result).toEqual({
      current: 49,
      history: [
        { date: '2026-11-01T00:00:00.000Z', price: 40, change: null },
        { date: '2026-11-10T00:00:00.000Z', price: 49, change: 22.5 },
      ],
    });
    expect(discovery.discoverWebsiteContent).not.toHaveBeenCalled();
  });

  it('returns no current price and no fabricated history when nothing is recorded', async () => {
    const { service } = build([]);

    await expect(service.trackPriceHistory(PRODUCT_URL)).resolves.toEqual({
      current: null,
      history: [],
    });
  });

  it('returns an empty result when the database read fails', async () => {
    const { service } = build(new Error('connection refused'));

    await expect(service.trackPriceHistory(PRODUCT_URL)).resolves.toEqual({
      current: null,
      history: [],
    });
  });
});
