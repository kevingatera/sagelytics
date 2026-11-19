import { describe, expect, it } from 'vitest';
import {
  averagePrice,
  buildCompetitorSummaries,
  buildDashboardPayload,
  buildPriceChanges,
  buildPriceChart,
  countTrackedProducts,
  findAlertProduct,
  toDashboardAlert,
  type AlertRow,
  type PricePoint,
} from './summary';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 1, 9, 0, 0);

function point(overrides: Partial<PricePoint> & { dayOffset: number }): PricePoint {
  const { dayOffset, ...rest } = overrides;
  return {
    recordedAt: new Date(START + dayOffset * DAY),
    competitorDomain: 'rival.example.test',
    productUrl: 'https://rival.example.test/p/1',
    productName: 'Widget',
    price: 100,
    currency: 'USD',
    changePercentage: null,
    previousPrice: null,
    ...rest,
  };
}

describe('averagePrice', () => {
  it('returns null for no values and rounds to cents', () => {
    expect(averagePrice([])).toBeNull();
    expect(averagePrice([10, 10, 11])).toBe(10.33);
  });
});

describe('countTrackedProducts', () => {
  it('counts distinct product URLs across tasks', () => {
    expect(
      countTrackedProducts([
        { competitorDomain: 'a.test', productUrls: [{ url: 'https://a.test/1' }, { url: 'https://a.test/2' }] },
        { competitorDomain: 'b.test', productUrls: [{ url: 'https://a.test/1' }, { url: '  ' }] },
      ]),
    ).toBe(2);
  });
});

describe('buildPriceChart', () => {
  it('carries each recorded price forward and averages products per competitor per day', () => {
    const rows = buildPriceChart([
      point({ dayOffset: 0, productUrl: 'https://rival.test/1', price: 100 }),
      point({ dayOffset: 0, productUrl: 'https://rival.test/2', price: 50 }),
      point({ dayOffset: 2, productUrl: 'https://rival.test/1', price: 120, changePercentage: 20, previousPrice: 100 }),
    ].map((p) => ({ ...p, competitorDomain: 'rival.test' })));

    expect(rows).toEqual([
      { date: '2026-11-01', 'rival.test': 75 },
      { date: '2026-11-03', 'rival.test': 85 },
    ]);
  });

  it('keeps competitors on separate keys and skips unpriced rows', () => {
    const rows = buildPriceChart([
      point({ dayOffset: 0, competitorDomain: 'a.test', productUrl: 'https://a.test/1', price: 10 }),
      point({ dayOffset: 0, competitorDomain: 'b.test', productUrl: 'https://b.test/1', price: null }),
      point({ dayOffset: 0, competitorDomain: 'c.test', productUrl: 'https://c.test/1', price: 30 }),
    ]);

    expect(rows).toEqual([{ date: '2026-11-01', 'a.test': 10, 'c.test': 30 }]);
  });

  it('returns no rows when nothing has a price', () => {
    expect(buildPriceChart([point({ dayOffset: 0, price: null })])).toEqual([]);
  });
});

describe('buildPriceChanges', () => {
  it('lists only real moves, newest first, and respects the limit', () => {
    const changes = buildPriceChanges(
      [
        point({ dayOffset: 0, changePercentage: null, previousPrice: null }),
        point({ dayOffset: 1, changePercentage: 0, previousPrice: 100 }),
        point({ dayOffset: 2, changePercentage: 15, previousPrice: 100, price: 115 }),
        point({ dayOffset: 3, changePercentage: -8, previousPrice: 115, price: 105.8 }),
      ],
      2,
    );

    expect(changes.map((c) => c.changePercentage)).toEqual([-8, 15]);
    expect(changes[0]).toMatchObject({
      competitorDomain: 'rival.example.test',
      previousPrice: 115,
      price: 105.8,
      currency: 'USD',
    });
  });
});

describe('buildCompetitorSummaries', () => {
  it('reports the latest non-zero move and null for a competitor with no history', () => {
    const tasks = [
      { competitorDomain: 'rival.test', productUrls: [{ url: 'https://rival.test/1' }] },
      { competitorDomain: 'quiet.test', productUrls: [{ url: 'https://quiet.test/1' }] },
    ];
    const summaries = buildCompetitorSummaries(tasks, [
      point({ dayOffset: 0, competitorDomain: 'rival.test', changePercentage: 12, previousPrice: 90, price: 100.8 }),
      point({ dayOffset: 4, competitorDomain: 'rival.test', changePercentage: 0, previousPrice: 100.8, price: 100.8 }),
    ]);

    expect(summaries).toEqual([
      {
        domain: 'quiet.test',
        trackedProducts: 1,
        latestChange: null,
        latestRecordedAt: null,
      },
      {
        domain: 'rival.test',
        trackedProducts: 1,
        latestChange: 12,
        latestRecordedAt: new Date(START + 4 * DAY).toISOString(),
      },
    ]);
  });
});

