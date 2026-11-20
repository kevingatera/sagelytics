import dns from 'dns';
import http from 'http';
import https from 'https';
import { PriceMonitoringWorker } from './price-monitoring-worker';
import type { WebsiteDiscoveryService } from './website-discovery.service';
import type { NotificationService } from '../../notification/notification.service';
import type {
  ClaimedMonitoringTask,
  DatabaseService,
} from '../../shared/services/database.service';

const COMPETITOR_PRODUCT_URL = 'https://competitor.example/pro';
const ALERT_ID = '6f1c2b0e-1111-4c3d-9e8f-0000000000aa';
const HOUR_MS = 60 * 60 * 1000;

function persistedTask(): ClaimedMonitoringTask {
  return {
    id: 'task-1',
    userId: 'user-1',
    competitorDomain: 'competitor.example',
    productUrls: [
      {
        id: 'p1',
        name: 'Pro Plan',
        url: COMPETITOR_PRODUCT_URL,
        price: 40,
        currency: 'USD',
      },
    ],
    frequency: '0 */6 * * *',
    enabled: true,
    status: 'active',
    lastRun: null,
    nextRun: null,
    claimedUntil: new Date(Date.now() + HOUR_MS),
    urlCursor: 0,
    discoverySource: 'perplexity',
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z'),
  };
}

function build(
  options: {
    observedPrice?: number;
    previousPrice?: string;
    previousRecordedAt?: Date;
    fetchError?: Error;
  } = {},
) {
  const database = {
    claimDueMonitoringTasks: jest.fn().mockResolvedValue([persistedTask()]),
    getLatestPriceForProduct: jest.fn().mockResolvedValue(
      options.previousPrice === undefined
        ? null
        : {
            price: options.previousPrice,
            recordedAt: options.previousRecordedAt ?? new Date(),
          },
    ),
    createPriceRecord: jest.fn().mockResolvedValue(undefined),
    createMonitoringAlert: jest.fn().mockResolvedValue(ALERT_ID),
    getEligibleMonitoringProductCount: jest.fn((task: ClaimedMonitoringTask) =>
      Promise.resolve(task.productUrls.length),
    ),
    finishMonitoringTask: jest.fn().mockResolvedValue(undefined),
    createMonitoringTask: jest
      .fn()
      .mockResolvedValue({ ...persistedTask(), id: 'task-2' }),
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
  const notification = { sendAlert: jest.fn().mockResolvedValue('sent') };
  const worker = new PriceMonitoringWorker(
    websiteDiscovery as unknown as WebsiteDiscoveryService,
    notification as unknown as NotificationService,
    database as unknown as DatabaseService,
  );
  return { worker, database, websiteDiscovery, notification };
}

// DNS is mocked: the worker's SSRF check resolves hosts through dns.promises.lookup.
let dnsTable: Record<string, string>;

beforeEach(() => {
  dnsTable = { 'competitor.example': '93.184.216.34' };
  jest.spyOn(dns.promises, 'lookup').mockImplementation(((hostname: string) => {
    const address = dnsTable[hostname];
    return address
      ? Promise.resolve([{ address, family: address.includes(':') ? 6 : 4 }])
      : Promise.reject(
          Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }),
        );
  }) as unknown as typeof dns.promises.lookup);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  delete process.env.MONITORING_BATCH_SIZE;
  delete process.env.MONITORING_MAX_URLS_PER_TASK;
});

describe('PriceMonitoringWorker SSRF guard', () => {
  it.each([
    '127.0.0.1',
    '169.254.169.254',
    '10.0.0.7',
    '::1',
    '::ffff:127.0.0.1',
  ])(
    'refuses a product URL whose host resolves to %s without a network call',
    async (address) => {
      dnsTable['competitor.example'] = address;
      const fetchSpy = jest.spyOn(globalThis, 'fetch');
      const httpSpy = jest.spyOn(http, 'request');
      const httpsSpy = jest.spyOn(https, 'request');
      const { worker, database, websiteDiscovery } = build({
        observedPrice: 49,
      });

      await worker.runMonitoringTasks();

      expect(dns.promises.lookup).toHaveBeenCalledWith(
        'competitor.example',
        expect.objectContaining({ all: true }),
      );
      expect(websiteDiscovery.discoverWebsiteContent).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(httpSpy).not.toHaveBeenCalled();
      expect(httpsSpy).not.toHaveBeenCalled();
      expect(database.createPriceRecord).not.toHaveBeenCalled();
      // The rest of the run still completes.
      expect(database.finishMonitoringTask).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'task-1' }),
        expect.any(Date),
        expect.any(Date),
        expect.any(Number),
      );
    },
  );

  it('refuses a stored private literal without a DNS lookup', async () => {
    const { worker, database, websiteDiscovery } = build();
    database.claimDueMonitoringTasks.mockResolvedValue([
      {
        ...persistedTask(),
        productUrls: [
          {
            id: 'p1',
            name: 'Meta',
            url: 'http://169.254.169.254/latest/meta-data/',
          },
        ],
      },
    ]);

    await worker.runMonitoringTasks();

    expect(dns.promises.lookup).not.toHaveBeenCalled();
    expect(websiteDiscovery.discoverWebsiteContent).not.toHaveBeenCalled();
  });
});

