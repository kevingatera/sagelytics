import { PriceMonitorService } from './price-monitor.service';
import type { DatabaseService } from '../../shared/services/database.service';
import type { WebsiteDiscoveryService } from './website-discovery.service';

const PRODUCT_URL = 'https://competitor.example/pro';
const ALICE = 'user-alice';
const BOB = 'user-bob';

type SeriesPoint = { recordedAt: Date; price: number; changePercentage: number | null };

function build(series: SeriesPoint[] | Error) {
  const database = {
    getPriceSeriesForUser: series instanceof Error
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

/**
 * Database stand-in with the same ownership contract as getPriceSeriesForUser: rows
 * belong to a task, tasks belong to a user, and only the caller's rows come back.
 */
function buildWithOwnedRows(rows: Array<SeriesPoint & { ownerId: string; productUrl: string }>) {
  const database = {
    getPriceSeriesForUser: jest.fn(async (userId: string, productUrl: string) =>
      rows
        .filter((row) => row.ownerId === userId && row.productUrl === productUrl)
        .map(({ recordedAt, price, changePercentage }) => ({ recordedAt, price, changePercentage })),
    ),
  };
  const service = new PriceMonitorService(
    {} as never,
    { discoverWebsiteContent: jest.fn() } as unknown as WebsiteDiscoveryService,
    {} as never,
    {} as never,
    {} as never,
    database as unknown as DatabaseService,
  );
  return { service, database };
}

describe('PriceMonitorService.trackPriceHistory', () => {
  it('returns only the recorded series, oldest first, with the latest price as current', async () => {
    const { service, database, discovery } = build([
      { recordedAt: new Date('2026-11-01T00:00:00Z'), price: 40, changePercentage: null },
      { recordedAt: new Date('2026-11-10T00:00:00Z'), price: 49, changePercentage: 22.5 },
    ]);

    const result = await service.trackPriceHistory(ALICE, PRODUCT_URL);

    expect(database.getPriceSeriesForUser).toHaveBeenCalledWith(ALICE, PRODUCT_URL);
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

    await expect(service.trackPriceHistory(ALICE, PRODUCT_URL)).resolves.toEqual({
      current: null,
      history: [],
    });
  });

  it('returns an empty result when the database read fails', async () => {
    const { service } = build(new Error('connection refused'));

    await expect(service.trackPriceHistory(ALICE, PRODUCT_URL)).resolves.toEqual({
      current: null,
      history: [],
    });
  });

  it('does not read anything without a user id', async () => {
    const { service, database } = build([
      { recordedAt: new Date('2026-11-01T00:00:00Z'), price: 40, changePercentage: null },
    ]);

    await expect(service.trackPriceHistory('', PRODUCT_URL)).resolves.toEqual({
      current: null,
      history: [],
    });
    expect(database.getPriceSeriesForUser).not.toHaveBeenCalled();
  });

  it("gives another user the same empty result for a monitored URL as for an unknown URL", async () => {
    const { service } = buildWithOwnedRows([
      {
        ownerId: ALICE,
        productUrl: PRODUCT_URL,
        recordedAt: new Date('2026-11-01T00:00:00Z'),
        price: 40,
        changePercentage: null,
      },
    ]);

    const ownerView = await service.trackPriceHistory(ALICE, PRODUCT_URL);
    const foreign = await service.trackPriceHistory(BOB, PRODUCT_URL);
    const unknown = await service.trackPriceHistory(BOB, 'https://nobody.example/none');

    expect(ownerView.history).toHaveLength(1);
    expect(foreign).toEqual({ current: null, history: [] });
    expect(foreign).toEqual(unknown);
  });
});