describe('toDashboardAlert', () => {
  it('maps the threshold, competitor and latest notification status', () => {
    const row: AlertRow = {
      id: 'alert-1',
      alertType: 'price_increase',
      thresholdValue: '12.50',
      createdAt: new Date(START),
      monitoringTask: { competitorDomain: 'rival.test' },
      notificationLogs: [{ status: 'skipped' }, { status: 'sent' }],
    };

    expect(toDashboardAlert(row)).toEqual({
      id: 'alert-1',
      alertType: 'price_increase',
      competitorDomain: 'rival.test',
      productName: null,
      productUrl: null,
      thresholdValue: 12.5,
      notificationStatus: 'skipped',
      createdAt: new Date(START).toISOString(),
    });
  });

  it('returns nulls when the task or threshold is missing', () => {
    const alert = toDashboardAlert({
      id: 'alert-2',
      alertType: 'price_decrease',
      thresholdValue: null,
      createdAt: new Date(START),
      monitoringTask: null,
      notificationLogs: [],
    });

    expect(alert.competitorDomain).toBeNull();
    expect(alert.productName).toBeNull();
    expect(alert.productUrl).toBeNull();
    expect(alert.thresholdValue).toBeNull();
    expect(alert.notificationStatus).toBeNull();
  });
});

describe('findAlertProduct', () => {
  const TASK = 'task-1';
  const alertAt = new Date(START + 2 * DAY);
  const recordedRow = (overrides: Partial<PricePoint>): PricePoint => ({
    monitoringTaskId: TASK,
    recordedAt: new Date(alertAt.getTime() - 1000),
    competitorDomain: 'rival.test',
    productUrl: 'https://rival.test/a',
    productName: 'Rival A',
    price: 112.5,
    currency: 'USD',
    changePercentage: 12.5,
    previousPrice: 100,
    ...overrides,
  });
  const alertRow = (overrides: Partial<AlertRow> = {}): AlertRow => ({
    id: 'alert-1',
    monitoringTaskId: TASK,
    alertType: 'price_increase',
    thresholdValue: '12.50',
    createdAt: alertAt,
    monitoringTask: {
      competitorDomain: 'rival.test',
      productUrls: [
        { name: 'Rival A', url: 'https://rival.test/a' },
        { name: 'Rival B', url: 'https://rival.test/b' },
      ],
    },
    notificationLogs: [],
    ...overrides,
  });

  it("uses the task's only product when it has one", () => {
    const row = alertRow({
      monitoringTask: {
        competitorDomain: 'rival.test',
        productUrls: [{ name: 'Rival A', url: 'https://rival.test/a' }],
      },
    });
    expect(findAlertProduct(row, [])).toEqual({ name: 'Rival A', url: 'https://rival.test/a' });
  });

  it('matches the price row from the same run by direction and size', () => {
    const points = [
      recordedRow({ productUrl: 'https://rival.test/b', productName: 'Rival B', changePercentage: -12.5 }),
      recordedRow({}),
    ];
    expect(findAlertProduct(alertRow(), points)).toEqual({ name: 'Rival A', url: 'https://rival.test/a' });
    expect(toDashboardAlert(alertRow(), points)).toMatchObject({
      productName: 'Rival A',
      productUrl: 'https://rival.test/a',
    });
  });

  it('returns null rather than guessing when no row matches', () => {
    expect(findAlertProduct(alertRow(), [recordedRow({ monitoringTaskId: 'other-task' })])).toBeNull();
    expect(findAlertProduct(alertRow(), [recordedRow({ changePercentage: 30 })])).toBeNull();
    expect(
      findAlertProduct(alertRow(), [recordedRow({ recordedAt: new Date(alertAt.getTime() - DAY) })]),
    ).toBeNull();
    expect(findAlertProduct(alertRow({ monitoringTaskId: null }), [recordedRow({})])).toBeNull();
  });
});

describe('buildDashboardPayload', () => {
  it('assembles the payload from unsorted input', () => {
    const payload = buildDashboardPayload({
      days: 30,
      tasks: [{ competitorDomain: 'rival.test', productUrls: [{ url: 'https://rival.test/1' }] }],
      points: [
        point({ dayOffset: 5, price: 110 }),
        point({ dayOffset: 1, price: 100 }),
      ],
      userPrices: [40, 60],
      alerts: [],
    });

    expect(payload.days).toBe(30);
    expect(payload.trackedProductCount).toBe(1);
    expect(payload.yourAveragePrice).toBe(50);
    expect(payload.lastRecordedAt).toBe(new Date(START + 5 * DAY).toISOString());
    expect(payload.chart.map((row) => row.date)).toEqual(['2026-11-02', '2026-11-06']);
    expect(payload.alerts).toEqual([]);
  });

  it('has no price history and no averages when nothing was recorded', () => {
    const payload = buildDashboardPayload({
      days: 90,
      tasks: [],
      points: [],
      userPrices: [],
      alerts: [],
    });

    expect(payload).toEqual({
      days: 90,
      trackedProductCount: 0,
      yourAveragePrice: null,
      lastRecordedAt: null,
      competitors: [],
      chart: [],
      changes: [],
      alerts: [],
    });
  });
});