describe('PriceMonitoringWorker scheduled monitoring', () => {
  it('runs a persisted task on the scheduled tick and records the observed competitor price', async () => {
    const { worker, database, websiteDiscovery } = build({ observedPrice: 49 });

    await worker.runMonitoringTasks();

    expect(database.claimDueMonitoringTasks).toHaveBeenCalledWith(
      25,
      5,
      expect.any(Number),
    );
    expect(websiteDiscovery.discoverWebsiteContent).toHaveBeenCalledWith(
      COMPETITOR_PRODUCT_URL,
      { signal: expect.any(AbortSignal), llmDeadlineAt: expect.any(Number) },
    );
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
    expect(database.finishMonitoringTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1' }),
      expect.any(Date),
      expect.any(Date),
      expect.any(Number),
    );
  });

  it('computes change from the stored previous price and alerts on a large move', async () => {
    // Postgres numeric columns come back as strings.
    const { worker, database, notification } = build({
      observedPrice: 49,
      previousPrice: '40.00',
    });

    await worker.runMonitoringTasks();

    expect(database.createPriceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        previousPrice: 40,
        changePercentage: expect.closeTo(22.5, 1),
      }),
    );
    expect(notification.sendAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        alertType: 'price_increase',
        monitoringTaskId: 'task-1',
      }),
      expect.objectContaining({
        productName: 'Pro Plan',
        previousPrice: 40,
        currentPrice: 49,
      }),
    );
  });

  it('persists the alert row before sending it, so the notification log gets the real alert id', async () => {
    const { worker, database, notification } = build({
      observedPrice: 49,
      previousPrice: '40.00',
    });

    await worker.runMonitoringTasks();

    expect(database.createMonitoringAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        monitoringTaskId: 'task-1',
        alertType: 'price_increase',
        thresholdType: 'percentage',
      }),
    );
    expect(notification.sendAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: ALERT_ID }),
      expect.anything(),
    );
    expect(
      database.createMonitoringAlert.mock.invocationCallOrder[0],
    ).toBeLessThan(notification.sendAlert.mock.invocationCallOrder[0]);
  });

  it('skips recording an unchanged price inside the heartbeat window and raises no alert', async () => {
    const { worker, database, notification } = build({
      observedPrice: 40,
      previousPrice: '40.00',
      previousRecordedAt: new Date(Date.now() - HOUR_MS),
    });

    await worker.runMonitoringTasks();

    expect(database.createPriceRecord).not.toHaveBeenCalled();
    expect(database.createMonitoringAlert).not.toHaveBeenCalled();
    expect(notification.sendAlert).not.toHaveBeenCalled();
  });

  it('records an unchanged price once the last row is a day old, with zero change', async () => {
    const { worker, database } = build({
      observedPrice: 40,
      previousPrice: '40.00',
      previousRecordedAt: new Date(Date.now() - 25 * HOUR_MS),
    });

    await worker.runMonitoringTasks();

    expect(database.createPriceRecord).toHaveBeenCalledWith(
      expect.objectContaining({ price: 40, changePercentage: 0 }),
    );
  });

  it('stores no change value when the move does not fit numeric(5,2), and still records the price', async () => {
    const { worker, database } = build({
      observedPrice: 49,
      previousPrice: '1.00',
    });

    await worker.runMonitoringTasks();

    expect(database.createPriceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 49,
        previousPrice: 1,
        changePercentage: null,
      }),
    );
  });

  it('stores no price (not 0) when the competitor page fetch fails, and still closes the run', async () => {
    const { worker, database } = build({
      fetchError: new Error('upstream timeout'),
    });

    await worker.runMonitoringTasks();

    expect(database.createPriceRecord).not.toHaveBeenCalled();
    expect(database.finishMonitoringTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1' }),
      expect.any(Date),
      expect.any(Date),
      expect.any(Number),
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
    database.createMonitoringTask.mockRejectedValueOnce(
      new Error('connection refused'),
    );

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

function taskWithUrls(count: number): ClaimedMonitoringTask {
  const task = persistedTask();
  const [product] = task.productUrls;
  return {
    ...task,
    productUrls: Array.from({ length: count }, (_, i) => ({
      ...product,
      id: String(i),
      url: `${product.url}/${i}`,
    })),
  };
}

describe('PriceMonitoringWorker limits', () => {
  it('uses the configured batch size and a five-task tenant cap', async () => {
    process.env.MONITORING_BATCH_SIZE = '8';
    const { worker, database } = build();

    await worker.runMonitoringTasks();

    expect(database.claimDueMonitoringTasks).toHaveBeenCalledWith(
      8,
      5,
      expect.any(Number),
    );
  });

  it('rotates through the eligible URLs while bounding each run', async () => {
    process.env.MONITORING_MAX_URLS_PER_TASK = '2';
    const { worker, database, websiteDiscovery } = build();
    const task = taskWithUrls(4);
    database.getEligibleMonitoringProductCount.mockResolvedValue(3);
    database.claimDueMonitoringTasks.mockResolvedValueOnce([task]);

    await worker.runMonitoringTasks();

    expect(database.finishMonitoringTask).toHaveBeenLastCalledWith(
      task,
      expect.any(Date),
      expect.any(Date),
      2,
    );
    database.claimDueMonitoringTasks.mockResolvedValueOnce([
      { ...task, urlCursor: 2 },
    ]);
    await worker.runMonitoringTasks();

    expect(
      websiteDiscovery.discoverWebsiteContent.mock.calls.map(([url]) => url),
    ).toEqual([0, 1, 2, 0].map((index) => task.productUrls[index].url));
  });

  it('aborts a timed-out URL, continues the task, and ignores a late price', async () => {
    jest.useFakeTimers();
    const { worker, database, websiteDiscovery } = build();
    const task = taskWithUrls(2);
    database.claimDueMonitoringTasks.mockResolvedValueOnce([task]);

    websiteDiscovery.discoverWebsiteContent.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ products: [{ price: 123 }] }), 46_000);
        }),
    );

    const run = worker.runMonitoringTasks();
    await jest.advanceTimersByTimeAsync(44_999);
    const [, options] = websiteDiscovery.discoverWebsiteContent.mock.calls[0];
    expect(options.signal.aborted).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    await run;
    expect(options.signal.aborted).toBe(true);
    expect(database.createPriceRecord).toHaveBeenCalledWith(
      expect.objectContaining({ productUrl: task.productUrls[1].url }),
    );

    await jest.advanceTimersByTimeAsync(1_000);
    expect(database.createPriceRecord).toHaveBeenCalledTimes(1);
  });

  it('cuts off remaining URLs at the task deadline', async () => {
    jest.useFakeTimers();
    const { worker, database, websiteDiscovery } = build();
    database.claimDueMonitoringTasks.mockResolvedValueOnce([taskWithUrls(4)]);
    websiteDiscovery.discoverWebsiteContent.mockImplementation(
      () => new Promise(() => {}),
    );

    const run = worker.runMonitoringTasks();
    await jest.advanceTimersByTimeAsync(120_000);
    await run;

    expect(websiteDiscovery.discoverWebsiteContent).toHaveBeenCalledTimes(3);
    const [, lastOptions] =
      websiteDiscovery.discoverWebsiteContent.mock.calls[2];
    expect(lastOptions.signal.aborted).toBe(true);
    expect(database.finishMonitoringTask).toHaveBeenCalledTimes(1);
  });
});

describe('PriceMonitoringWorker next run', () => {
  it.each([
    [
      'a run that finishes after midnight',
      '2026-11-04T00:00:00Z',
      '2026-11-05T00:00:00Z',
    ],
    ['three days of downtime', '2026-11-07T00:00:00Z', '2026-11-08T00:00:00Z'],
  ])(
    'keeps the daily schedule after %s',
    async (_description, now, expected) => {
      jest.useFakeTimers({ now: new Date(now) });
      const { worker, database, websiteDiscovery } = build();
      const task = {
        ...persistedTask(),
        frequency: '0 0 * * *',
        nextRun: new Date('2026-11-04T00:00:00Z'),
      };
      database.claimDueMonitoringTasks.mockResolvedValueOnce([task]);
      websiteDiscovery.discoverWebsiteContent.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ products: [] }), 30_000),
          ),
      );

      const run = worker.runMonitoringTasks();
      await jest.advanceTimersByTimeAsync(30_000);
      await run;

      expect(database.finishMonitoringTask).toHaveBeenCalledWith(
        task,
        new Date(new Date(now).getTime() + 30_000),
        new Date(expected),
        0,
      );
    },
  );
});
