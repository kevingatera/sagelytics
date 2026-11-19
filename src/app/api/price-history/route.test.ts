import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  getPriceHistory: vi.fn(),
  getPriceHistoryInRange: vi.fn(),
}));

vi.mock('~/server/auth', () => ({
  auth: vi.fn(async () => state.session),
}));

const ALICE = 'user-alice';
const BOB = 'user-bob';
const TASK_ID = '6f1c2b0e-1111-4c3d-9e8f-000000000001';
const UNKNOWN_TASK_ID = '6f1c2b0e-1111-4c3d-9e8f-0000000000ff';

vi.mock('~/server/db/queries/monitoring', () => ({
  getMonitoringTaskById: vi.fn(async (taskId: string) =>
    taskId === TASK_ID
      ? {
          id: TASK_ID,
          userId: ALICE,
          competitorDomain: 'competitor.example',
          frequency: '0 */6 * * *',
          enabled: true,
          status: 'active',
        }
      : undefined,
  ),
  getPriceHistory: state.getPriceHistory,
  getPriceHistoryInRange: state.getPriceHistoryInRange,
}));

import { GET } from './route';

function getRequest(taskId: string) {
  return new Request(`http://localhost/api/price-history?monitoringTaskId=${taskId}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.session = null;
  state.getPriceHistory.mockResolvedValue([
    {
      id: 'row-1',
      productName: 'Pro',
      productUrl: 'https://competitor.example/pro',
      price: '49.00',
      currency: 'USD',
      recordedAt: new Date('2026-11-10T00:00:00Z'),
      changePercentage: null,
      previousPrice: null,
      extractionMethod: 'direct_crawl',
    },
  ]);
});

describe('GET /api/price-history ownership', () => {
  it('rejects a request without a session', async () => {
    expect((await GET(getRequest(TASK_ID))).status).toBe(401);
  });

  it('returns history for the task owner', async () => {
    state.session = { user: { id: ALICE } };

    const res = await GET(getRequest(TASK_ID));
    const body = (await res.json()) as { priceHistory: unknown[] };

    expect(res.status).toBe(200);
    expect(body.priceHistory).toHaveLength(1);
  });

  it("answers another user's task exactly like an unknown task, without reading history", async () => {
    state.session = { user: { id: BOB } };

    const foreign = await GET(getRequest(TASK_ID));
    const unknown = await GET(getRequest(UNKNOWN_TASK_ID));

    expect(foreign.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await foreign.json()).toEqual(await unknown.json());
    expect(state.getPriceHistory).not.toHaveBeenCalled();
    expect(state.getPriceHistoryInRange).not.toHaveBeenCalled();
  });

  it('rejects a malformed task id with 400 before any lookup', async () => {
    state.session = { user: { id: BOB } };

    expect((await GET(getRequest('not-a-uuid'))).status).toBe(400);
  });
});
